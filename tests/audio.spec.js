/**
 * Spécifications du module audio et des contrôles de l'en-tête (ticket 13,
 * décision 9 de la spécification).
 *
 * L'audio est observé de l'EXTÉRIEUR de la page (décisions de test) : un script
 * d'initialisation enveloppe le constructeur standard AudioContext AVANT le
 * chargement de l'app — création, reprise, oscillateurs programmés et gains.
 * Aucun crochet de test côté app : on n'observe que les API web standard.
 *
 * Conventions du projet : intitulés et valeurs attendues en français,
 * identifiants de code en anglais, jamais d'import des modules internes.
 */
import { expect, test } from '@playwright/test';

/**
 * Installe l'instrumentation standard : chaque AudioContext créé par la page
 * est enregistré (avec ses oscillateurs et gains, objets vivants), ainsi que
 * les instants `start`/`stop` programmés sur chaque oscillateur.
 */
async function instrumentAudio(page) {
  await page.addInitScript(() => {
    window.__audio = {
      created: 0,
      contexts: [],
      resumes: 0,
      oscillators: [],
      gainNodes: [],
    };
    const NativeAudioContext = window.AudioContext;
    window.AudioContext = class extends NativeAudioContext {
      constructor(...args) {
        super(...args);
        const context = this;
        window.__audio.created += 1;
        window.__audio.contexts.push(context);
        const resume = context.resume.bind(context);
        context.resume = (...a) => {
          window.__audio.resumes += 1;
          return resume(...a);
        };
        const createOscillator = context.createOscillator.bind(context);
        context.createOscillator = () => {
          const oscillator = createOscillator();
          window.__audio.oscillators.push(oscillator);
          const start = oscillator.start.bind(oscillator);
          oscillator.start = (t) => {
            oscillator.__startAt = t;
            return start(t);
          };
          const stop = oscillator.stop.bind(oscillator);
          oscillator.stop = (t) => {
            oscillator.__stoppedAt = t;
            return stop(t);
          };
          return oscillator;
        };
        const createGain = context.createGain.bind(context);
        context.createGain = () => {
          const gain = createGain();
          window.__audio.gainNodes.push(gain);
          return gain;
        };
      }
    };
  });
}

/** Lecture de l'instrumentation : compteurs et oscillateurs démarrés. */
async function audioSnapshot(page) {
  return page.evaluate(() => ({
    created: window.__audio.created,
    resumes: window.__audio.resumes,
    started: window.__audio.oscillators
      .filter((oscillator) => oscillator.__startAt !== undefined)
      .map((oscillator) => oscillator.frequency.value),
  }));
}

test("aucun AudioContext n'est créé et aucun son n'est joué avant le premier geste utilisateur", async ({
  page,
}) => {
  await instrumentAudio(page);
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  // La page est chargée, la souris n'a encore rien touché : pas de contexte,
  // pas d'oscillateur (décision 9 : création paresseuse au premier geste).
  expect(await audioSnapshot(page)).toEqual({ created: 0, resumes: 0, started: [] });

  // Premier geste : un tap sur une case du manche (Sol·5 = Do3).
  await page.locator('#fretboard .fret-cell[data-string="Sol"][data-fret="5"]').click();

  // Le contexte existe maintenant et tourne.
  await expect
    .poll(() => page.evaluate(() => window.__audio.contexts[0]?.state))
    .toBe('running');
  const snapshot = await audioSnapshot(page);
  expect(snapshot.created).toBe(1);
  expect(snapshot.started.length).toBeGreaterThan(0);
});

test('chaque sélection joue la fréquence exacte de la note (Mi1 → 41,2 Hz, Sol2 → 98,0 Hz)', async ({
  page,
}) => {
  await instrumentAudio(page);
  await page.goto('/');

  // Mi1 : borne basse de l'instrument, corde Mi à vide (MIDI 28).
  await page.locator('#staff .notehead[data-midi="28"]').click();
  const mi = await audioSnapshot(page);
  expect(mi.started.length).toBeGreaterThan(0);
  for (const frequency of mi.started) {
    expect(Math.abs(frequency - 41.2), 'fréquence de Mi1').toBeLessThan(0.05);
  }

  // Sol2 : corde Sol à vide (MIDI 43).
  await page.locator('#staff .notehead[data-midi="43"]').click();
  const all = await audioSnapshot(page);
  const sol = all.started.slice(mi.started.length);
  expect(sol.length).toBeGreaterThan(0);
  for (const frequency of sol) {
    expect(Math.abs(frequency - 98.0), 'fréquence de Sol2').toBeLessThan(0.05);
  }
});
