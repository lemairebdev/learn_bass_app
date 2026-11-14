/**
 * Spécifications du modèle musical et du tableau de correspondances (ticket 09).
 *
 * Le modèle musical (js/model.js) est LA source de vérité de toutes les règles
 * musicales de l'app (décision 3 de la spécification) ; les tests ne
 * l'importent jamais. Ils l'observent exhaustivement à travers le tableau de
 * correspondances rendu et son contrat DOM (décisions 8 et 11) : noms, octaves,
 * fréquences (virgule française) et positions complètes « Corde·case » des 36
 * notes de Mi1 à Ré♯4, plus les deux filtres (corde, nom de note) et leur
 * combinaison par ET.
 *
 * Les valeurs attendues sont des données de référence indépendantes — tirées
 * de la théorie musicale et de la formule de la spécification (La4 = 440 Hz,
 * fréquence = 440 × 2^((m−69)/12)) — jamais recalculées comme le code le fait.
 */
import { expect, test } from '@playwright/test';

/**
 * Les 36 notes de la basse 4 cordes en accordage standard (Mi1–La1–Ré2–Sol2,
 * cases 0 à 20 par corde) : du Mi1 (MIDI 28) au Ré♯4 (MIDI 63). Fréquences du
 * tempérament égal à une décimale, virgule française. Positions ordonnées de
 * la corde la plus grave (Mi) à la plus aiguë (Sol) ; le numéro MIDI est
 * l'identité de la note dans toute l'app.
 */
const EXPECTED_NOTES = [
  { midi: 28, name: 'Mi1', frequency: '41,2 Hz', positions: ['Mi·0'] },
  { midi: 29, name: 'Fa1', frequency: '43,7 Hz', positions: ['Mi·1'] },
  { midi: 30, name: 'Fa♯1', frequency: '46,2 Hz', positions: ['Mi·2'] },
  { midi: 31, name: 'Sol1', frequency: '49,0 Hz', positions: ['Mi·3'] },
  { midi: 32, name: 'Sol♯1', frequency: '51,9 Hz', positions: ['Mi·4'] },
  { midi: 33, name: 'La1', frequency: '55,0 Hz', positions: ['Mi·5', 'La·0'] },
  { midi: 34, name: 'La♯1', frequency: '58,3 Hz', positions: ['Mi·6', 'La·1'] },
  { midi: 35, name: 'Si1', frequency: '61,7 Hz', positions: ['Mi·7', 'La·2'] },
  { midi: 36, name: 'Do2', frequency: '65,4 Hz', positions: ['Mi·8', 'La·3'] },
  { midi: 37, name: 'Do♯2', frequency: '69,3 Hz', positions: ['Mi·9', 'La·4'] },
  { midi: 38, name: 'Ré2', frequency: '73,4 Hz', positions: ['Mi·10', 'La·5', 'Ré·0'] },
  { midi: 39, name: 'Ré♯2', frequency: '77,8 Hz', positions: ['Mi·11', 'La·6', 'Ré·1'] },
  { midi: 40, name: 'Mi2', frequency: '82,4 Hz', positions: ['Mi·12', 'La·7', 'Ré·2'] },
  { midi: 41, name: 'Fa2', frequency: '87,3 Hz', positions: ['Mi·13', 'La·8', 'Ré·3'] },
  { midi: 42, name: 'Fa♯2', frequency: '92,5 Hz', positions: ['Mi·14', 'La·9', 'Ré·4'] },
  { midi: 43, name: 'Sol2', frequency: '98,0 Hz', positions: ['Mi·15', 'La·10', 'Ré·5', 'Sol·0'] },
  { midi: 44, name: 'Sol♯2', frequency: '103,8 Hz', positions: ['Mi·16', 'La·11', 'Ré·6', 'Sol·1'] },
  { midi: 45, name: 'La2', frequency: '110,0 Hz', positions: ['Mi·17', 'La·12', 'Ré·7', 'Sol·2'] },
  { midi: 46, name: 'La♯2', frequency: '116,5 Hz', positions: ['Mi·18', 'La·13', 'Ré·8', 'Sol·3'] },
  { midi: 47, name: 'Si2', frequency: '123,5 Hz', positions: ['Mi·19', 'La·14', 'Ré·9', 'Sol·4'] },
  { midi: 48, name: 'Do3', frequency: '130,8 Hz', positions: ['Mi·20', 'La·15', 'Ré·10', 'Sol·5'] },
  { midi: 49, name: 'Do♯3', frequency: '138,6 Hz', positions: ['La·16', 'Ré·11', 'Sol·6'] },
  { midi: 50, name: 'Ré3', frequency: '146,8 Hz', positions: ['La·17', 'Ré·12', 'Sol·7'] },
  { midi: 51, name: 'Ré♯3', frequency: '155,6 Hz', positions: ['La·18', 'Ré·13', 'Sol·8'] },
  { midi: 52, name: 'Mi3', frequency: '164,8 Hz', positions: ['La·19', 'Ré·14', 'Sol·9'] },
  { midi: 53, name: 'Fa3', frequency: '174,6 Hz', positions: ['La·20', 'Ré·15', 'Sol·10'] },
  { midi: 54, name: 'Fa♯3', frequency: '185,0 Hz', positions: ['Ré·16', 'Sol·11'] },
  { midi: 55, name: 'Sol3', frequency: '196,0 Hz', positions: ['Ré·17', 'Sol·12'] },
  { midi: 56, name: 'Sol♯3', frequency: '207,7 Hz', positions: ['Ré·18', 'Sol·13'] },
  { midi: 57, name: 'La3', frequency: '220,0 Hz', positions: ['Ré·19', 'Sol·14'] },
  { midi: 58, name: 'La♯3', frequency: '233,1 Hz', positions: ['Ré·20', 'Sol·15'] },
  { midi: 59, name: 'Si3', frequency: '246,9 Hz', positions: ['Sol·16'] },
  { midi: 60, name: 'Do4', frequency: '261,6 Hz', positions: ['Sol·17'] },
  { midi: 61, name: 'Do♯4', frequency: '277,2 Hz', positions: ['Sol·18'] },
  { midi: 62, name: 'Ré4', frequency: '293,7 Hz', positions: ['Sol·19'] },
  { midi: 63, name: 'Ré♯4', frequency: '311,1 Hz', positions: ['Sol·20'] },
];

/** Lit les lignes visibles du tableau rendu, avec leurs cellules et attributs. */
async function readTable(page) {
  return page.evaluate(() =>
    [...document.querySelectorAll('#table tbody tr:not([hidden])')].map((tr) => ({
      pitch: tr.getAttribute('data-pitch'),
      note: tr.getAttribute('data-note'),
      name: tr.querySelector('.cell-note')?.textContent.trim() ?? null,
      frequency: tr.querySelector('.cell-frequency')?.textContent.trim() ?? null,
      chips: [...tr.querySelectorAll('.chip:not([hidden])')].map((chip) => chip.textContent.trim()),
      label: tr.getAttribute('aria-label'),
    })),
  );
}

test("affiche les 36 notes de Mi1 à Ré♯4 en ordre ascendant, sans filtre par défaut", async ({ page }) => {
  await page.goto('/');

  // En-têtes de colonnes français (décision 8).
  const headers = await page.locator('#table thead th').allTextContents();
  expect(headers).toEqual(['Note', 'Fréquence', 'Positions']);

  // 36 lignes, une par note distincte, de la plus grave à la plus aiguë.
  const rows = await readTable(page);
  expect(rows).toHaveLength(36);
  expect(rows.map((row) => row.name)).toEqual(EXPECTED_NOTES.map((note) => note.name));

  // Le numéro MIDI — identité de la note dans toute l'app — croît de 28 à 63.
  expect(rows.map((row) => row.pitch)).toEqual(EXPECTED_NOTES.map((note) => String(note.midi)));

  // Par défaut, aucun filtre : « Toutes les cordes » et « Toutes les notes ».
  await expect(page.locator('input[name="string-filter"][value="all"]')).toBeChecked();
  await expect(page.locator('input[name="note-filter"][value="all"]')).toBeChecked();
});
