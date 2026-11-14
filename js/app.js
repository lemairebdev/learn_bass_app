// Point d'entrée de l'application (module ES chargé par index.html).
// Bootstrap : le modèle musical (js/model.js) est la source de vérité ; chaque
// vue en dérive. À ce stade, les vues « manche », « portée en clé de fa » et
// « tableau de correspondances » sont montées. Les tickets suivants enregistrent
// ici la sélection, l'audio et le service worker.
import { allPitches } from './model.js';
import { renderTable } from './table.js';
import { renderFretboard } from './fretboard.js';
import { renderStaff } from './staff.js';

const table = document.getElementById('table');
if (table) renderTable(table, allPitches());

const fretboard = document.getElementById('fretboard');
if (fretboard) renderFretboard(fretboard);

const staff = document.getElementById('staff');
if (staff) renderStaff(staff);
