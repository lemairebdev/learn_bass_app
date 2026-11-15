// Vue « tableau de correspondances » (décision 8 de la spécification).
// Rend une ligne par note distincte dans son point de montage, en ne lisant que
// le modèle musical (js/model.js). Deux filtres combinés par ET : corde et nom
// de note ; par défaut, aucun filtre.
import { allPitches, pitchClassName, positionLabel, STRINGS, PITCH_CLASS_NAMES } from './model.js';
import { wirePointerSelection } from './pointer-selection.js';

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
  chip.textContent = positionLabel(position.stringIndex, position.fret);
  return chip;
}

function buildRow(pitch) {
  const row = document.createElement('tr');
  const positionLabels = pitch.positions.map((position) =>
    positionLabel(position.stringIndex, position.fret),
  );

  row.dataset.pitch = String(pitch.midi);
  row.dataset.note = pitch.name;
  row.dataset.pitchClass = pitchClassName(pitch.pitchClass);
  // Cible de clic : la ligne entière sélectionne la note (câblage ticket 12).
  row.setAttribute(
    'aria-label',
    `${pitch.name} — ${pitch.frequencyLabel} — ${positionLabels.join(', ')}`,
  );

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

/**
 * Applique les deux niveaux de surbrillance de la sélection (décision 5) :
 * primaire sur la ligne de la note exacte, secondaire sur les lignes des autres
 * octaves de la même classe de hauteur. `null` (ou une note absente) efface.
 * Le niveau est exposé par `data-highlight` et les classes `is-primary` /
 * `is-secondary` — jamais par l'attribut `hidden`, réservé aux filtres.
 * Amène la ligne primaire dans la zone visible.
 */
function applyHighlight(rows, selection) {
  const midi = typeof selection === 'number' ? selection : selection?.midi;
  const selected =
    typeof midi === 'number' ? rows.find((row) => Number(row.dataset.pitch) === midi) : null;
  const pitchClass = selected?.dataset.pitchClass ?? null;

  for (const row of rows) {
    let tier = null;
    if (selected && row === selected) tier = 'primary';
    else if (selected && row.dataset.pitchClass === pitchClass) tier = 'secondary';

    if (tier) {
      row.dataset.highlight = tier;
      row.classList.toggle('is-primary', tier === 'primary');
      row.classList.toggle('is-secondary', tier === 'secondary');
    } else {
      delete row.dataset.highlight;
      row.classList.remove('is-primary', 'is-secondary');
    }
  }

  if (selected) selected.scrollIntoView({ block: 'nearest', inline: 'nearest' });
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

/**
 * Rend le tableau de correspondances dans `mount`.
 *
 * Retourne l'API de surbrillance pilotée par la sélection (ticket 12), alignée
 * sur celles du manche et de la portée :
 * - `highlight(soundingMidi)` : niveau primaire sur la ligne de la note exacte,
 *   niveau secondaire sur les lignes des autres octaves de sa classe de
 *   hauteur ; accepte un numéro MIDI ou l'objet note du modèle ; `null` efface ;
 *   amène la ligne primaire dans la zone visible ;
 * - `clear()` : efface toute surbrillance.
 *
 * `options.onSelect(soundingMidi)` est appelé à chaque clic pointeur sur une
 * ligne — le câblage de la sélection appartient au ticket 12.
 */
export function renderTable(mount, pitches = allPitches(), { onSelect } = {}) {
  mount.textContent = '';

  const filters = buildFilters();
  const table = buildTable(pitches);
  mount.append(filters, table);

  for (const input of filters.querySelectorAll('input[type="radio"]')) {
    input.addEventListener('change', () => applyFilters(mount));
  }
  applyFilters(mount);

  const rows = [...table.querySelectorAll('tbody tr')];
  if (typeof onSelect === 'function') {
    wirePointerSelection(rows, (row) => row.dataset.pitch, onSelect);
  }

  return {
    highlight(selection) {
      applyHighlight(rows, selection);
    },
    clear() {
      applyHighlight(rows, null);
    },
    mount,
    rows,
  };
}
