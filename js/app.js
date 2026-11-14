// Point d'entrée de l'application (module ES chargé par index.html).
// Bootstrap : le modèle musical (js/model.js) est la source de vérité ; chaque
// vue en dérive. À ce stade, la vue « tableau de correspondances » est montée.
// Les tickets suivants enregistrent ici la sélection, le manche, la portée,
// l'audio et le service worker.
import { allPitches } from './model.js';
import { renderTable } from './table.js';

const table = document.getElementById('table');
if (table) renderTable(table, allPitches());
