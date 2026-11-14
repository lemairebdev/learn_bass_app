// État de sélection de l'application (décision 4 de la spécification).
//
// Une seule pièce d'état au niveau de l'app : la note SONORE sélectionnée (un
// numéro MIDI, identité de la note dans toute l'app) ou aucune (`null`). Toute
// interaction — case du manche, tête de la portée, ligne du tableau — résout sa
// note par le modèle puis appelle `select` ; l'état prévient ses abonnés et la
// sélection se propage aux trois vues.
//
// Module pur : il ne connaît ni le DOM, ni le modèle, ni l'audio — il ne fait
// que porter la sélection et signaler les changements. La sélection ne survit
// pas à un rechargement (rien n'est persisté ici).
//
// Deux signaux distincts :
// - `subscribe(listener)` : le changement de sélection (les vues s'y abonnent
//   pour appliquer leurs surbrillances) ; appelé seulement quand la note change ;
// - `onPlayRequest(listener)` : une demande de lecture, émise à CHAQUE
//   sélection, y compris quand on re-sélectionne la note déjà sélectionnée
//   (décision 4 : rejouer le son, ne rien changer d'autre). C'est le point
//   d'accroche du module audio (ticket 13).

/**
 * Crée un état de sélection isolé. Les écouteurs sont notifiés dans l'ordre
 * d'inscription ; `subscribe` et `onPlayRequest` renvoient une fonction de
 * désabonnement.
 */
export function createSelection(initial = null) {
  let selected = initial;
  const changeListeners = new Set();
  const playListeners = new Set();

  /** La note sonore sélectionnée (numéro MIDI) ou `null`. */
  function get() {
    return selected;
  }

  /** Vrai si `midi` est la note actuellement sélectionnée. */
  function isSelected(midi) {
    return selected !== null && midi === selected;
  }

  /** Sélectionne une note sonore ; `null` efface la sélection. */
  function select(midi) {
    if (midi === null || midi === undefined) {
      clear();
      return;
    }
    const changed = midi !== selected;
    selected = midi;
    if (changed) notifyChange();
    // Re-sélectionner la même note rejoue le son sans rien changer d'autre.
    notifyPlay();
  }

  /** Efface la sélection (sans demande de lecture). */
  function clear() {
    if (selected === null) return;
    selected = null;
    notifyChange();
  }

  /** S'abonne aux changements de sélection. Renvoie le désabonnement. */
  function subscribe(listener) {
    changeListeners.add(listener);
    return () => changeListeners.delete(listener);
  }

  /** S'abonne aux demandes de lecture (à chaque sélection). Renvoie le désabonnement. */
  function onPlayRequest(listener) {
    playListeners.add(listener);
    return () => playListeners.delete(listener);
  }

  function notifyChange() {
    for (const listener of [...changeListeners]) listener(selected);
  }

  function notifyPlay() {
    for (const listener of [...playListeners]) listener(selected);
  }

  return { get, isSelected, select, clear, subscribe, onPlayRequest };
}

/**
 * L'état de sélection de l'application — une seule instance par page. Les vues
 * s'abonnent via `subscribe` ; le module audio (ticket 13) branche son
 * `onPlayRequest` sur cette même instance.
 */
export const selection = createSelection();
