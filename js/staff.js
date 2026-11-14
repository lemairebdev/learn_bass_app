// Vue « portée en clé de fa » (décision 7 de la spécification).
//
// Rend une tête de note cliquable par hauteur ÉCRITE — 36 au total,
// chromatiques, de Mi2 (son Mi1) à Ré♯5 (son Ré♯4) — dans son point de
// montage, en ne lisant que le modèle musical (js/model.js) : toute la théorie
// (hauteur écrite, degré, lignes supplémentaires, altératif) vient du modèle,
// la vue ne fait que la géométrie de rendu. Chaque tête porte un dièse à sa
// gauche quand la hauteur s'écrit altérée, les lignes supplémentaires que dicte
// le modèle et une petite étiquette de son nom écrit.
//
// L'API de surbrillance (deux niveaux, décision 5) est pilotée par le ticket
// 12 : `setSelection(midiSonore)` marque la tête de la hauteur écrite
// correspondante (niveau primaire) et les autres octaves de la même classe de
// hauteur (niveau secondaire). Chaque tête est un bouton (décision 11).
import { allPitches, pitchClassName } from './model.js';

// Espace de noms SVG assemblé par morceaux : aucun fichier livré ne doit
// contenir d'URL absolue, même pour un espace de noms (tests/app-shell.spec.js).
const SVG_NS = 'http' + '://www.w3.org/2000/svg';

// Géométrie du ruban (unités du viewBox, 1 unité = 1 px au rendu).
const COLUMN_WIDTH = 46; // largeur d'une colonne = cible tactile (≥ 44 px)
const STEP_HEIGHT = 11; // écart entre deux degrés conjoints (demi-interligne)
const TOP_STEP = 19; // degré réservé au sommet (au-dessus de Ré♯5, degré 18)
const BOTTOM_STEP = -4; // degré réservé au bas (sous Mi2, degré −2)
const STAFF_LINE_STEPS = [0, 2, 4, 6, 8]; // ligne inférieure (Sol2) → supérieure
const BOTTOM_LINE_STEP = STAFF_LINE_STEPS[0];
const TOP_LINE_STEP = STAFF_LINE_STEPS[STAFF_LINE_STEPS.length - 1];
const PAD_X = 24; // marge horizontale à chaque extrémité
const TOP_MARGIN = 24; // marge au-dessus du degré réservé le plus haut
const HEAD_RADIUS_X = 8;
const HEAD_RADIUS_Y = 5.6;
const LEDGER_HALF_WIDTH = 12; // la ligne supplémentaire dépasse un peu la tête
const LABEL_GAP = 20; // étiquette sous le degré réservé le plus bas
const LABEL_FONT_SIZE = 12;
const ACCIDENTAL_FONT_SIZE = 16;
const ACCIDENTAL_GAP = 15; // le ♯ se place à gauche du centre de la tête

/** Ordonnée (en px) d'un degré diatonique de la portée, 0 = ligne du bas. */
function stepY(step) {
  return TOP_MARGIN + (TOP_STEP - step) * STEP_HEIGHT;
}

const LABEL_Y = stepY(BOTTOM_STEP) + LABEL_GAP;
const SVG_HEIGHT = Math.ceil(LABEL_Y + 9);

/** Crée un élément SVG avec ses attributs, sans aucune dépendance externe. */
function svgElement(name, attributes = {}, text = null) {
  const element = document.createElementNS(SVG_NS, name);
  for (const [attribute, value] of Object.entries(attributes)) {
    element.setAttribute(attribute, String(value));
  }
  if (text !== null) element.textContent = text;
  return element;
}

/** Les cinq lignes de la portée, sur toute la largeur du ruban. */
function buildStaffLines(totalWidth) {
  const group = svgElement('g', { class: 'staff-lines' });
  for (const step of STAFF_LINE_STEPS) {
    const y = stepY(step);
    group.append(
      svgElement('line', {
        class: 'staff-line',
        x1: PAD_X,
        x2: totalWidth - PAD_X,
        y1: y,
        y2: y,
      }),
    );
  }
  return group;
}

/** Les lignes supplémentaires d'une tête : `below` sous la portée, `above` dessus. */
function buildLedgers(written, centerX) {
  const { below, above } = written.ledgerLines;
  const ledgers = [];
  for (let index = 1; index <= below; index += 1) {
    const y = stepY(BOTTOM_LINE_STEP - 2 * index);
    ledgers.push(
      svgElement('line', {
        class: 'ledger ledger-below',
        x1: centerX - LEDGER_HALF_WIDTH,
        x2: centerX + LEDGER_HALF_WIDTH,
        y1: y,
        y2: y,
      }),
    );
  }
  for (let index = 1; index <= above; index += 1) {
    const y = stepY(TOP_LINE_STEP + 2 * index);
    ledgers.push(
      svgElement('line', {
        class: 'ledger ledger-above',
        x1: centerX - LEDGER_HALF_WIDTH,
        x2: centerX + LEDGER_HALF_WIDTH,
        y1: y,
        y2: y,
      }),
    );
  }
  return ledgers;
}

/**
 * Une tête de note : une cible tactile pleine colonne (transparente), les lignes
 * supplémentaires, la tête, le ♯ éventuel et l'étiquette du nom écrit.
 */
function buildNotehead(pitch, index, totalHeight) {
  const centerX = PAD_X + index * COLUMN_WIDTH + COLUMN_WIDTH / 2;
  const y = stepY(pitch.written.step);

  const notehead = svgElement('g', {
    class: 'notehead',
    // Identité sonore (comme les lignes du tableau) et hauteur écrite.
    'data-pitch': pitch.midi,
    'data-note': pitch.name,
    'data-pitch-class': pitchClassName(pitch.pitchClass),
    'data-written-pitch': pitch.written.midi,
    'data-written-name': pitch.written.name,
    role: 'button',
    tabindex: '0',
    'aria-label': `Note écrite ${pitch.written.name} (son ${pitch.name})`,
  });

  // Cible tactile : toute la colonne, sur toute la hauteur du ruban.
  notehead.append(
    svgElement('rect', {
      class: 'notehead-hit',
      x: PAD_X + index * COLUMN_WIDTH,
      y: 0,
      width: COLUMN_WIDTH,
      height: totalHeight,
    }),
  );

  notehead.append(...buildLedgers(pitch.written, centerX));

  notehead.append(
    svgElement('ellipse', {
      class: 'notehead-head',
      cx: centerX,
      cy: y,
      rx: HEAD_RADIUS_X,
      ry: HEAD_RADIUS_Y,
    }),
  );

  if (pitch.written.accidental) {
    notehead.append(
      svgElement(
        'text',
        {
          class: 'accidental',
          x: centerX - ACCIDENTAL_GAP,
          y: y + 5,
          'text-anchor': 'middle',
          'font-size': ACCIDENTAL_FONT_SIZE,
        },
        pitch.written.accidental,
      ),
    );
  }

  notehead.append(
    svgElement(
      'text',
      {
        class: 'notehead-label',
        x: centerX,
        y: LABEL_Y,
        'text-anchor': 'middle',
        'font-size': LABEL_FONT_SIZE,
      },
      pitch.written.name,
    ),
  );

  return notehead;
}

/**
 * Contrôleur de surbrillance de la portée (piloté par le ticket 12).
 *
 * - `applyHighlights({ primary, secondary })` : marque la tête `primary` (MIDI
 *   sonore) et les têtes `secondary` (liste de MIDI sonores) ; le niveau est
 *   exposé par `data-highlight="primary|secondary"` et les classes
 *   `is-primary` / `is-secondary`.
 * - `clearHighlights()` : retire les deux niveaux.
 * - `setSelection(midi)` : dérive les deux niveaux du modèle (primaire = la
 *   hauteur écrite du MIDI sonore ; secondaire = les autres octaves de la même
 *   classe de hauteur) ; `null` efface.
 * - `scrollToPitch(midi)` : amène la tête correspondante dans la vue.
 */
function createController(mount, scroller, svg, pitches) {
  const noteheads = [...svg.querySelectorAll('.notehead')];
  const byMidi = new Map(noteheads.map((element) => [Number(element.getAttribute('data-pitch')), element]));

  function clearHighlights() {
    for (const element of noteheads) {
      element.removeAttribute('data-highlight');
      element.classList.remove('is-primary', 'is-secondary');
    }
  }

  function mark(midi, tier) {
    const element = byMidi.get(midi);
    if (!element) return;
    element.setAttribute('data-highlight', tier);
    element.classList.add(tier === 'primary' ? 'is-primary' : 'is-secondary');
  }

  function applyHighlights({ primary = null, secondary = [] } = {}) {
    clearHighlights();
    if (primary !== null && primary !== undefined) mark(primary, 'primary');
    for (const midi of secondary) {
      if (midi !== primary) mark(midi, 'secondary');
    }
  }

  function setSelection(soundingMidi) {
    const selected = soundingMidi === null ? null : pitches.find((pitch) => pitch.midi === soundingMidi);
    if (!selected) {
      clearHighlights();
      return;
    }
    const secondary = pitches
      .filter((pitch) => pitch.pitchClass === selected.pitchClass && pitch.midi !== selected.midi)
      .map((pitch) => pitch.midi);
    applyHighlights({ primary: selected.midi, secondary });
  }

  function scrollToPitch(soundingMidi) {
    const element = byMidi.get(soundingMidi);
    if (element) element.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
  }

  return { mount, scroller, svg, pitches, applyHighlights, clearHighlights, setSelection, scrollToPitch };
}

/** Rend la portée en clé de fa dans `mount` et renvoie son contrôleur. */
export function renderStaff(mount, pitches = allPitches()) {
  mount.textContent = '';

  const totalWidth = PAD_X * 2 + pitches.length * COLUMN_WIDTH;
  const svg = svgElement('svg', {
    class: 'staff-svg',
    viewBox: `0 0 ${totalWidth} ${SVG_HEIGHT}`,
    width: totalWidth,
    height: SVG_HEIGHT,
    role: 'group',
    'aria-label': 'Portée en clé de fa',
  });
  svg.append(svgElement('title', {}, 'Portée en clé de fa'));
  svg.append(buildStaffLines(totalWidth));

  const noteheads = svgElement('g', { class: 'noteheads' });
  pitches.forEach((pitch, index) => {
    noteheads.append(buildNotehead(pitch, index, SVG_HEIGHT));
  });
  svg.append(noteheads);

  // Le ruban défile horizontalement ; la largeur minimale fixe la taille des
  // colonnes (donc des cibles tactiles) quelle que soit la place disponible.
  svg.style.minWidth = `${totalWidth}px`;

  const scroller = document.createElement('div');
  scroller.className = 'staff-scroll';
  scroller.append(svg);
  mount.append(scroller);

  return createController(mount, scroller, svg, pitches);
}
