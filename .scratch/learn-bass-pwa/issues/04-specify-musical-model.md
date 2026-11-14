# Specify the musical model and correspondences

Type: grilling
Status: resolved

## Question

What are the exact musical rules? This covers tuning (likely E1–A1–D2–G2), reference pitch (default A4 = 440 Hz), whether open strings / fret 0 are included alongside 20 frets, the exact bounds of the displayed range, enharmonic behaviour behind the default sharps, conversion between sounding and written pitch, the table's contents, sorting, and filtering, and what happens on a new selection or a second click.

## Answer

Decided in the spec: Implementation Decision 3 — the musical model as a single source of truth (standard tuning Mi1–La1–Ré2–Sol2 = MIDI 28, 33, 38, 43; frets 0–20 per string, 84 positions; equal temperament; La4 = 440 Hz with freq = 440 × 2^((m−69)/12); 36 distinct sounding pitches from Mi1 to Ré♯4; up to four positions per pitch; French solfège names with a scientific octave digit; sharps ♯ only; written pitch = sounding + 12, giving a written range Mi2–Ré♯5; staff placement derived) — and Decision 4 (selection model: a second click on the same pitch replays the tone and changes nothing else; the selection does not persist). Enharmonic behaviour is fixed to sharp-only spelling (Out of Scope: no ♭, no double accidentals). Implementation ticket: [09-model-table.md](09-model-table.md).
