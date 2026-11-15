// Modèle musical — source de vérité unique de toutes les règles musicales de
// l'app (décision 3 de la spécification). Module pur : aucun accès au DOM, aux
// vues ou à l'audio ; tout le reste en dérive.
//
// Le numéro MIDI entier est l'identité d'une note dans toute l'app ; toute
// l'arithmétique de demi-tons reste entière. La basse 4 cordes est accordée
// Mi1–La1–Ré2–Sol2 (MIDI 28, 33, 38, 43), cases 0 à 20 par corde, tempérament
// égal, La4 = 440 Hz.

/** Les cordes, de la plus grave (Mi) à la plus aiguë (Sol). */
export const STRINGS = Object.freeze([
  Object.freeze({ name: 'Mi', midi: 28 }),
  Object.freeze({ name: 'La', midi: 33 }),
  Object.freeze({ name: 'Ré', midi: 38 }),
  Object.freeze({ name: 'Sol', midi: 43 }),
]);

/** Noms français des cordes, dans l'ordre grave → aigu. */
export const STRING_NAMES = Object.freeze(STRINGS.map((string) => string.name));

/** Cases disponibles : 0 (corde à vide) à 20. */
export const FRET_MIN = 0;
export const FRET_MAX = 20;
export const FRET_COUNT = FRET_MAX - FRET_MIN + 1;

/** Référence du tempérament égal. */
export const A4_MIDI = 69;
export const A4_FREQUENCY = 440;

/** La portée en clé de fa s'écrit une octave au-dessus du son réel. */
export const WRITTEN_OCTAVE_OFFSET = 12;

/** Bornes sonores de l'instrument : Mi1 (MIDI 28) à Ré♯4 (MIDI 63). */
export const MIDI_MIN = STRINGS[0].midi;
export const MIDI_MAX = STRINGS[STRINGS.length - 1].midi + FRET_MAX;

/** Les 12 classes de hauteur, en solfège français, avec ♯ par défaut. */
export const PITCH_CLASS_NAMES = Object.freeze([
  'Do', 'Do♯', 'Ré', 'Ré♯', 'Mi', 'Fa', 'Fa♯', 'Sol', 'Sol♯', 'La', 'La♯', 'Si',
]);

/** Classes de hauteur écrites avec un dièse (aucun bémol dans l'app). */
export const SHARP_PITCH_CLASSES = Object.freeze([1, 3, 6, 8, 10]);

/** Le seul altératif utilisé. */
export const ACCIDENTAL = '♯';

/** Classe de hauteur (0–11) d'un numéro MIDI, robuste aux entiers négatifs. */
export function midiToPitchClass(midi) {
  return ((midi % 12) + 12) % 12;
}

/** Nom français d'une classe de hauteur, ex. `0` → « Do », `1` → « Do♯ ». */
export function pitchClassName(pitchClass) {
  return PITCH_CLASS_NAMES[midiToPitchClass(pitchClass)];
}

/** Octave scientifique d'un numéro MIDI (La4 = MIDI 69 → octave 4). */
export function midiToOctave(midi) {
  return Math.floor(midi / 12) - 1;
}

/** Nom français complet d'une note, ex. `48` → « Do3 ». */
export function midiToName(midi) {
  return pitchClassName(midi) + midiToOctave(midi);
}

/** Vrai si la note s'écrit avec un dièse. */
export function isSharp(midi) {
  return SHARP_PITCH_CLASSES.includes(midiToPitchClass(midi));
}

/** Altératif à afficher (« ♯ » ou rien). */
export function accidentalFor(midi) {
  return isSharp(midi) ? ACCIDENTAL : null;
}

/** Fréquence en hertz d'un numéro MIDI : 440 × 2^((m−69)/12). */
export function midiToFrequency(midi) {
  return A4_FREQUENCY * 2 ** ((midi - A4_MIDI) / 12);
}

/** Fréquence formatée à la française : une décimale, virgule, « Hz ». */
export function formatFrequency(hz) {
  return `${hz.toFixed(1).replace('.', ',')} Hz`;
}

/** Numéro MIDI de la hauteur écrite (clé de fa) : son + une octave. */
export function midiToWrittenMidi(midi) {
  return midi + WRITTEN_OCTAVE_OFFSET;
}

/** Nom de la hauteur écrite, ex. `28` → « Mi2 ». */
export function midiToWrittenName(midi) {
  return midiToName(midiToWrittenMidi(midi));
}

// Position diatonique sur la portée : 0 = ligne inférieure de la clé de fa
// (Sol2 écrit), +1 par degré conjoint vers le haut, −1 vers le bas. Les lignes
// de la portée occupent les positions paires 0, 2, 4, 6, 8.
const STAFF_BOTTOM_LINE_STEP = 18; // Sol2 écrit = 2 × 7 + 4 (lettre Sol)
const LETTER_INDEX_BY_PITCH_CLASS = [0, 0, 1, 1, 2, 3, 3, 4, 4, 5, 5, 6];

/** Position diatonique d'une hauteur écrite sur la portée (clé de fa). */
export function staffStep(writtenMidi) {
  const letter = LETTER_INDEX_BY_PITCH_CLASS[midiToPitchClass(writtenMidi)];
  return midiToOctave(writtenMidi) * 7 + letter - STAFF_BOTTOM_LINE_STEP;
}

/** Nombre de lignes supplémentaires au-dessus et au-dessous de la portée. */
export function staffLedgerLines(writtenMidi) {
  const step = staffStep(writtenMidi);
  return Object.freeze({
    below: step < 0 ? Math.floor(-step / 2) : 0,
    above: step > 9 ? Math.floor((step - 10) / 2) + 1 : 0,
  });
}

/** Placement complet d'une hauteur écrite : degré, lignes, altératif. */
export function staffPlacement(writtenMidi) {
  return Object.freeze({
    step: staffStep(writtenMidi),
    ledgerLines: staffLedgerLines(writtenMidi),
    accidental: accidentalFor(writtenMidi),
  });
}

/** Numéro MIDI produit par (corde, case). `stringIndex` suit STRINGS. */
export function positionMidi(stringIndex, fret) {
  return STRINGS[stringIndex].midi + fret;
}

/** Étiquette compacte d'une position, ex. « Mi·12 ». */
export function positionLabel(stringIndex, fret) {
  return `${STRINGS[stringIndex].name}·${fret}`;
}

// Positions indexées par numéro MIDI, construites une fois (84 positions).
const POSITIONS_BY_MIDI = new Map();
for (let stringIndex = 0; stringIndex < STRINGS.length; stringIndex += 1) {
  for (let fret = FRET_MIN; fret <= FRET_MAX; fret += 1) {
    const midi = positionMidi(stringIndex, fret);
    if (!POSITIONS_BY_MIDI.has(midi)) POSITIONS_BY_MIDI.set(midi, []);
    POSITIONS_BY_MIDI.get(midi).push(
      Object.freeze({ stringIndex, string: STRINGS[stringIndex].name, fret }),
    );
  }
}

/** Toutes les positions produisant un numéro MIDI, grave → aigu. */
export function positionsForMidi(midi) {
  return POSITIONS_BY_MIDI.get(midi) ?? [];
}

/** Toutes les positions de l'instrument (84), grave → aigu puis case croissante. */
export function allPositions() {
  return Object.freeze([...POSITIONS_BY_MIDI.values()].flat());
}

function buildPitch(midi) {
  const frequency = midiToFrequency(midi);
  const writtenMidi = midiToWrittenMidi(midi);
  const placement = staffPlacement(writtenMidi);
  return Object.freeze({
    midi,
    name: midiToName(midi),
    pitchClass: midiToPitchClass(midi),
    octave: midiToOctave(midi),
    frequency,
    frequencyLabel: formatFrequency(frequency),
    sharp: isSharp(midi),
    positions: Object.freeze(positionsForMidi(midi)),
    written: Object.freeze({
      midi: writtenMidi,
      name: midiToName(writtenMidi),
      ...placement,
    }),
  });
}

/** Les 36 notes distinctes de Mi1 à Ré♯4, en ordre ascendant. */
export const PITCHES = Object.freeze(
  Array.from({ length: MIDI_MAX - MIDI_MIN + 1 }, (_, index) => buildPitch(MIDI_MIN + index)),
);

/** Toutes les notes distinctes de l'instrument, grave → aigu. */
export function allPitches() {
  return PITCHES;
}

/** La note correspondant à un numéro MIDI, ou `null` hors de l'instrument. */
export function pitchForMidi(midi) {
  return PITCHES[midi - MIDI_MIN] ?? null;
}
