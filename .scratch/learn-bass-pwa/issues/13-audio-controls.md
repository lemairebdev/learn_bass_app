# 13 — Audio module and header controls

Type: task
Status: resolved
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

## Comments

- **Resolved 2026-11-15.** Implemented on branch `ticket/13-audio-controls`, merged to `integration/learn-bass-pwa` as `94861b4`. Full suite: 84 passed, 4 expected skips, 0 failed.
- Public API: `mountAudio(controlsMount)` is the sole export of `js/audio.js`. It restores preferences, renders the header controls, and subscribes to the shared `selection.onPlayRequest` hook. It imports `midiToFrequency` from the musical model.
- Controls: range input `data-audio-control=\"volume\"`, aria-label `Volume`, 0–100 (default 80); button `data-audio-control=\"mute\"`, aria-label `Sourdine`, `aria-pressed`; localStorage keys `learn-bass.volume` and `learn-bass.mute`.
- Voice: lazy shared AudioContext on the first play request, oscillator blend through a lowpass, short pluck envelope (<1s), latest note cuts the previous; mute silences via the master gain while selection/highlighting continues.
- **Ticket 14 handoff:** include `js/audio.js` in the service-worker precache. The app shell scanner already picks up it and the audio specs; no other shell file was added by this ticket. Audio preferences are the only persisted app state.
- Timbre is provisional pending manual listening; default volume 80 and a 0–100 slider are implementation choices.
