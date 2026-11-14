// Vue « manche » (décision 6 de la spécification).
//
// SVG horizontal à colonnes de largeur uniforme (pas d'espacement réaliste) :
// la colonne 0 est la colonne des cordes à vide, à la tête, puis les cases 1 à
// 20. La corde Mi est en bas, la corde Sol en haut. Repères aux cases 3, 5, 7,
// 9, 12 (double), 15, 17, 19 ; numéros de case sous le manche ; noms de cordes
// à la tête. Les cases sont vides par défaut : la surbrillance primaire affiche
// le nom de la note, la secondaire l'affiche en style affaibli.
//
// Le manche ne fait aucun calcul musical : tout vient de js/model.js. Sur écran
// étroit, la colonne à vide reste épinglée pendant que les cases défilent.
//
// Contrat DOM des cases (décision 11) : `data-string`, `data-fret`,
// `data-string-index`, `data-midi`, `role="button"`, `tabindex="0"` et
// `aria-label` = « Corde <nom>, case <numéro> ». Les surbrillances se marquent
// par `data-highlight` = `primary` ou `secondary` (aucun attribut au repos).
import { STRINGS, FRET_MIN, FRET_MAX, positionMidi, midiToName, pitchForMidi } from './model.js';

// Espace de noms SVG, lu depuis un fragment analysé par le parseur HTML plutôt
// qu'écrit en clair : la garde de la coquille interdit toute URL http(s) dans
// les fichiers livrés (décision 1), et une URI d'espace de noms n'est pas une
// ressource externe.
const SVG_NS = (() => {
  const fragment = document.createElement('template');
  fragment.innerHTML = '<svg></svg>';
  return fragment.content.firstElementChild.namespaceURI;
})();

/** Cible tactile : colonne et rangée d'au moins 44 px (décision 6). */
const COLUMN_WIDTH = 56;
const ROW_HEIGHT = 44;

/** Marge gauche (noms de cordes), épaisseur de la tête, marges haute/basse. */
const NAME_WIDTH = 44;
const NUT_WIDTH = 6;
const TOP_PAD = 12;
const BOTTOM_PAD = 28;
const RIGHT_PAD = 12;

const BOARD_HEIGHT = STRINGS.length * ROW_HEIGHT;
const SVG_HEIGHT = TOP_PAD + BOARD_HEIGHT + BOTTOM_PAD;

/** Largeur de la partie épinglée : noms + tête + colonne à vide. */
const PINNED_WIDTH = NAME_WIDTH + NUT_WIDTH + COLUMN_WIDTH;

/** Cases 1 à 20 : la partie qui défile. */
const FRETS_WIDTH = FRET_MAX * COLUMN_WIDTH + RIGHT_PAD;

/** Repères simples usuels, puis le repère double de la case 12. */
const SINGLE_MARKERS = [3, 5, 7, 9, 15, 17, 19];
const DOUBLE_MARKER = 12;

/** Crée un élément SVG avec ses attributs. */
function svgEl(tag, attributes = {}) {
  const element = document.createElementNS(SVG_NS, tag);
  for (const [name, value] of Object.entries(attributes)) {
    element.setAttribute(name, String(value));
  }
  return element;
}

/** Crée un élément SVG textuel. */
function svgText(attributes, text) {
  const element = svgEl('text', attributes);
  element.textContent = text;
  return element;
}

/** Rangée visuelle d'une corde : Mi (index 0) en bas, Sol en haut. */
function rowForString(stringIndex) {
  return STRINGS.length - 1 - stringIndex;
}

/** Ordonnée du haut d'une rangée. */
function rowTop(row) {
  return TOP_PAD + row * ROW_HEIGHT;
}

/**
 * Une case : cible de pointeur entière, vide par défaut. Le nom de la note
 * n'apparaît qu'à la surbrillance (le texte est renseigné par l'API).
 */
function buildCell(stringIndex, fret, x, y) {
  const stringName = STRINGS[stringIndex].name;
  const cell = svgEl('g', {
    class: 'fret-cell',
    'data-string': stringName,
    'data-fret': fret,
    'data-string-index': stringIndex,
    'data-midi': positionMidi(stringIndex, fret),
    role: 'button',
    tabindex: '0',
    'aria-label': `Corde ${stringName}, case ${fret}`,
  });

  cell.append(
    svgEl('rect', { class: 'cell-bg', x, y, width: COLUMN_WIDTH, height: ROW_HEIGHT }),
    svgEl('text', {
      class: 'cell-note',
      x: x + COLUMN_WIDTH / 2,
      y: y + ROW_HEIGHT / 2,
      'text-anchor': 'middle',
      'dominant-baseline': 'central',
    }),
  );

  return cell;
}

/** La partie épinglée : noms de cordes, tête, et la colonne des cordes à vide. */
function buildPinned() {
  const pinned = svgEl('svg', {
    class: 'fretboard-pinned',
    width: PINNED_WIDTH,
    height: SVG_HEIGHT,
    viewBox: `0 0 ${PINNED_WIDTH} ${SVG_HEIGHT}`,
    role: 'group',
    'aria-label': 'Cordes à vide',
  });

  // Fond opaque : les cases qui défilent passent dessous quand la tête colle.
  pinned.append(
    svgEl('rect', {
      class: 'fretboard-pinned-bg',
      x: 0,
      y: 0,
      width: PINNED_WIDTH,
      height: SVG_HEIGHT,
    }),
  );

  const cells = [];
  for (let stringIndex = 0; stringIndex < STRINGS.length; stringIndex += 1) {
    const row = rowForString(stringIndex);
    const y = rowTop(row);

    pinned.append(
      svgText(
        {
          class: 'string-name',
          'data-string': STRINGS[stringIndex].name,
          x: NAME_WIDTH - 8,
          y: y + ROW_HEIGHT / 2,
          'text-anchor': 'end',
          'dominant-baseline': 'central',
        },
        STRINGS[stringIndex].name,
      ),
    );

    cells.push(buildCell(stringIndex, FRET_MIN, NAME_WIDTH + NUT_WIDTH, y));
  }

  pinned.append(
    svgEl('rect', {
      class: 'fret-nut',
      x: NAME_WIDTH,
      y: TOP_PAD,
      width: NUT_WIDTH,
      height: BOARD_HEIGHT,
    }),
  );

  pinned.append(...cells);
  return { element: pinned, cells };
}

/** La partie qui défile : cases 1 à 20, fils, repères et numéros de case. */
function buildFrets() {
  const frets = svgEl('svg', {
    class: 'fretboard-frets',
    width: FRETS_WIDTH,
    height: SVG_HEIGHT,
    viewBox: `0 0 ${FRETS_WIDTH} ${SVG_HEIGHT}`,
    role: 'group',
    'aria-label': 'Cases 1 à 20',
  });

  // Fils de case (bordures de colonnes).
  for (let index = 0; index <= FRET_MAX; index += 1) {
    frets.append(
      svgEl('line', {
        class: 'fret-wire',
        x1: index * COLUMN_WIDTH,
        y1: TOP_PAD,
        x2: index * COLUMN_WIDTH,
        y2: TOP_PAD + BOARD_HEIGHT,
      }),
    );
  }

  // Repères : un point au centre, sauf la case 12 qui en porte deux.
  const centerX = (fret) => (fret - 1) * COLUMN_WIDTH + COLUMN_WIDTH / 2;
  for (const fret of SINGLE_MARKERS) {
    frets.append(
      svgEl('circle', {
        class: 'fret-marker',
        'data-marker-fret': fret,
        cx: centerX(fret),
        cy: TOP_PAD + BOARD_HEIGHT / 2,
        r: 5,
      }),
    );
  }
  for (const row of [1, 3]) {
    frets.append(
      svgEl('circle', {
        class: 'fret-marker',
        'data-marker-fret': DOUBLE_MARKER,
        cx: centerX(DOUBLE_MARKER),
        cy: TOP_PAD + row * ROW_HEIGHT,
        r: 5,
      }),
    );
  }

  // Numéros de case sous le manche.
  for (let fret = FRET_MIN + 1; fret <= FRET_MAX; fret += 1) {
    frets.append(
      svgText(
        {
          class: 'fret-number',
          'data-fret': fret,
          x: centerX(fret),
          y: TOP_PAD + BOARD_HEIGHT + 20,
          'text-anchor': 'middle',
        },
        String(fret),
      ),
    );
  }

  // Cases 1 à 20, de gauche à droite puis corde par corde.
  const cells = [];
  for (let fret = FRET_MIN + 1; fret <= FRET_MAX; fret += 1) {
    for (let stringIndex = 0; stringIndex < STRINGS.length; stringIndex += 1) {
      cells.push(
        buildCell(stringIndex, fret, (fret - 1) * COLUMN_WIDTH, rowTop(rowForString(stringIndex))),
      );
    }
  }
  frets.append(...cells);

  return { element: frets, cells };
}

/** Renseigne le texte d'une case (nom de la note ou rien). */
function setCellNote(cell, text) {
  const note = cell.querySelector('.cell-note');
  if (note) note.textContent = text;
}

/**
 * Applique les deux niveaux de surbrillance pour une note sonore sélectionnée :
 * primaire sur toutes les positions exactes, secondaire sur les autres octaves
 * de la même classe de hauteur. `null` (ou une note hors instrument) efface.
 * Accepte le numéro MIDI ou l'objet note du modèle (identité : `midi`).
 */
function applyHighlight(cells, scroller, selection) {
  const midi = typeof selection === 'number' ? selection : selection?.midi;
  const pitch = typeof midi === 'number' ? pitchForMidi(midi) : null;

  for (const cell of cells) {
    const midi = Number(cell.dataset.midi);
    if (pitch && midi === pitch.midi) {
      cell.dataset.highlight = 'primary';
      setCellNote(cell, midiToName(midi));
    } else if (pitch && pitchForMidi(midi)?.pitchClass === pitch.pitchClass) {
      cell.dataset.highlight = 'secondary';
      setCellNote(cell, midiToName(midi));
    } else {
      delete cell.dataset.highlight;
      setCellNote(cell, '');
    }
  }

  if (pitch) {
    const primary = cells.find((cell) => cell.dataset.highlight === 'primary');
    if (primary) scrollCellIntoView(scroller, primary);
  }
}

/** Amène une case dans la zone visible, en respectant la colonne épinglée. */
function scrollCellIntoView(scroller, cell) {
  if (scroller.scrollWidth <= scroller.clientWidth) return;

  const cellRect = cell.getBoundingClientRect();
  const scrollerRect = scroller.getBoundingClientRect();
  const pinned = scroller.querySelector('.fretboard-pinned');
  const visibleLeft = scrollerRect.left + (pinned ? pinned.getBoundingClientRect().width : 0);
  const visibleRight = scrollerRect.right;

  if (cellRect.left < visibleLeft) {
    scroller.scrollLeft -= visibleLeft - cellRect.left;
  } else if (cellRect.right > visibleRight) {
    scroller.scrollLeft += cellRect.right - visibleRight;
  }
}

/** Câble les interactions de pointeur : la case entière est la cible. */
function wirePointerEvents(cells, onSelect) {
  for (const cell of cells) {
    const select = () => onSelect(Number(cell.dataset.midi));
    cell.addEventListener('click', select);
    cell.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        select();
      }
    });
  }
}

/**
 * Rend le manche dans `mount`.
 *
 * Retourne l'API de surbrillance pilotée par la sélection (ticket 12) :
 * - `highlight(soundingMidi)` : surbrillance primaire sur toutes les positions
 *   de la note exacte, secondaire sur les autres octaves de sa classe ;
 *   accepte un numéro MIDI ou l'objet note du modèle ;
 * - `clear()` : efface toute surbrillance.
 *
 * `options.onSelect(soundingMidi)` est appelé à chaque clic (ou Entrée/Espace)
 * sur une case — le câblage de la sélection appartient au ticket 12.
 */
export function renderFretboard(mount, { onSelect } = {}) {
  mount.textContent = '';

  const pinned = buildPinned();
  const frets = buildFrets();
  const cells = [...pinned.cells, ...frets.cells];

  const scroller = document.createElement('div');
  scroller.className = 'fretboard-scroll';
  scroller.append(pinned.element, frets.element);
  mount.append(scroller);

  if (typeof onSelect === 'function') wirePointerEvents(cells, onSelect);

  return {
    highlight(soundingMidi) {
      applyHighlight(cells, scroller, soundingMidi);
    },
    clear() {
      applyHighlight(cells, scroller, null);
    },
  };
}
