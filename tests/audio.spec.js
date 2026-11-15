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

test('un second clic sur la même note rejoue une nouvelle tonalité avec le même contexte unique', async ({
  page,
}) => {
  await instrumentAudio(page);
  await page.goto('/');

  // Un premier tap crée l'unique contexte et joue la note…
  const notehead = page.locator('#staff .notehead[data-midi="33"]');
  await notehead.click();
  const first = await audioSnapshot(page);
  expect(first.started.length).toBeGreaterThan(0);

  // …et un second tap sur la MÊME note rejoue une tonalité (décision 4) sans
  // jamais créer de second contexte : un seul AudioContext partagé.
  await notehead.click();
  const second = await audioSnapshot(page);
  expect(second.created).toBe(1);
  expect(second.started.length).toBe(first.started.length * 2);
  for (const frequency of second.started) {
    expect(Math.abs(frequency - 55.0), 'fréquence de La1').toBeLessThan(0.05);
  }
});

test('une nouvelle sélection coupe la tonalité précédente (dernier clic gagnant)', async ({
  page,
}) => {
  await instrumentAudio(page);
  await page.goto('/');

  // Deux taps rapprochés : La1 (corde La à vide, MIDI 33, 55,0 Hz) puis
  // Ré2 (corde Ré à vide, MIDI 38, 73,4 Hz).
  await page.locator('#staff .notehead[data-midi="33"]').click();
  await page.locator('#staff .notehead[data-midi="38"]').click();

  const voices = await page.evaluate(() =>
    window.__audio.oscillators.map((oscillator) => ({
      frequency: oscillator.frequency.value,
      startAt: oscillator.__startAt,
      stoppedAt: oscillator.__stoppedAt,
    })),
  );

  // La voix du Ré2 a bien démarré…
  const reVoice = voices.filter((voice) => Math.abs(voice.frequency - 73.4) < 0.1);
  expect(reVoice.length).toBeGreaterThan(0);
  const reStart = Math.max(...reVoice.map((voice) => voice.startAt));

  // …et la voix du La1 est coupée AVANT sa fin naturelle (décroissance ~1 s) :
  // son arrêt est programmé au moment où la nouvelle note prend la main.
  const laVoice = voices.filter((voice) => Math.abs(voice.frequency - 55.0) < 0.1);
  expect(laVoice.length).toBeGreaterThan(0);
  for (const voice of laVoice) {
    expect(voice.stoppedAt, 'arrêt du La1 programmé').toBeDefined();
    expect(voice.stoppedAt, 'coupé avant la fin naturelle').toBeLessThan(voice.startAt + 1);
    expect(voice.stoppedAt, 'coupé quand la nouvelle note démarre').toBeLessThanOrEqual(
      reStart + 0.06,
    );
  }
});

/**
 * Le gain maître est identifiable à sa valeur : volume/100. Les AudioParam
 * sont portés en simple précision flottante — la comparaison tolère donc le
 * petit écart de conversion (0,8 se lit 0,800000011920929).
 */
async function findGainIndexByValue(page, expected) {
  return page.evaluate(
    (target) =>
      window.__audio.gainNodes.findIndex((gain) => Math.abs(gain.gain.value - target) < 0.001),
    expected,
  );
}

test('le curseur de volume règle le gain de sortie et le choix est restauré après rechargement', async ({
  page,
}) => {
  await instrumentAudio(page);
  await page.goto('/');

  // Contrôles français dans le conteneur de l'en-tête (décisions 2, 9, 10).
  const slider = page.locator('#audio-controls input[type="range"][data-audio-control="volume"]');
  await expect(slider).toHaveAttribute('aria-label', 'Volume');
  await expect(slider).toHaveValue('80');

  // Premier geste : le contexte et son gain maître naissent.
  await page.locator('#fretboard .fret-cell[data-string="Sol"][data-fret="5"]').click();
  const masterIndex = await findGainIndexByValue(page, 0.8);
  expect(masterIndex, 'le gain maître suit le volume par défaut').toBeGreaterThanOrEqual(0);

  // Régler le volume règle le gain de sortie.
  await slider.fill('30');
  expect(await page.evaluate((index) => window.__audio.gainNodes[index].gain.value, masterIndex)).toBeCloseTo(0.3);

  // Le choix est restauré après un rechargement (décision 9, story 25).
  await page.reload();
  await expect(slider).toHaveValue('30');
  await page.locator('#fretboard .fret-cell[data-string="Sol"][data-fret="5"]').click();
  const restoredIndex = await findGainIndexByValue(page, 0.3);
  expect(restoredIndex, 'le gain restauré suit le volume choisi').toBeGreaterThanOrEqual(0);
});

test('la sourdine coupe la sortie et la sélection garde sa surbrillance', async ({ page }) => {
  await instrumentAudio(page);
  await page.goto('/');

  const mute = page.locator('#audio-controls button[data-audio-control="mute"]');
  await expect(mute).toHaveAttribute('aria-label', 'Sourdine');
  await expect(mute).toHaveAttribute('aria-pressed', 'false');

  // Premier geste : le gain maître naît au volume par défaut.
  await page.locator('#fretboard .fret-cell[data-string="Sol"][data-fret="5"]').click();
  const masterIndex = await findGainIndexByValue(page, 0.8);
  expect(masterIndex).toBeGreaterThanOrEqual(0);

  // La sourdine coupe la sortie…
  await mute.click();
  await expect(mute).toHaveAttribute('aria-pressed', 'true');
  expect(await page.evaluate((index) => window.__audio.gainNodes[index].gain.value, masterIndex)).toBe(0);

  // …sans jamais toucher la sélection : la surbrillance primaire reste normale
  // (décision 9 — explorer en silence), sur la case tapée comme ailleurs.
  await page.locator('#fretboard .fret-cell[data-string="Sol"][data-fret="20"]').click();
  await expect(
    page.locator('#fretboard .fret-cell[data-string="Sol"][data-fret="20"]'),
  ).toHaveAttribute('data-highlight', 'primary');

  // La sourdine se lève : la sortie revient au volume choisi.
  await mute.click();
  await expect(mute).toHaveAttribute('aria-pressed', 'false');
  expect(await page.evaluate((index) => window.__audio.gainNodes[index].gain.value, masterIndex)).toBeCloseTo(0.8);
});

test('le volume et la sourdine choisis sont restaurés après rechargement, sans toucher la sélection', async ({
  page,
}) => {
  await instrumentAudio(page);
  await page.goto('/');

  await page.locator('#audio-controls input[data-audio-control="volume"]').fill('40');
  await page.locator('#audio-controls button[data-audio-control="mute"]').click();

  await page.reload();

  // Les deux réglages reviennent exactement comme laissés (story 25).
  await expect(page.locator('#audio-controls input[data-audio-control="volume"]')).toHaveValue('40');
  await expect(page.locator('#audio-controls button[data-audio-control="mute"]')).toHaveAttribute(
    'aria-pressed',
    'true',
  );

  // Après rechargement ET sourdine : sélectionner une note met toujours la
  // surbrillance normale, et la sortie reste muette.
  await page.locator('#fretboard .fret-cell[data-string="Sol"][data-fret="5"]').click();
  await expect(
    page.locator('#fretboard .fret-cell[data-string="Sol"][data-fret="5"]'),
  ).toHaveAttribute('data-highlight', 'primary');
  // Volume restauré = 40 % : aucun gain maître ouvert à cette valeur —
  // la sourdine restaurée tient toujours (les AudioParam sont en simple
  // précision, d'où la tolérance).
  const anyOpenMaster = await page.evaluate(() =>
    window.__audio.gainNodes.some((gain) => Math.abs(gain.gain.value - 0.4) < 0.001),
  );
  expect(anyOpenMaster, 'sourdine restaurée : la sortie reste coupée').toBe(false);
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
