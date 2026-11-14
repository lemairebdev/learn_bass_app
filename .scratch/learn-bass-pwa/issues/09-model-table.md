# 09 — Musical model (single source of truth) and correspondence table

Type: task
Status: open
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
