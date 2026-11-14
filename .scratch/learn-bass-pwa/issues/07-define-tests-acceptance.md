# Define tests and acceptance criteria

Type: grilling
Status: resolved

Blocked by: 03, 06

## Question

What tests and acceptance criteria are needed? Cover fretboard↔staff correspondence at range limits, fret 0 if retained, frequencies and notation octave, touch and mouse interaction, audio starting after a user gesture, offline behaviour and updates, and the Android and PC browsers actually supported.

## Answer

Decided in the spec: Testing Decisions — one automated seam (real-browser E2E with Playwright, kept as a dev-only dependency so the shipped app remains pure static files; a static file server serves the app to the tests; two viewports: desktop Chromium and a touch-emulated phone device). Tests assert only external behavior, read the DOM through the accessibility contract of Decision 11, drive real pointer/touch events, and instrument the standard Web Audio APIs from outside the page. Coverage: the musical model exhaustively via the rendered table; the notation octave via staff labels; synchronization in all three directions with both highlight tiers; selection semantics; audio gating; offline after first load; the update flow; mobile ergonomics. A manual acceptance checklist covers what cannot be automated (tone by ear, physical-device readability, real install flows). Implementation tickets: [08](08-scaffold-shell-harness.md) (harness) and each view/behavior ticket carries its own specs.
