# Learn Bass PWA — Wayfinder map

## Destination

Produce a complete, directly implementable specification for a bass-learning PWA: ergonomics, musical rules, architecture, audio, offline behaviour, distribution, and acceptance criteria.

## Notes

- Simplicity is the priority across Android and PC.
- Initial recommendation stays a vanilla HTML/CSS/JS PWA; another stack is only chosen if it makes delivery or use simpler.
- Primary equivalence is exact pitch: same note, same octave, same frequency.
- Other octaves of the same pitch class receive a clearly weaker secondary highlight; the visual treatment was validated during implementation.
- Staff notation follows the bass convention: written notes sit one octave above the sounding pitch.
- Sharps are the default accidental spelling.
- The correspondence table is filtered and clickable, synchronized with the fretboard and staff.
- Bass sound is synthesized with Web Audio, with no external samples.
- The app must work fully offline after first load.
- Status: the specification is complete and marked ready-for-agent (`spec.md`). It absorbs wayfinder tickets 02–07; implementation tickets 08–15 are complete on `integration/learn-bass-pwa`. Final review fixes are merged; physical install acceptance remains manual.

## Decisions so far

- [Verify PWA, Web Audio, and wrapper constraints on Android/PC](issues/01-verify-pwa-constraints.md): Vanilla PWA is viable and simplest — HTTPS + manifest installs on Android (WebAPK) and desktop Chrome/Edge, a service worker is still required for offline, and the AudioContext must be created/resumed after the first user gesture; Capacitor only if store distribution is ever required, Flutter rejected.
- [Choose technology and distribution mode](issues/02-choose-technology-distribution.md): Vanilla PWA installable from the browser URL only; app-store distribution out of scope. Decided in the [spec](spec.md), Implementation Decisions 1, 12, 13.
- [Specify the musical model and correspondences](issues/04-specify-musical-model.md): Tuning Mi1–La1–Ré2–Sol2 (MIDI 28/33/38/43), frets 0–20, 84 positions, 36 sounding pitches Mi1–Ré♯4, sharps only, written = sounding + 12, second click on the same pitch replays. Spec Implementation Decisions 3–4.
- [Define the synthesized sound and its controls](issues/05-define-sound-controls.md): Gesture-gated shared AudioContext, monophonic pluck under ~1 s, last click wins, no stop button; volume + mute persisted in localStorage. Spec Implementation Decision 9.
- [Design architecture, offline behaviour, and updates](issues/06-design-architecture-offline.md): Pure model module + single selection state fanning out to three views and audio; service-worker precache with versioned cache name and reload-to-update notice. Spec Implementation Decisions 3, 4, 10–12.
- [Define tests and acceptance criteria](issues/07-define-tests-acceptance.md): One Playwright E2E seam, two viewports, external-behavior-only assertions with Web Audio instrumented from outside the page; plus a manual acceptance checklist. Spec Testing Decisions.
- [Prototype the chromatic staff and responsive screen](issues/03-prototype-staff-responsive.md): Absorbed into the spec as implementation-time validation (Further Notes); staff extremes and the secondary-highlight treatment were validated in tickets 11/12, and desktop fit plus the visible bass clef were resolved in the final review fixes.

## Not yet specified

- Concrete deployment: host, URL, and base path — deliberately left open by the spec; relative URLs keep the app portable to any static HTTPS host.
- Visual identity and icons — deferred; placeholder icons ship first (spec Implementation Decision 2).

## Out of scope

- User accounts, backend, or synchronization.
- Lessons, exercises, sheet music, or gamification.
- Tuner, microphone input, or note recognition.
- Alternate tunings and five- or six-string basses.
- Realistic audio samples.
- Instruments other than a four-string bass.
