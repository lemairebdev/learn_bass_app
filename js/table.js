// Vue « tableau de correspondances » (décision 8 de la spécification).
// Rend une ligne par note distincte dans son point de montage, en ne lisant que
// le modèle musical (js/model.js). Deux filtres combinés par ET : corde et nom
// de note ; par défaut, aucun filtre.
import { allPitches, pitchClassName, STRINGS, PITCH_CLASS_NAMES } from './model.js';

const ALL = 'all';

/** Un groupe de boutons radio précédé de son intitulé français. */
function buildFilterGroup(legend, name, options) {
  const fieldset = document.createElement('fieldset');
  fieldset.className = 'filter-group';

  const caption = document.createElement('legend');
  caption.textContent = legend;
  fieldset.append(caption);

  for (const { value, label, checked } of options) {
    const option = document.createElement('label');
    option.className = 'filter-option';

    const input = document.createElement('input');
    input.type = 'radio';
    input.name = name;
    input.value = value;
    input.checked = checked === true;

    const text = document.createElement('span');
    text.textContent = label;

    option.append(input, text);
    fieldset.append(option);
  }

  return fieldset;
}

/** Les deux filtres : corde (Mi/La/Ré/Sol) et nom de note (12 classes). */
function buildFilters() {
  const filters = document.createElement('div');
  filters.className = 'table-filters';

  const stringOptions = [
    { value: ALL, label: 'Toutes les cordes', checked: true },
    ...STRINGS.map((string) => ({ value: string.name, label: string.name })),
  ];
  const noteOptions = [
    { value: ALL, label: 'Toutes les notes', checked: true },
    ...PITCH_CLASS_NAMES.map((name) => ({ value: name, label: name })),
  ];

  filters.append(
    buildFilterGroup('Corde', 'string-filter', stringOptions),
    buildFilterGroup('Note', 'note-filter', noteOptions),
  );

  return filters;
}

function buildChip(position) {
  const chip = document.createElement('span');
  chip.className = 'chip';
  chip.dataset.string = position.string;
  chip.dataset.fret = String(position.fret);
  chip.textContent = `${position.string}·${position.fret}`;
  return chip;
}

function buildRow(pitch) {
  const row = document.createElement('tr');
  row.dataset.pitch = String(pitch.midi);
  row.dataset.note = pitch.name;
  row.dataset.pitchClass = pitchClassName(pitch.pitchClass);
  row.setAttribute('aria-label', pitch.name);

  const note = document.createElement('td');
  note.className = 'cell-note';
  note.textContent = pitch.name;

  const frequency = document.createElement('td');
  frequency.className = 'cell-frequency';
  frequency.textContent = pitch.frequencyLabel;

  const positions = document.createElement('td');
  positions.className = 'cell-positions';
  positions.append(...pitch.positions.map(buildChip));

  row.append(note, frequency, positions);
  return row;
}

function buildTable(pitches) {
  const table = document.createElement('table');

  const head = document.createElement('thead');
  const headRow = document.createElement('tr');
  for (const label of ['Note', 'Fréquence', 'Positions']) {
    const cell = document.createElement('th');
    cell.scope = 'col';
    cell.textContent = label;
    headRow.append(cell);
  }
  head.append(headRow);

  const body = document.createElement('tbody');
  body.append(...pitches.map(buildRow));

  table.append(head, body);
  return table;
}

/** Applique les deux filtres (ET) : masque les lignes et positions exclues. */
function applyFilters(root) {
  const stringValue = root.querySelector('input[name="string-filter"]:checked').value;
  const noteValue = root.querySelector('input[name="note-filter"]:checked').value;

  for (const row of root.querySelectorAll('tbody tr')) {
    let onSelectedString = stringValue === ALL;
    for (const chip of row.querySelectorAll('.chip')) {
      const visible = stringValue === ALL || chip.dataset.string === stringValue;
      chip.hidden = !visible;
      if (visible) onSelectedString = true;
    }

    const matchesNote = noteValue === ALL || row.dataset.pitchClass === noteValue;
    row.hidden = !(matchesNote && onSelectedString);
  }
}

/** Rend le tableau de correspondances dans `mount`. */
export function renderTable(mount, pitches = allPitches()) {
  mount.textContent = '';

  const filters = buildFilters();
  const table = buildTable(pitches);
  mount.append(filters, table);

  for (const input of filters.querySelectorAll('input[type="radio"]')) {
    input.addEventListener('change', () => applyFilters(mount));
  }
  applyFilters(mount);
}
