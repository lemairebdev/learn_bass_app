# Prototype the chromatic staff and responsive screen

Type: prototype
Status: resolved

## Question

How should every pitch in the bass range be made clickable on a bass-clef staff without becoming unreadable? The prototype must cover ledger lines, sharps, touch target sizes, the two highlight levels, the fretboard/staff/table layout on PC and mobile, and how French note names and octaves are displayed.

## Answer

Absorbed by the specification as an implementation-time validation step rather than a separate prototype decision: spec Further Notes (first paragraph), with Implementation Decision 5 (secondary-highlight behavior is fixed; its visual treatment is validated during implementation) and Decision 7 (staff geometry: 36 chromatic noteheads, ledger lines from one below to five above, written-name labels, enlarged hit areas). The validation is carried by implementation tickets [11 (staff readability at the extreme ledger lines)](11-staff-view.md) and [12 (secondary-highlight treatment)](12-selection-sync-highlights.md).
