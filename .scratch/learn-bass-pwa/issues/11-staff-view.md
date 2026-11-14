# 11 — Staff view (chromatic bass-clef strip)

Type: task
Status: claimed
Blocked by: 08, 09

## Goal

The single bass-clef staff strip: one clickable notehead per written pitch (36, chromatic, low to high), ♯ accidentals left of sharp noteheads, ledger lines from one below the staff to five above, a small written-name label under each notehead, enlarged invisible hit areas, horizontal scrolling — readable and tappable all the way to the extremes.

## Spec pointers

- Implementation Decision 7 — the staff contract (read it fully).
- Implementation Decision 3 — written pitch = sounding + 12 (written range Mi2–Ré♯5); staff placement (step + ledger count) comes from the model.
- Decisions 14/15 semantics (user stories 14–16): the staff displays written names while the table displays sounding names; high notes on ledger lines stay readable and tappable.
- Implementation Decision 11 — DOM contract: each notehead carries data attributes and a French aria-label identifying its written pitch.
- Spec Further Notes — known design risk: written Ré♯5 sits five ledger lines above the staff. This ticket carries the spec's implementation-time prototype validation: build the strip, then verify the extremes (one ledger below for the lowest written notes, five above for the top) are readable and comfortably tappable, adjusting spacing, sizes, and label placement until they are. Record what you validated and adjusted in your final report.

## Deliverables

- `js/staff.js` — renders the SVG strip into its mount point from `js/model.js` only. Uniform notehead spacing; ♯ accidental left of each sharp notehead; ledger lines as the model dictates; a written-name label (Mi2, Fa♯2, …) under each notehead; an enlarged invisible hit area per notehead; horizontal scroll on narrow screens.
- Expose an API to apply/clear primary and secondary highlights on noteheads (same pattern as the fretboard; the primary tier for a selected sounding pitch is the notehead at its written pitch). Ticket 12 drives it.
- `tests/staff.spec.js` — 36 noteheads ascending chromatic; every written-name label equals the corresponding sounding name raised one octave (Mi2 … Ré♯5) — the spec's « notation octave via the staff labels » coverage; ♯ appears exactly on the sharp noteheads and nowhere else; ledger-line counts match the model's staff placement at the extremes (one line below the staff for the lowest written notes, five above for Ré♯5); the aria/DOM contract is present; the strip scrolls horizontally on the mobile viewport.

## Done when

- The suite above passes on both viewports together with the existing suite.
- If another implementer may be running tests concurrently, run yours with `TEST_PORT=4211 npm test`.
