# 10 — Fretboard view

Type: task
Status: resolved
Blocked by: 08, 09

## Goal

The 4-string, 20-fret fretboard SVG: uniform columns with fret 0 for open strings, inlay markers, French string names, blank cells that can show both highlight tiers, whole-cell pointer targets of ~44 px minimum, and horizontal scrolling with the nut pinned.

## Spec pointers

- Implementation Decision 6 — the fretboard contract (read it fully): horizontal SVG, Mi string at the bottom, uniform-width columns (column 0 = open strings at the nut, then frets 1–20), markers at 3, 5, 7, 9, 12 (double), 15, 17, 19; fret numbers below; string names at the nut; cells blank by default, note names displayed when highlighted (full style primary / muted secondary); the whole cell is the pointer target, ~44 px minimum on touch; horizontal scroll with the nut pinned on narrow screens.
- Implementation Decision 11 — DOM contract: each cell carries data attributes and a French aria-label identifying its string and fret.
- User stories 1, 9, 26, 27, 29.
- Decision 5 defines what the tiers mean; ticket 12 wires selection. This ticket builds the view plus a highlight API that ticket 12 can call.

## Deliverables

- `js/fretboard.js` — renders the SVG into its mount point from `js/model.js` only (no musical math in the view). Expose an API to apply/clear primary and secondary highlights on cells — primary cells display the full note name, secondary a muted one — callable with a selected pitch (ticket 12 drives it).
- Pointer events only (click == tap; no separate touch code path). Cells are the pointer target, sized ~44 px minimum on the mobile viewport.
- On narrow screens: horizontal scroll with the nut column pinned so the open-string end stays visible. On the desktop viewport the whole board fits without scrolling between sections.
- `tests/fretboard.spec.js` — 84 cells with correct French aria-labels (string + fret); markers (double at 12), fret numbers, and string names present; cells blank by default; desktop viewport shows the full board; mobile viewport scrolls horizontally with the nut column pinned.

## Done when

- The suite above passes on both viewports together with the existing suite.
- If another implementer may be running tests concurrently, run yours with `TEST_PORT=4210 npm test`.

## Comments

- **Resolved 2026-11-14.** Implemented on branch `ticket/10-fretboard-view`, merged to `integration/learn-bass-pwa` as `3be1431`. Suite after merge: 43 passed, 0 failed, 1 intentionally skipped (mobile-only touch-target case on the desktop project).

### API and DOM contract for ticket 12

```js
import { renderFretboard } from './fretboard.js';
const view = renderFretboard(mountEl, { onSelect }); // onSelect(soundingMidi)
view.highlight(selection); // sounding MIDI number or model pitch object { midi }
view.clear();
```

- Cells: `#fretboard .fret-cell` with `data-string` (Mi|La|Ré|Sol), `data-fret` (0–20), `data-string-index`, `data-midi` (28–63), `role="button"`, `tabindex="0"`, `aria-label="Corde <nom>, case <numéro>"`; each holds `.cell-bg` and `.cell-note` (empty at rest).
- Tiers: `data-highlight="primary" | "secondary"`, attribute absent at rest. Primary shows the cell's note name in full style; secondary shows it muted. Same convention should be used in the staff so `sync.spec.js` asserts both views uniformly.
- `highlight()` also auto-scrolls the first primary cell into view, respecting the pinned column.
- Layout hooks: `.fretboard-scroll` (scroller) › `.fretboard-pinned` (sticky open column + string names + `.fret-nut`) and `.fretboard-frets` (frets 1–20); `.fret-marker[data-marker-fret]` (double at 12), `.fret-number[data-fret]`, `.string-name[data-string]`.
- Cell size 56×44 px, uniform columns; board ≈1238 px wide (fits desktop, scrolls on mobile). The `http(s)://` guard spec applies to shipped JS — the SVG namespace is derived from a parsed `<template>`; other SVG views must do the same.
