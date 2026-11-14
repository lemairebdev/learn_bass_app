# 11 — Staff view (chromatic bass-clef strip)

Type: task
Status: resolved
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

## Comments

- **Resolved 2026-11-14.** Implemented on branch `ticket/11-staff-view`, merged to `integration/learn-bass-pwa` as `83d1937`. Suite after merge: 54 passed, 2 skipped, 0 failed.

### API and DOM contract for ticket 12

- `renderStaff(mount, { pitches = allPitches(), onSelect } = {})` → `{ highlight, clear, mount, scroller, svg, pitches }` — mirrors the fretboard handle from ticket 10.
- `highlight(selection)` accepts a sounding MIDI number or a model pitch object; primary = the single notehead at the exact pitch's written pitch (sounding + 12); secondary = noteheads of the same pitch class in other octaves; `null`/out-of-range clears; auto-scrolls the primary notehead into view (instant).
- `onSelect(soundingMidi)` fires on click/Enter/Space on a notehead.
- Notehead `<g class="notehead">` carries `data-midi` and `data-pitch` (both sounding MIDI), `data-note` (sounding name), `data-pitch-class`, `data-written-pitch`, `data-written-name`, `role="button"`, `tabindex="0"`, `aria-label="Note écrite Mi2 (son Mi1)"`; tiers marked `data-highlight="primary|secondary"` plus classes `is-primary`/`is-secondary`, attribute absent at rest.
- Structure: `#staff .staff-scroll`, `svg.staff-svg`, `.staff-line`, `.ledger.ledger-below|.ledger-above`, `.notehead-head`, `.accidental`, `.notehead-label`.

### Extreme-ledger validation (implementation-time prototype)

Rasterised at 1:1 and checked pixel-by-pixel: Mi2 has exactly one ledger line (22 px below the bottom staff line); Ré♯5 has five ledger lines above (22 px apart, notehead on the fifth). Staff lines 22 px apart; invisible hit rect = full column, 46×306 px on the mobile viewport (≥44 px). Adjustments: label font 11→12 px, ♯ 15→16 px, ♯ gap 14→15 px, and labels moved to a fixed bottom row aligned under each column to stop collisions.

### Open deviation for ticket 15 / code review

- The desktop staff **scrolls horizontally inside its column** instead of fitting the ~740 px desktop column; scaling to fit would shrink labels to ~5 px (unreadable). Page layout (staff/table side by side) is unchanged, but user story 29 (« no scrolling between them on PC ») should be re-examined by ticket 15 or code review.
- No bass-clef glyph is drawn (avoids missing-glyph tofu on Android fonts); the staff is identified by the « Portée » heading and `aria-label="Portée en clé de fa"`.
