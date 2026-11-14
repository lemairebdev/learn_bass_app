# 09 — Musical model (single source of truth) and correspondence table

Type: task
Status: resolved
Blocked by: 08

## Goal

Implement the pure musical model that owns every musical rule in the app, and the correspondence-table view that renders it — with the model's exhaustive E2E coverage coming through the rendered table, per the spec's testing decisions.

## Spec pointers

- Implementation Decision 3 — the model. Constants: tuning Mi1–La1–Ré2–Sol2 (MIDI 28, 33, 38, 43), frets 0–20 per string (84 positions), equal temperament, La4 = 440 Hz, freq(m) = 440 × 2^((m−69)/12). Derived: the 36 distinct sounding pitches from Mi1 (41,2 Hz) to Ré♯4; each position's pitch; each pitch's (string, fret) positions — up to four; French name + octave; written pitch = sounding + 12 (written range Mi2–Ré♯5); staff placement (staff step and ledger-line count). Integer MIDI numbers are the pitch identity app-wide; semitone arithmetic stays integer.
- Implementation Decision 8 — the table: one row per distinct sounding pitch, 36 rows ascending; columns: name + octave, frequency (one decimal, French comma), positions as compact « Corde·case » chips (Mi·12, La·7, Ré·2); the whole row is one click target (selection wiring lands in ticket 12 — render the affordance now); two filters — string and note name — combining with AND; default unfiltered.
- Implementation Decision 2 — French formatting: solfège names (Do Ré Mi Fa Sol La Si), ♯ for sharps, French decimal comma.
- Implementation Decision 11 — DOM contract: every row carries data attributes and a French aria-label identifying its sounding pitch. This is the shipped accessibility surface the tests read — not a test hook.
- Testing Decisions — « musical model, exhaustively, via the rendered table »; never import internal modules in tests.

## Deliverables

- `js/model.js` — pure module, no DOM: everything above derived from the constants. Design the API as you see fit; views must do no musical math.
- `js/table.js` — renders the correspondence table into its mount point, reading only the model; includes the two filters (string: Corde Mi/La/Ré/Sol; note name: the 12 pitch classes including sharps), AND-combined, default unfiltered.
- Register both in `js/app.js`.
- `tests/model-table.spec.js` — exhaustive, through the rendered table and its DOM contract: all 36 rows ascending; every row's name, octave, and frequency (French comma — e.g. Mi1 = 41,2 Hz); full position sets — Mi1 has exactly Mi·0, Ré♯4 has exactly Sol·20, Do3 has exactly Mi·20, La·15, Ré·10, Sol·5; fret-0 positions appear as chips; every accidental is ♯ (no ♭ anywhere); the string filter, the note-name filter, and both combined (AND); default is unfiltered.

## Done when

- The suite above passes on both viewports, together with the existing suite from ticket 08.

## Comments

- **Resolved 2026-11-14.** Implemented on branch `ticket/09-model-table`, merged to `integration/learn-bass-pwa` as `4e23065`. Suite: 28 passed, 0 failed (14 specs × desktop/mobile).

### `js/model.js` public API (the contract tickets 10–12 build on)

Constants: `STRINGS` (frozen `[{name:'Mi',midi:28},{name:'La',midi:33},{name:'Ré',midi:38},{name:'Sol',midi:43}]`, low→high), `STRING_NAMES`, `FRET_MIN=0`, `FRET_MAX=20`, `FRET_COUNT=21`, `A4_MIDI=69`, `A4_FREQUENCY=440`, `WRITTEN_OCTAVE_OFFSET=12`, `MIDI_MIN=28`, `MIDI_MAX=63`, `PITCH_CLASS_NAMES`, `SHARP_PITCH_CLASSES`, `ACCIDENTAL='♯'`.

Pitch primitives (integer MIDI in/out): `midiToPitchClass`, `pitchClassName`, `midiToOctave`, `midiToName`, `isSharp`, `accidentalFor`, `midiToFrequency`, `formatFrequency` (French comma, 1 decimal), `midiToWrittenMidi` (+12), `midiToWrittenName`.

Staff (input is the **written** MIDI): `staffStep` (0 = bottom bass-staff line, written Sol2), `staffLedgerLines → {below, above}`, `staffPlacement → {step, ledgerLines, accidental}`.

Positions/derived: `positionMidi(stringIndex, fret)`, `positionLabel → 'Mi·12'`, `positionsForMidi(midi) → [{stringIndex,string,fret}]`, `allPositions() → 84`, `PITCHES`/`allPitches()` → 36 pitch objects ascending, `pitchForMidi(midi)`.

Pitch object: `{ midi, name:'Do3', pitchClass, octave, frequency, frequencyLabel:'130,8 Hz', sharp, positions:[…], written:{ midi, name, step, ledgerLines:{below,above}, accidental } }`.

### DOM/filter contract already in place (ticket 12 must respect)

- Rows: `#table tbody tr[data-pitch="<midi>"]`, plus `data-note`, `data-pitch-class`, `tabindex="0"`, `aria-label` = name — frequency — chips.
- Cells/chips: `.cell-note`, `.cell-frequency`, `.cell-positions`, `.chip[data-string][data-fret]`.
- Filters are radio groups `input[name="string-filter"]` (`all|Mi|La|Ré|Sol`) and `input[name="note-filter"]` (`all` + 12 French pitch-class names), AND-combined, default `all`.
- Filtering writes the `hidden` attribute on rows/chips, so selection styling must use classes, never `hidden`.
- Model precomputes frozen `PITCHES`/position maps at load; keep `js/model.js` DOM-free and import-free (ticket 08's guard spec enforces relative imports).
