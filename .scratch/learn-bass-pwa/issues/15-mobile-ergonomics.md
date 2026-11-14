# 15 — Mobile ergonomics: tap targets and auto-scroll validation

Type: task
Status: open
Blocked by: 12

## Goal

Validate and tune the touch experience on the mobile viewport: fret cells and staff noteheads are comfortable thumb targets, taps land on the intended target, and auto-scroll reliably brings the selection into view — without breaking the desktop one-glance layout.

## Spec pointers

- User stories 26–30: thumb-sized targets, nut stays visible while scrolling high frets, auto-scroll to selection, desktop one-glance layout, pointer parity between click and tap.
- Implementation Decisions 6, 7, 10; Testing Decisions — ergonomics coverage: on the mobile viewport, tap targets meet the minimum size, taps land on the intended cell or notehead, auto-scroll brings the selection into view.
- This ticket validates behavior built in tickets 08–12 and tunes sizes and scrolling; the desktop layout must stay intact (decision 29).

## Deliverables

- On the mobile viewport: measure fret cells and staff noteheads (including hit areas); adjust so they meet the ~44 px minimum where practical; ensure real touch events dispatched at a target's center select the intended pitch (no mis-taps from overlapping or too-small targets).
- Auto-scroll: selecting an off-screen note (a high fret, a top-of-staff note, a row in the filtered table) scrolls each view so the selection is visible; the fretboard's pinned nut column stays visible while scrolled to high frets (story 27).
- Pointer parity: clicks on desktop and taps on mobile produce identical selections (story 30).
- `tests/ergonomics.spec.js` on the mobile project — tap-target size assertions on cells and noteheads; touch taps at target centers select the intended pitch; auto-scroll assertions for fretboard, staff, and table; pinned-nut assertion while scrolled to high frets; plus one desktop run asserting the one-glance layout still holds.

## Done when

- The suite above passes together with the existing suite.
- If another implementer may be running tests concurrently, run yours with `TEST_PORT=4215 npm test`.
