// Point d'entrée de l'application (module ES chargé par index.html).
// Bootstrap : le modèle musical (js/model.js) est la source de vérité ; chaque
// vue en dérive. À ce stade, les vues « tableau de correspondances » et
// « portée en clé de fa » sont montées. Les tickets suivants enregistrent ici la
// sélection, le manche, l'audio et le service worker.
import { allPitches } from './model.js';
import { renderTable } from './table.js';
import { renderStaff } from './staff.js';

const table = document.getElementById('table');
if (table) renderTable(table, allPitches());

const staff = document.getElementById('staff');
if (staff) renderStaff(staff, allPitches());
