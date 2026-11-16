# 16 — Prevent vertical page scrolling on selection

Type: task
Status: resolved

## Goal

Keep the page at its current vertical position when a note is selected. Continue highlighting the selected table row and horizontally revealing off-screen fretboard/staff pitches in their own scrollers.

## Done when

- Selecting from the fretboard, staff, or table does not move the page vertically.
- The selected table row still receives its primary highlight.
- Selecting a row outside the viewport still works without automatically revealing it.
- Fretboard and staff horizontal auto-scroll behavior remains intact.
- Desktop and mobile Playwright suites pass.

## Comments

- **Resolved 2026-11-16.** Removed the table row's `scrollIntoView()` call, which also scrolled the document. Updated the mobile synchronization and ergonomics tests to assert the page's `scrollY` remains unchanged while the selected row is highlighted, including when the row is filtered and outside the viewport. The fretboard and staff continue scrolling only within their own horizontal scrollers.
