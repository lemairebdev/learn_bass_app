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
