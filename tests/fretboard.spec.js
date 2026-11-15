/**
 * Spécifications de la vue « manche » (ticket 10).
 *
 * Le manche est un SVG horizontal à colonnes de largeur uniforme : colonne 0
 * pour les cordes à vide (à la tête), puis les cases 1 à 20 (décision 6 de la
 * spécification). On n'observe que le comportement externe et le contrat DOM
 * (décision 11) : 84 cases, leur aria-label français « Corde X, case N », les
 * repères de cases (double en case 12), les numéros de case, les noms de cordes
 * (Mi en bas, Sol en haut), des cases vides par défaut, et le comportement
 * responsive (manche entier sur grand écran ; défilement horizontal avec la
 * colonne à vide épinglée sur mobile).
 *
 * Les valeurs attendues sont des données de référence indépendantes — la
 * théorie du manche (4 cordes × 21 cases, repères usuels) — jamais recalculées
 * comme le code le fait.
 */
import { expect, test } from '@playwright/test';

/** Les quatre cordes, de la plus grave (Mi) à la plus aiguë (Sol). */
const STRING_NAMES = ['Mi', 'La', 'Ré', 'Sol'];

/** Les cases disponibles : 0 (corde à vide) à 20. */
const FRETS = Array.from({ length: 21 }, (_, fret) => fret);

/** Repères simples usuels d'un manche de basse 4 cordes. */
const SINGLE_MARKERS = [3, 5, 7, 9, 15, 17, 19];

/** Le repère double, en case 12. */
const DOUBLE_MARKER = 12;

/** Numéros affichés sous le manche, de la case 1 à la case 20. */
const FRET_NUMBERS = Array.from({ length: 20 }, (_, index) => index + 1);

test("affiche les 84 cases du manche — 4 cordes × 21 cases (décision 6)", async ({ page }) => {
  await page.goto('/');

  const cells = page.locator('#fretboard .fret-cell');
  await expect(cells).toHaveCount(84);

  // Chaque couple (corde, case) existe exactement une fois : les 84 positions
  // de l'instrument, cordes à vide comprises.
  const combos = await cells.evaluateAll((els) =>
    els.map((el) => `${el.dataset.string}:${el.dataset.fret}`),
  );
  const expected = STRING_NAMES.flatMap((name) => FRETS.map((fret) => `${name}:${fret}`));
  expect([...combos].sort()).toEqual([...expected].sort());
  expect(new Set(combos).size).toBe(84);
});

test("chaque case porte un aria-label français « Corde X, case N » (décision 11)", async ({ page }) => {
  await page.goto('/');

  const cells = await page.locator('#fretboard .fret-cell').evaluateAll((els) =>
    els.map((el) => ({
      string: el.dataset.string,
      fret: el.dataset.fret,
      role: el.getAttribute('role'),
      tabindex: el.getAttribute('tabindex'),
      label: el.getAttribute('aria-label'),
    })),
  );
  expect(cells).toHaveLength(84);

  // Chaque case garde son identité française sans se présenter comme un bouton clavier.
  for (const cell of cells) {
    expect(cell.role, `rôle de ${cell.string}·${cell.fret}`).toBeNull();
    expect(cell.tabindex, `tabindex de ${cell.string}·${cell.fret}`).toBeNull();
    expect(cell.label, `aria-label de ${cell.string}·${cell.fret}`).toBe(
      `Corde ${cell.string}, case ${cell.fret}`,
    );
  }

  // Bornes de l'instrument : Mi à vide et Sol en case 20.
  await expect(page.locator('#fretboard .fret-cell[data-string="Mi"][data-fret="0"]')).toHaveAttribute(
    'aria-label',
    'Corde Mi, case 0',
  );
  await expect(page.locator('#fretboard .fret-cell[data-string="Sol"][data-fret="20"]')).toHaveAttribute(
    'aria-label',
    'Corde Sol, case 20',
  );
});

test("affiche les repères de cases, dont le double repère en case 12 (décision 6)", async ({ page }) => {
  await page.goto('/');

  const markers = await page.locator('#fretboard .fret-marker').evaluateAll((els) =>
    els.map((el) => Number(el.dataset.markerFret)),
  );

  const counts = markers.reduce((acc, fret) => {
    acc[fret] = (acc[fret] ?? 0) + 1;
    return acc;
  }, {});

  for (const fret of SINGLE_MARKERS) {
    expect(counts[fret], `repère simple en case ${fret}`).toBe(1);
  }
  expect(counts[DOUBLE_MARKER], 'double repère en case 12').toBe(2);
  expect(new Set(markers)).toEqual(new Set([...SINGLE_MARKERS, DOUBLE_MARKER]));
});

test("affiche les numéros de case sous le manche et les noms de cordes à la tête (décision 6)", async ({ page }) => {
  await page.goto('/');

  // Numéros de case : 1 à 20, dans l'ordre, sous les colonnes correspondantes.
  const numbers = page.locator('#fretboard .fret-number');
  await expect(numbers).toHaveCount(20);
  expect((await numbers.allTextContents()).map((text) => text.trim())).toEqual(
    FRET_NUMBERS.map(String),
  );
  const numberFrets = await numbers.evaluateAll((els) =>
    els.map((el) => Number(el.dataset.fret)),
  );
  expect(numberFrets).toEqual(FRET_NUMBERS);

  // Les quatre noms de cordes sont présents à la tête (leur disposition
  // verticale — Sol en haut, Mi en bas — est vérifiée par le test suivant).
  const names = page.locator('#fretboard .string-name');
  await expect(names).toHaveCount(4);
  const rendered = (await names.allTextContents()).map((text) => text.trim());
  expect(new Set(rendered)).toEqual(new Set(STRING_NAMES));
  for (const name of rendered) {
    await expect(page.locator(`#fretboard .string-name[data-string="${name}"]`)).toHaveText(name);
  }
});

test("la corde Mi est en bas et la corde Sol en haut (décision 6)", async ({ page }) => {
  await page.goto('/');

  const tops = await page.locator('#fretboard .string-name').evaluateAll((els) =>
    Object.fromEntries(els.map((el) => [el.dataset.string, el.getBBox().y])),
  );

  // Le manche se lit grave en bas : Mi sous La sous Ré sous Sol.
  expect(tops.Mi).toBeGreaterThan(tops.La);
  expect(tops.La).toBeGreaterThan(tops.Ré);
  expect(tops.Ré).toBeGreaterThan(tops.Sol);
});

test("les cases sont vides par défaut, sans surbrillance (décision 6)", async ({ page }) => {
  await page.goto('/');

  const states = await page.locator('#fretboard .fret-cell').evaluateAll((els) =>
    els.map((el) => ({
      highlight: el.getAttribute('data-highlight'),
      note: el.querySelector('.cell-note')?.textContent ?? null,
    })),
  );

  expect(states).toHaveLength(84);
  expect(states.every((state) => state.highlight === null)).toBe(true);
  expect(states.every((state) => state.note === null || state.note === '')).toBe(true);
});

test("le manche tient sur grand écran ; sur mobile il défile avec la tête épinglée (décisions 6 et 27)", async ({ page }) => {
  await page.goto('/');

  const scroller = page.locator('#fretboard .fretboard-scroll');
  await expect(scroller).toBeVisible();

  const metrics = await scroller.evaluate((el) => ({
    clientWidth: el.clientWidth,
    scrollWidth: el.scrollWidth,
  }));
  const box = await scroller.boundingBox();
  expect(box).not.toBeNull();

  if (test.info().project.name === 'desktop') {
    // Grand écran : tout le manche est visible sans défilement horizontal.
    expect(metrics.scrollWidth, 'aucun défilement horizontal nécessaire').toBeLessThanOrEqual(
      metrics.clientWidth + 1,
    );
    const lastCell = await page
      .locator('#fretboard .fret-cell[data-string="Sol"][data-fret="20"]')
      .boundingBox();
    expect(lastCell.x + lastCell.width, 'la dernière case est dans le cadre').toBeLessThanOrEqual(
      box.x + box.width + 1,
    );
  } else {
    // Écran étroit : le manche déborde et défile horizontalement.
    expect(metrics.scrollWidth, 'le manche déborde et défile').toBeGreaterThan(
      metrics.clientWidth + 1,
    );

    // Après défilement complet, la colonne à vide (tête) reste épinglée au bord
    // gauche pendant que les dernières cases sont visibles.
    await scroller.evaluate((el) => {
      el.scrollLeft = el.scrollWidth;
    });
    const pinned = await page.locator('#fretboard .fretboard-pinned').boundingBox();
    expect(Math.abs(pinned.x - box.x), 'colonne à vide épinglée au bord gauche').toBeLessThan(2);

    const openCell = await page
      .locator('#fretboard .fret-cell[data-string="Mi"][data-fret="0"]')
      .boundingBox();
    expect(openCell.x, 'corde Mi à vide toujours visible').toBeGreaterThanOrEqual(box.x - 1);
    expect(openCell.x + openCell.width).toBeLessThanOrEqual(box.x + box.width + 1);

    const lastCell = await page
      .locator('#fretboard .fret-cell[data-string="Sol"][data-fret="20"]')
      .boundingBox();
    expect(lastCell.x + lastCell.width, 'la dernière case est visible après défilement').toBeLessThanOrEqual(
      box.x + box.width + 1,
    );
  }
});

test("les cases sont des cibles tactiles d'au moins 44 px sur mobile (décisions 6 et 26)", async ({ page }) => {
  test.skip(test.info().project.name !== 'mobile', 'mesure des cibles sur le viewport mobile');

  await page.goto('/');

  const sizes = await page.locator('#fretboard .fret-cell').evaluateAll((els) =>
    els.map((el) => {
      const rect = el.getBoundingClientRect();
      return { width: rect.width, height: rect.height };
    }),
  );

  expect(sizes).toHaveLength(84);
  expect(sizes.every((size) => size.width >= 44 && size.height >= 44)).toBe(true);
});
