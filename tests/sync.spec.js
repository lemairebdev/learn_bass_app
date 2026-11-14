/**
 * Spécifications de la sélection et de la synchronisation des trois vues
 * (ticket 12, décisions 4 et 5 de la spécification).
 *
 * Une seule pièce d'état : la note sonore sélectionnée (ou aucune). Chaque
 * interaction — case du manche, tête de la portée, ligne du tableau — résout
 * une note par le modèle et la sélection se propage aux trois vues :
 * - niveau PRIMAIRE : toutes les positions exactes de la note (toutes les cases
 *   du manche, la tête écrite = son + 12, la ligne du tableau) ;
 * - niveau SECONDAIRE : les autres octaves de la même classe de hauteur, dans
 *   les trois vues, avec un traitement nettement plus discret.
 *
 * Les tests n'importent jamais les modules internes : ils n'observent que le
 * rendu et le contrat DOM (`data-highlight`, décision 11). Les valeurs attendues
 * sont des données de référence indépendantes — la théorie du manche et la
 * table des correspondances — jamais recalculées comme le code le fait.
 */
import { expect, test } from '@playwright/test';

/**
 * Notes de référence couvrant les cas d'école de la spécification :
 * - `do3` : quatre positions (Mi·20, La·15, Ré·10, Sol·5), décision 3 ;
 * - `mi1` : borne basse, corde à vide Mi·0 ;
 * - `reSharp4` : borne haute, dièse, Sol·20 ;
 * - `la1` : corde à vide La·0 ;
 * - `doSharp3` : note diésée à trois positions.
 *
 * `positions` : les cases primaires (toutes les positions exactes).
 * `secondaryPositions` : les cases des autres octaves de la même classe.
 * `secondaryMidis` : les numéros MIDI de ces autres octaves (portée, tableau).
 */
const NOTES = {
  do3: {
    midi: 48,
    name: 'Do3',
    positions: ['Mi·20', 'La·15', 'Ré·10', 'Sol·5'],
    secondaryPositions: ['Mi·8', 'La·3', 'Sol·17'],
    secondaryMidis: [36, 60],
  },
  mi1: {
    midi: 28,
    name: 'Mi1',
    positions: ['Mi·0'],
    secondaryPositions: ['Mi·12', 'La·7', 'Ré·2', 'La·19', 'Ré·14', 'Sol·9'],
    secondaryMidis: [40, 52],
  },
  reSharp4: {
    midi: 63,
    name: 'Ré♯4',
    positions: ['Sol·20'],
    secondaryPositions: ['Mi·11', 'La·6', 'Ré·1', 'La·18', 'Ré·13', 'Sol·8'],
    secondaryMidis: [39, 51],
  },
  la1: {
    midi: 33,
    name: 'La1',
    positions: ['Mi·5', 'La·0'],
    secondaryPositions: ['Mi·17', 'La·12', 'Ré·7', 'Sol·2', 'Ré·19', 'Sol·14'],
    secondaryMidis: [45, 57],
  },
  doSharp3: {
    midi: 49,
    name: 'Do♯3',
    positions: ['La·16', 'Ré·11', 'Sol·6'],
    secondaryPositions: ['Mi·9', 'La·4', 'Sol·18'],
    secondaryMidis: [37, 61],
  },
};

/** Lit, dans les trois vues, le niveau de surbrillance de chaque élément. */
async function readSync(page) {
  return page.evaluate(() => {
    const tier = (element) => element.getAttribute('data-highlight');
    return {
      fretboard: [...document.querySelectorAll('#fretboard .fret-cell')].map((cell) => ({
        key: `${cell.dataset.string}·${cell.dataset.fret}`,
        midi: Number(cell.dataset.midi),
        tier: tier(cell),
      })),
      staff: [...document.querySelectorAll('#staff .notehead')].map((head) => ({
        midi: Number(head.getAttribute('data-midi')),
        tier: tier(head),
      })),
      table: [...document.querySelectorAll('#table tbody tr')].map((row) => ({
        midi: Number(row.dataset.pitch),
        tier: tier(row),
      })),
    };
  });
}

/** Les clés « Corde·case » des éléments d'un niveau donné, triées. */
function keysOf(items, tier) {
  return items
    .filter((item) => item.tier === tier)
    .map((item) => item.key)
    .sort();
}

/** Les numéros MIDI des éléments d'un niveau donné, triés. */
function midisOf(items, tier) {
  return items
    .filter((item) => item.tier === tier)
    .map((item) => item.midi)
    .sort((a, b) => a - b);
}

/** Vérifie la propagation complète (deux niveaux) de la note sélectionnée. */
async function expectSynchronized(page, note) {
  const state = await readSync(page);

  // Manche : niveau primaire = toutes les positions exactes ; secondaire = les
  // autres octaves de la même classe de hauteur.
  expect(keysOf(state.fretboard, 'primary'), `positions primaires de ${note.name} au manche`).toEqual(
    [...note.positions].sort(),
  );
  expect(
    keysOf(state.fretboard, 'secondary'),
    `positions secondaires de ${note.name} au manche`,
  ).toEqual([...note.secondaryPositions].sort());

  // Portée : la tête de la hauteur écrite exacte en primaire ; les autres
  // octaves de la même classe en secondaire.
  expect(midisOf(state.staff, 'primary'), `tête primaire de ${note.name} sur la portée`).toEqual([
    note.midi,
  ]);
  expect(midisOf(state.staff, 'secondary'), `têtes secondaires de ${note.name}`).toEqual(
    note.secondaryMidis,
  );

  // Tableau : la ligne exacte en primaire ; les autres octaves en secondaire.
  expect(midisOf(state.table, 'primary'), `ligne primaire de ${note.name} au tableau`).toEqual([
    note.midi,
  ]);
  expect(midisOf(state.table, 'secondary'), `lignes secondaires de ${note.name}`).toEqual(
    note.secondaryMidis,
  );
}

test('un clic sur une case du manche propage la note aux trois vues (Do3, quatre positions)', async ({
  page,
}) => {
  await page.goto('/');

  // Au repos : aucune surbrillance nulle part.
  await expect(page.locator('[data-highlight]')).toHaveCount(0);

  // La case Sol·5 produit Do3 (décision 3 : Mi·20, La·15, Ré·10, Sol·5).
  await page.locator('#fretboard .fret-cell[data-string="Sol"][data-fret="5"]').click();

  await expectSynchronized(page, NOTES.do3);
});

test('un clic sur une tête de la portée propage la note au manche et au tableau (Mi1, corde à vide)', async ({
  page,
}) => {
  await page.goto('/');

  // La tête Mi2 écrite correspond au Mi1 sonore (MIDI 28), borne basse de
  // l'instrument et corde Mi à vide.
  await page.locator('#staff .notehead[data-midi="28"]').click();

  await expectSynchronized(page, NOTES.mi1);
});

test('un clic sur une ligne du tableau propage la note au manche et à la portée (Ré♯4, dièse)', async ({
  page,
}) => {
  await page.goto('/');

  // La dernière ligne est Ré♯4 (MIDI 63) : borne haute et note diésée, une
  // seule position (Sol·20).
  await page.locator('#table tbody tr[data-pitch="63"]').click();

  await expectSynchronized(page, NOTES.reSharp4);
});

test('un clic sur la corde La à vide propage La1 (position à vide)', async ({ page }) => {
  await page.goto('/');

  // La case La·0 (corde à vide) produit La1 (MIDI 33) : la position à vide fait
  // partie de la même carte que les cases frettées.
  await page.locator('#fretboard .fret-cell[data-string="La"][data-fret="0"]').click();

  await expectSynchronized(page, NOTES.la1);
});

test('une note diésée (Do♯3) propage les deux niveaux dans les trois vues', async ({ page }) => {
  await page.goto('/');

  // Do♯3 (MIDI 49) : trois positions et deux autres octaves de la classe Do♯.
  await page.locator('#staff .notehead[data-midi="49"]').click();

  await expectSynchronized(page, NOTES.doSharp3);
});

/** Empreinte visuelle : le niveau et le texte affiché de chaque élément. */
async function highlightSnapshot(page) {
  return page.evaluate(() =>
    JSON.stringify({
      fretboard: [...document.querySelectorAll('#fretboard .fret-cell')].map((cell) => [
        cell.dataset.highlight ?? null,
        cell.querySelector('.cell-note')?.textContent ?? '',
      ]),
      staff: [...document.querySelectorAll('#staff .notehead')].map((head) =>
        head.getAttribute('data-highlight'),
      ),
      table: [...document.querySelectorAll('#table tbody tr')].map((row) =>
        row.getAttribute('data-highlight'),
      ),
    }),
  );
}

test('un second clic sur la même note ne change rien visuellement (décision 4)', async ({ page }) => {
  await page.goto('/');

  const cell = page.locator('#fretboard .fret-cell[data-string="Sol"][data-fret="5"]');
  await cell.click();
  const before = await highlightSnapshot(page);

  // Re-sélectionner la même note rejoue le son (hook audio, ticket 13) mais ne
  // change rien d'autre : les surbrillances restent identiques.
  await cell.click();
  expect(await highlightSnapshot(page)).toBe(before);
  await expectSynchronized(page, NOTES.do3);
});

test('la sélection ne survit pas à un rechargement (décision 4)', async ({ page }) => {
  await page.goto('/');

  await page.locator('#fretboard .fret-cell[data-string="Sol"][data-fret="5"]').click();
  expect(await page.locator('[data-highlight]').count()).toBeGreaterThan(0);

  await page.reload();

  // Aucune surbrillance après rechargement : la sélection n'est jamais persistée.
  await expect(page.locator('[data-highlight]')).toHaveCount(0);
  const state = await readSync(page);
  for (const view of ['fretboard', 'staff', 'table']) {
    expect(keysOf(state[view], 'primary'), `aucun primaire dans ${view}`).toEqual([]);
    expect(midisOf(state[view], 'secondary'), `aucun secondaire dans ${view}`).toEqual([]);
  }
});

test("sur mobile, la sélection amène les cases et les têtes dans la zone visible (décisions 6, 7 et 28)", async ({
  page,
}) => {
  test.skip(test.info().project.name !== 'mobile', 'défilement horizontal des vues sur écran étroit');

  await page.goto('/');

  // Sélection via le tableau : ni le manche ni la portée n'ont défilé au préalable.
  await page.locator('#table tbody tr[data-pitch="63"]').click();

  const fretboard = await page.evaluate(() => {
    const scroller = document.querySelector('#fretboard .fretboard-scroll');
    const cell = document.querySelector('#fretboard .fret-cell[data-midi="63"]');
    const pinned = document.querySelector('#fretboard .fretboard-pinned');
    const scrollerRect = scroller.getBoundingClientRect();
    const cellRect = cell.getBoundingClientRect();
    return {
      scrollLeft: scroller.scrollLeft,
      cellLeft: cellRect.left,
      cellRight: cellRect.right,
      visibleLeft: scrollerRect.left + pinned.getBoundingClientRect().width,
      visibleRight: scrollerRect.right,
    };
  });
  expect(fretboard.scrollLeft, 'le manche a défilé vers Sol·20').toBeGreaterThan(0);
  expect(fretboard.cellLeft).toBeGreaterThanOrEqual(fretboard.visibleLeft - 1);
  expect(fretboard.cellRight).toBeLessThanOrEqual(fretboard.visibleRight + 1);

  const staff = await page.evaluate(() => {
    const scroller = document.querySelector('#staff .staff-scroll');
    const head = document.querySelector('#staff .notehead[data-midi="63"]');
    const scrollerRect = scroller.getBoundingClientRect();
    const headRect = head.getBoundingClientRect();
    return {
      scrollLeft: scroller.scrollLeft,
      headLeft: headRect.left,
      headRight: headRect.right,
      visibleLeft: scrollerRect.left,
      visibleRight: scrollerRect.right,
    };
  });
  expect(staff.scrollLeft, 'la portée a défilé vers Ré♯5').toBeGreaterThan(0);
  expect(staff.headLeft).toBeGreaterThanOrEqual(staff.visibleLeft - 1);
  expect(staff.headRight).toBeLessThanOrEqual(staff.visibleRight + 1);
});

test('sur mobile, la sélection révèle la ligne du tableau (décision 4)', async ({ page }) => {
  test.skip(test.info().project.name !== 'mobile', 'défilement vertical de la page sur écran étroit');

  await page.goto('/');

  // La ligne de Ré♯4 est la dernière du tableau, loin sous la ligne de flottaison.
  await page.locator('#fretboard .fret-cell[data-string="Sol"][data-fret="20"]').click();

  const row = await page.locator('#table tbody tr[data-pitch="63"]').boundingBox();
  const viewport = page.viewportSize();
  expect(row, 'la ligne sélectionnée existe').not.toBeNull();
  expect(row.y, 'la ligne sélectionnée est ramenée dans la fenêtre').toBeGreaterThanOrEqual(-1);
  expect(row.y + row.height).toBeLessThanOrEqual(viewport.height + 1);
});
