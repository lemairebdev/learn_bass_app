# 12 — Selection state, three-way synchronization, highlight tiers

Type: task
Status: open
Blocked by: 09, 10, 11

## Goal

The app's single piece of state — the currently selected sounding pitch — and its fan-out: every interaction (fretboard cell, staff notehead, table row) resolves a pitch through the model, updates the state, and highlights the primary and secondary tiers across all three views, which auto-scroll to the selection.

## Spec pointers

- Implementation Decision 4 — selection model (read fully): one app-level state (selected sounding pitch or none); interactions resolve through the model; the state fans out to the three views and the audio module; selecting the already-selected pitch replays the tone and changes nothing else (emit a play request even when the pitch is unchanged — audio itself is ticket 13, expose the hook now); the selection never persists across reloads.
- Implementation Decision 5 — highlight semantics: primary tier = every location of the exact pitch — all its fretboard positions (cells display the note name), its staff notehead (the one at written = sounding + 12), its table row; secondary tier = same pitch class in other octaves, in the same three views, with a clearly weaker treatment. Expose the tiers through the DOM contract (e.g. a `data-highlight` attribute or equivalent) — tests may assert only the two tiers' presence, not styling internals.
- Implementation Decisions 6, 7 (auto-scroll to keep the selection visible) and user story 28.
- User stories 1–9, 21, 28.
- Testing Decisions — synchronization in all three directions, both tiers asserted each time.

## Deliverables

- `js/state.js` — the selection state module: selected sounding pitch or none; updates; subscriber notification; a same-pitch reselect still signals a play request (the hook ticket 13 plugs into).
- `js/app.js` wiring — pointer interactions on fretboard cells, staff noteheads, and table rows resolve the sounding pitch via the model, update the state, and fan out to the three views' highlight APIs.
- Auto-scroll — when the selection changes, the fretboard's and staff's horizontal scrollers bring the selection into view, and the table reveals the selected row.
- Validate the secondary highlight's visual treatment (spec risk: it must be clearly weaker than primary, never mistakable for it). Pick the treatment; record the choice and rationale in your final report.
- `tests/sync.spec.js` — for each direction — fretboard tap → staff + table; staff tap → fretboard + table; row tap → fretboard + staff — the primary tier is correct in all three views (all positions of the exact pitch, the written-pitch notehead, the row) and the secondary tier is correct (other octaves of the pitch class, weaker treatment present). Cover at least: a four-position note (Do3), a range end (Mi1 or Ré♯4), an open-string position, and a sharp. A second tap on the same pitch changes nothing visually. The selection does not survive a reload.

## Done when

- The suite above passes on both viewports together with the existing suite.
- If another implementer may be running tests concurrently, run yours with `TEST_PORT=4212 npm test`.
