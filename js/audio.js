// Module audio (décision 9 de la spécification).
//
// Une voix de basse synthétisée, branchée sur la sélection unique : chaque
// demande de lecture (le point d'accroche `selection.onPlayRequest` du ticket
// 12) joue la note sonore sélectionnée à sa fréquence exacte, venue du modèle
// (source de vérité). Le module ne connaît ni les vues ni le DOM des vues.
//
// Contraintes fixées par la décision 9 :
// - un AudioContext UNIQUE, créé paresseusement et repris au premier geste
//   utilisateur (politique d'autodémarrage) — toute demande de lecture vient
//   d'un gestionnaire de clic/tap, donc de l'activation utilisateur ;
// - voix monophonique : la tonalité est courte, la recette précise est
//   affinée à l'oreille dans ces contraintes (ticket 13).

import { midiToFrequency } from './model.js';
import { selection } from './state.js';

/** Volume par défaut (0–100) tant que l'étudiant n'a rien réglé. */
const DEFAULT_VOLUME = 80;

/** Clés de persistance des préférences audio (décision 9 : seule préférence persistée de l'app). */
const STORAGE_VOLUME = 'learn-bass.volume';
const STORAGE_MUTE = 'learn-bass.mute';

/** L'unique contexte audio de la page — `null` tant qu'aucun geste n'a joué. */
let context = null;

/** Le gain maître (volume × sourdine) vers la sortie. */
let masterGain = null;

/** La voix en cours — coupée dès qu'une nouvelle sélection arrive. */
let activeVoice = null;

/** Volume courant 0–100 ; persisté (ticket 13). */
let volume = DEFAULT_VOLUME;

/** État sourdine ; persisté (ticket 13). */
let muted = false;

/**
 * Crée le contexte au premier geste et s'assure qu'il tourne. Chaque demande
 * de lecture provient d'un gestionnaire de pointeur : la création est bien
 * « dans le geste » (politique d'autodémarrage des navigateurs).
 */
function ensureContext() {
  if (!context) {
    context = new AudioContext();
    masterGain = context.createGain();
    masterGain.connect(context.destination);
    applyMasterGain();
  }
  if (context.state !== 'running') context.resume();
}

/** Le gain maître reflète volume et sourdine. */
function applyMasterGain() {
  if (masterGain) masterGain.gain.value = muted ? 0 : volume / 100;
}

/**
 * Coupe la voix en cours : dernier clic gagnant (décision 9). L'enveloppe est
 * figée puis ramenée à zéro en quelques millisecondes, et les oscillateurs
 * sont arrêtés — la note précédente ne traîne pas sous la nouvelle.
 */
function cutActiveVoice() {
  const voice = activeVoice;
  activeVoice = null;
  if (!voice) return;
  const now = context.currentTime;
  try {
    voice.envelope.gain.cancelScheduledValues(now);
    voice.envelope.gain.setValueAtTime(voice.envelope.gain.value, now);
    voice.envelope.gain.linearRampToValueAtTime(0.0001, now + 0.02);
    for (const oscillator of voice.oscillators) oscillator.stop(now + 0.03);
  } catch {
    // Voix déjà achevée (fin de la décroissance naturelle) : rien à couper.
  }
}

/**
 * Programme un pincement de corde à la fréquence exacte de la note : un
 * mélange d'oscillateurs (triangle pour le fondamental, scie pour la richesse
 * harmonique) filtré en passe-bas, attaque rapide et décroissance
 * exponentielle — une note de basse courte, sous la seconde.
 */
function scheduleVoice(frequency) {
  const now = context.currentTime;

  const filter = context.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 900;
  filter.Q.value = 0.8;

  const envelope = context.createGain();
  envelope.gain.setValueAtTime(0, now);
  envelope.gain.linearRampToValueAtTime(0.5, now + 0.005);
  envelope.gain.exponentialRampToValueAtTime(0.0001, now + 0.9);

  filter.connect(envelope);
  envelope.connect(masterGain);

  // Le mélange : triangle dominant + scie discrète, même fondamentale.
  const blend = [
    { type: 'triangle', level: 0.6 },
    { type: 'sawtooth', level: 0.25 },
  ];
  const oscillators = [];
  for (const oscillatorSpec of blend) {
    const oscillator = context.createOscillator();
    oscillator.type = oscillatorSpec.type;
    oscillator.frequency.value = frequency;
    const oscillatorLevel = context.createGain();
    oscillatorLevel.gain.value = oscillatorSpec.level;
    oscillator.connect(oscillatorLevel);
    oscillatorLevel.connect(filter);
    oscillator.start(now);
    oscillator.stop(now + 1);
    oscillators.push(oscillator);
  }

  activeVoice = { envelope, oscillators };
}

/** Joue la note sonore sélectionnée (numéro MIDI). */
function play(midi) {
  if (midi === null || midi === undefined) return;
  ensureContext();
  cutActiveVoice();
  scheduleVoice(midiToFrequency(midi));
}

/**
 * Monte les contrôles audio dans le conteneur de l'en-tête (décisions 9 et
 * 10) : un curseur de volume et une bascule de sourdine, libellés en français
 * avec leurs attributs aria (décision 11 — surface sémantique livrée, pas des
 * crochets de test), puis restaure les préférences persistées.
 */
function renderControls(mount) {
  const slider = document.createElement('input');
  slider.type = 'range';
  slider.min = '0';
  slider.max = '100';
  slider.step = '1';
  slider.dataset.audioControl = 'volume';
  slider.setAttribute('aria-label', 'Volume');
  slider.value = String(volume);

  const mute = document.createElement('button');
  mute.type = 'button';
  mute.dataset.audioControl = 'mute';
  mute.setAttribute('aria-label', 'Sourdine');
  mute.setAttribute('aria-pressed', String(muted));
  mute.textContent = 'Sourdine';

  slider.addEventListener('input', () => {
    volume = Number(slider.value);
    localStorage.setItem(STORAGE_VOLUME, String(volume));
    applyMasterGain();
  });

  mute.addEventListener('click', () => {
    muted = !muted;
    mute.setAttribute('aria-pressed', String(muted));
    localStorage.setItem(STORAGE_MUTE, String(muted));
    applyMasterGain();
  });

  mount.append(slider, mute);
}

/**
 * Restaure les préférences persistées (story 25) : volume puis sourdine.
 * Toute valeur illisible ou hors bornes retombe sur les défauts.
 */
function restorePreferences() {
  const storedVolume = localStorage.getItem(STORAGE_VOLUME);
  if (storedVolume !== null) {
    const parsedVolume = Number(storedVolume);
    if (Number.isFinite(parsedVolume) && parsedVolume >= 0 && parsedVolume <= 100) {
      volume = parsedVolume;
    }
  }
  muted = localStorage.getItem(STORAGE_MUTE) === 'true';
}

/**
 * Monte le module audio : les contrôles de l'en-tête, puis la lecture branchée
 * sur la sélection (`onPlayRequest`, le point d'accroche du ticket 12). Toute
 * demande de lecture provient d'un geste utilisateur : le contexte, créé
 * paresseusement à la première, satisfait la politique d'autodémarrage.
 */
export function mountAudio(controlsMount) {
  if (!controlsMount) return;
  restorePreferences();
  renderControls(controlsMount);
  selection.onPlayRequest(play);
}
