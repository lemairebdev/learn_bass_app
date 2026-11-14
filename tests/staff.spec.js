/**
 * Spécifications de la portée en clé de fa (ticket 11).
 *
 * La portée affiche les hauteurs ÉCRITES (son + une octave, décisions 3 et 14) :
 * une tête de note cliquable par hauteur écrite — 36 au total, chromatiques, de
 * la plus grave (Mi2) à la plus aiguë (Ré♯5) — avec un dièse à gauche de chaque
 * tête altérée, les lignes supplémentaires que dicte le modèle (une sous la
 * portée pour les notes les plus graves, cinq au-dessus pour Ré♯5) et une petite
 * étiquette du nom écrit sous chaque tête (décision 7).
 *
 * Le contrat DOM (décision 11) expose la hauteur écrite de chaque tête et son
 * aria-label français. Les tests n'importent jamais les modules internes : ils
 * n'observent que le rendu et le contrat DOM. Les valeurs attendues sont des
 * données de référence indépendantes.
 */
import { expect, test } from '@playwright/test';

/**
 * Les 36 hauteurs écrites de Mi2 (MIDI 40) à Ré♯5 (MIDI 75), dans l'ordre
 * chromatique ascendant : le nom sonore de la table élevé d'une octave.
 */
const WRITTEN_NAMES = [
  'Mi2', 'Fa2', 'Fa♯2', 'Sol2', 'Sol♯2', 'La2', 'La♯2', 'Si2',
  'Do3', 'Do♯3', 'Ré3', 'Ré♯3', 'Mi3', 'Fa3', 'Fa♯3', 'Sol3', 'Sol♯3', 'La3', 'La♯3', 'Si3',
  'Do4', 'Do♯4', 'Ré4', 'Ré♯4', 'Mi4', 'Fa4', 'Fa♯4', 'Sol4', 'Sol♯4', 'La4', 'La♯4', 'Si4',
  'Do5', 'Do♯5', 'Ré5', 'Ré♯5',
];

/** Élève d'une octave le chiffre final d'un nom (transformation indépendante). */
function raiseOctave(name) {
  return name.replace(/(\d+)$/, (_, digit) => String(Number(digit) + 1));
}

/** Lit les têtes de note rendues, avec leur contrat DOM et leurs lignes. */
async function readNoteheads(page) {
  return page.evaluate(() =>
    [...document.querySelectorAll('#staff .notehead')].map((notehead) => ({
      pitch: notehead.getAttribute('data-pitch'),
      note: notehead.getAttribute('data-note'),
      writtenPitch: notehead.getAttribute('data-written-pitch'),
      writtenName: notehead.getAttribute('data-written-name'),
      label: notehead.querySelector('.notehead-label')?.textContent.trim() ?? null,
      accidental: notehead.querySelector('.accidental')?.textContent.trim() ?? null,
      ledgerAbove: notehead.querySelectorAll('.ledger-above').length,
      ledgerBelow: notehead.querySelectorAll('.ledger-below').length,
      ariaLabel: notehead.getAttribute('aria-label'),
      role: notehead.getAttribute('role'),
      tabindex: notehead.getAttribute('tabindex'),
    })),
  );
}

test("affiche 36 têtes de note chromatiques ascendantes, de Mi2 à Ré♯5 (décision 7)", async ({ page }) => {
  await page.goto('/');

  // La portée est un SVG unique monté dans #staff, avec ses cinq lignes.
  await expect(page.locator('#staff svg.staff-svg')).toHaveCount(1);
  await expect(page.locator('#staff .staff-line')).toHaveCount(5);

  const heads = await readNoteheads(page);
  expect(heads).toHaveLength(36);

  // Chromatique ascendant : l'identité MIDI sonore croît de 28 à 63.
  expect(heads.map((head) => head.pitch)).toEqual(
    Array.from({ length: 36 }, (_, index) => String(28 + index)),
  );

  // Chaque tête porte le nom écrit attendu, dans l'ordre.
  expect(heads.map((head) => head.label)).toEqual(WRITTEN_NAMES);

  // Bornes de la portée : la plus grave sous la portée, la plus aiguë tout en haut.
  expect(heads[0].label).toBe('Mi2');
  expect(heads[35].label).toBe('Ré♯5');
});

test("chaque étiquette écrite est le nom sonore de la table élevé d'une octave (décisions 14–15)", async ({ page }) => {
  await page.goto('/');

  // Le tableau liste les noms SONORES ; la portée, les noms ÉCRITS (une octave
  // au-dessus), appariés dans le même ordre ascendant.
  const soundingNames = (await page.locator('#table .cell-note').allTextContents()).map((name) => name.trim());
  const writtenLabels = (await page.locator('#staff .notehead-label').allTextContents()).map((name) => name.trim());

  expect(soundingNames).toHaveLength(36);
  expect(writtenLabels).toHaveLength(36);
  expect(writtenLabels).toEqual(soundingNames.map(raiseOctave));

  // Cas d'école de la spécification : Mi1 sonore → Mi2 écrit, Ré♯4 → Ré♯5.
  expect(soundingNames[0]).toBe('Mi1');
  expect(writtenLabels[0]).toBe('Mi2');
  expect(writtenLabels[35]).toBe('Ré♯5');
});

test("n'altère que les têtes diésées, et place le ♯ à leur gauche (décision 2)", async ({ page }) => {
  await page.goto('/');

  const heads = await readNoteheads(page);

  // Aucun bémol nulle part : l'app n'écrit que des dièses.
  expect(await page.locator('#staff').innerText()).not.toContain('♭');

  // Le ♯ n'apparaît que sur les hauteurs diésées, et sur toutes (15 au total).
  const withAccidental = heads.filter((head) => head.accidental !== null);
  expect(withAccidental).toHaveLength(15);
  expect(withAccidental.every((head) => head.accidental === '♯')).toBe(true);
  expect(withAccidental.map((head) => head.writtenName)).toEqual(
    WRITTEN_NAMES.filter((name) => name.includes('♯')),
  );
  for (const head of heads) {
    expect(head.label.includes('♯'), `dièse cohérent pour ${head.label}`).toBe(head.accidental !== null);
  }

  // Chaque ♯ est tracé à gauche de sa tête.
  const geometry = await page.evaluate(() =>
    [...document.querySelectorAll('#staff .notehead')]
      .filter((notehead) => notehead.querySelector('.accidental'))
      .map((notehead) => ({
        accidentalX: Number(notehead.querySelector('.accidental').getAttribute('x')),
        headX: Number(notehead.querySelector('.notehead-head').getAttribute('cx')),
      })),
  );
  expect(geometry.length).toBe(15);
  for (const { accidentalX, headX } of geometry) expect(accidentalX).toBeLessThan(headX);
});

test('trace une ligne sous la portée pour les notes graves et cinq au-dessus pour Ré♯5 (décision 7)', async ({ page }) => {
  await page.goto('/');

  const heads = await readNoteheads(page);
  const mi2 = heads.find((head) => head.writtenName === 'Mi2');
  const reSharp5 = heads.find((head) => head.writtenName === 'Ré♯5');

  // Extrêmes du modèle : Mi2 = une ligne sous la portée ; Ré♯5 = cinq au-dessus.
  expect(mi2.ledgerBelow).toBe(1);
  expect(mi2.ledgerAbove).toBe(0);
  expect(reSharp5.ledgerBelow).toBe(0);
  expect(reSharp5.ledgerAbove).toBe(5);

  // Géométrie : les lignes « sous » sont sous la ligne inférieure de la portée,
  // celles « au-dessus » sont au-dessus de la ligne supérieure.
  const geometry = await page.evaluate(() => {
    const staffLines = [...document.querySelectorAll('#staff .staff-line')].map((line) =>
      Number(line.getAttribute('y1')),
    );
    const ledgerYs = (writtenPitch, side) =>
      [...document.querySelectorAll(`#staff .notehead[data-written-pitch="${writtenPitch}"] .ledger-${side}`)].map(
        (line) => Number(line.getAttribute('y1')),
      );
    return {
      staffLines,
      mi2Below: ledgerYs(40, 'below'),
      reSharp5Above: ledgerYs(75, 'above'),
    };
  });

  expect(geometry.staffLines).toHaveLength(5);
  const topLine = Math.min(...geometry.staffLines);
  const bottomLine = Math.max(...geometry.staffLines);

  expect(geometry.mi2Below).toHaveLength(1);
  for (const y of geometry.mi2Below) expect(y).toBeGreaterThan(bottomLine);
  expect(geometry.reSharp5Above).toHaveLength(5);
  for (const y of geometry.reSharp5Above) expect(y).toBeLessThan(topLine);
});

test('chaque tête porte le contrat DOM français de sa hauteur écrite (décision 11)', async ({ page }) => {
  await page.goto('/');

  const heads = await readNoteheads(page);

  for (const head of heads) {
    // L'identité sonore et la hauteur écrite (son + 12) sont exposées.
    expect(head.pitch).toMatch(/^\d+$/);
    expect(Number(head.writtenPitch)).toBe(Number(head.pitch) + 12);
    expect(head.writtenName).toBe(head.label);
    expect(head.note).toBe(head.label.replace(/(\d+)$/, (_, digit) => String(Number(digit) - 1)));

    // L'aria-label français identifie la hauteur écrite de la tête.
    expect(head.ariaLabel, `aria-label de ${head.label}`).toContain(head.label);
    expect(head.ariaLabel).toMatch(/écrit/i);

    // La tête entière est une cible de clic : rôle bouton, focusable.
    expect(head.role).toBe('button');
    expect(head.tabindex).toBe('0');
  }

  // La première et la dernière tête exposent bien les bornes écrites.
  await expect(page.locator('#staff .notehead').first()).toHaveAttribute('data-written-pitch', '40');
  await expect(page.locator('#staff .notehead').last()).toHaveAttribute('data-written-pitch', '75');
});

test('la portée défile horizontalement sur écran étroit (décision 7)', async ({ page }) => {
  test.skip(test.info().project.name !== 'mobile', 'réservé au viewport mobile');

  await page.goto('/');

  const metrics = await page.evaluate(() => {
    const scroller = document.querySelector('#staff .staff-scroll');
    const style = getComputedStyle(scroller);
    return {
      scrollWidth: scroller.scrollWidth,
      clientWidth: scroller.clientWidth,
      overflowX: style.overflowX,
    };
  });

  expect(['auto', 'scroll']).toContain(metrics.overflowX);
  expect(metrics.scrollWidth).toBeGreaterThan(metrics.clientWidth);
});
