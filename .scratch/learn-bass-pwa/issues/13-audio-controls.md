# 13 — Audio module and header controls

Type: task
Status: open
Blocked by: 12

## Goal

The synthesized bass voice and its controls: one shared, gesture-gated AudioContext; a monophonic pluck at the exact frequency of the selection; last click wins; volume slider and mute toggle persisted in localStorage.

## Spec pointers

- Implementation Decision 9 — audio (read fully). The recipe is yours to tune by ear within the fixed constraints: gesture-gated, monophonic, pluck-like, under ~1 s decay, no samples.
- Implementation Decision 4 + ticket 12's play-request hook; same-pitch reselect = replay.
- User stories 5, 21–25.
- Testing Decisions — where audio must be observed, instrument the standard web APIs from outside the page (wrap the `AudioContext` constructor before app load to observe creation, resume, and scheduled oscillator frequencies) rather than adding app-side hooks.

## Deliverables

- `js/audio.js` — a lazily created shared AudioContext, created and resumed on the first user gesture; a monophonic plucked-bass voice (an oscillator blend through a lowpass filter, fast attack, exponential decay under about a second) tuned to the exact frequency from the model; a new selection immediately cuts the previous tone; no stop button.
- Header controls in the header's controls container: a French-labeled volume slider and a mute toggle, with aria attributes; both persisted in localStorage and restored on load; while muted (or after reload) selecting notes still highlights normally.
- Wire into ticket 12's play-request hook.
- `tests/audio.spec.js` — with an init script wrapping `AudioContext` before app load: no AudioContext created and no audio activity before the first user gesture; after the first tap the context exists and is `running`; each selection schedules an oscillator at the exact frequency of the selected pitch (e.g. Mi1 → 41,2 Hz, Sol2 → 98,0 Hz); a second tap on the same note schedules another tone; a new selection cuts the previous tone (last click wins); the volume slider changes output gain; mute silences output; both settings persist across a reload.

## Done when

- The suite above passes on both viewports together with the existing suite.
- If another implementer may be running tests concurrently, run yours with `TEST_PORT=4213 npm test`.
