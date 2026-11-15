// Point d'entrée de l'application (module ES chargé par index.html).
// Bootstrap : le modèle musical (js/model.js) est la source de vérité ; chaque
// vue en dérive. Les vues « manche », « portée en clé de fa » et « tableau de
// correspondances » sont montées, et la sélection unique (js/state.js) se
// propage aux trois vues à chaque interaction (décisions 4 et 5). Le module
// audio (ticket 13) branchera sa lecture sur `selection.onPlayRequest`.
import { allPitches, pitchForMidi } from './model.js';
import { renderTable } from './table.js';
import { renderFretboard } from './fretboard.js';
import { renderStaff } from './staff.js';
import { selection } from './state.js';
import { mountAudio } from './audio.js';

/**
 * Toute interaction résout sa note par le modèle (source de vérité) puis met à
 * jour l'état unique : une case, une tête ou une ligne hors instrument est
 * ignorée.
 */
function select(midi) {
  const pitch = pitchForMidi(midi);
  if (pitch) selection.select(pitch.midi);
}

const table = document.getElementById('table');
const tableView = table ? renderTable(table, allPitches(), { onSelect: select }) : null;

const fretboard = document.getElementById('fretboard');
const fretboardView = fretboard ? renderFretboard(fretboard, { onSelect: select }) : null;

const staff = document.getElementById('staff');
const staffView = staff ? renderStaff(staff, { onSelect: select }) : null;

/** Les vues montées, dans l'ordre manche → portée → tableau. */
const views = [fretboardView, staffView, tableView].filter(Boolean);

// La sélection se propage : chaque vue applique ses deux niveaux de surbrillance
// (primaire = note exacte, secondaire = autres octaves de la même classe) et
// amène la sélection dans sa zone visible.
selection.subscribe((midi) => {
  for (const view of views) {
    if (midi === null) view.clear();
    else view.highlight(midi);
  }
});

// Le module audio se branche sur la même sélection : chaque demande de lecture
// (`onPlayRequest`, y compris la re-sélection de la même note) joue la note
// sonore à sa fréquence exacte ; les contrôles de l'en-tête sont montés dans
// le conteneur prévu (décisions 4, 9 et 10).
mountAudio(document.getElementById('audio-controls'));

/** Enregistre le service worker et propose le rechargement d'une mise à jour prête. */
function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;

  const notice = document.getElementById('update-notice');
  const reloadButton = notice?.querySelector('button');
  if (!notice || !reloadButton) return;

  let acceptedUpdate = false;
  let registration;

  const showUpdate = () => {
    if (registration?.active && registration.waiting) notice.hidden = false;
  };

  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data?.type === 'UPDATE_READY') showUpdate();
  });

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (acceptedUpdate) window.location.reload();
  });

  reloadButton.addEventListener('click', () => {
    if (!registration?.waiting) return;
    acceptedUpdate = true;
    registration.waiting.postMessage({ type: 'SKIP_WAITING' });
  });

  navigator.serviceWorker.register('./sw.js').then((registered) => {
    registration = registered;
    if (registration.waiting) showUpdate();
    registration.addEventListener('updatefound', () => {
      const installing = registration.installing;
      installing?.addEventListener('statechange', () => {
        if (installing.state === 'installed') showUpdate();
      });
    });
  }).catch((error) => {
    console.error('Impossible d’enregistrer le service worker :', error);
  });
}

registerServiceWorker();
