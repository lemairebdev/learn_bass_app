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
 * Monte le module audio : branche la lecture sur la sélection. Les contrôles
 * de l'en-tête (curseur de volume, sourdine) complèteront ce montage
 * (ticket 13).
 */
export function mountAudio(controlsMount) {
  if (!controlsMount) return;
  selection.onPlayRequest(play);
}
