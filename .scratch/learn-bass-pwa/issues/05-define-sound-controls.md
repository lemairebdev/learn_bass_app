# Define the synthesized sound and its controls

Type: grilling
Status: resolved

## Question

What character should the synthesized bass sound have, including envelope and duration? How should rapid clicks behave? Are volume, mute, and stop controls needed while keeping the interface minimal?

## Answer

Decided in the spec: Implementation Decision 9 — one shared AudioContext, created lazily and resumed on the first user gesture (autoplay policy verified in ticket 01); a monophonic synthesized plucked-bass voice (an oscillator blend through a lowpass filter, fast attack, exponential decay under about a second) tuned to the exact frequency of the selection; a new selection immediately cuts the previous tone (last click wins); no stop button. Controls: a volume slider and a mute toggle in the header, persisted in localStorage. The exact recipe is tuned by ear during implementation within those constraints. Implementation ticket: [13-audio-controls.md](13-audio-controls.md).
