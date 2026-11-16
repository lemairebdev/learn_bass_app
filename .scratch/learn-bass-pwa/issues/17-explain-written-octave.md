# 17 — Explain the written octave on the staff

Type: task
Status: resolved

## Goal

Make the bass-notation convention visible: staff pitches are written one octave above sounding pitch, while the table and fretboard show sounding names.

## Done when

- The staff section includes a concise French explanation with a Ré4 écrit → Ré3 sonore example.
- A Playwright test verifies the explanation is visible.
- Existing notation and synchronized pitch behavior remain unchanged.

## Comments

- **Resolved 2026-11-16.** Added the convention note beneath the staff heading, styled it as secondary explanatory text, and added a browser test asserting the octave convention and the Ré4/Ré3 example.
