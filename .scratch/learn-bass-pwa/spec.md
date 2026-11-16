# Learn Bass PWA — Specification

Status: ready-for-agent

## Problem Statement

A bass student deals with three disconnected representations of the same music: the fretboard under their fingers, the bass-clef staff in method books, and note names/frequencies in reference tables. Existing tools show one representation at a time — a fretboard diagram here, a notation app there — so the student never sees that one note lives in up to four places on the neck and in exactly one place on the staff, or that the staff writes it an octave above where it sounds. Most of these tools are also online-only, ad-heavy, or demand an app-store install and an account. The student wants one simple, free, installable page that works on their Android phone and their PC, shows the living correspondence between fretboard, staff, and note names, plays the note, and keeps working with no network.

## Solution

A single-screen, French-language PWA built as vanilla static files (no framework, no build step). Three synchronized, clickable views of the same musical model:

- a 4-string, 20-fret bass fretboard (SVG) — open strings included as fret 0;
- a bass-clef staff (SVG) with every pitch in the bass range as a clickable notehead;
- a filterable correspondence table listing each note with its frequency and all its (string, fret) positions.

Tapping/clicking any position in any view selects that exact pitch: every equivalent location highlights in all three views (primary equivalence = same note, same octave, same frequency), other octaves of the same note name receive a weaker secondary highlight, and the note plays through a synthesized Web Audio bass voice. The staff follows the bass convention (written one octave above the sounding pitch); names are French with sharps as the default spelling. After the first load the app works fully offline, and it installs from the browser URL on Android and desktop Chrome/Edge.

## User Stories

1. As a bass student, I want to tap any fret on any string, so that I immediately see and hear what note that place on the neck produces.
2. As a bass student, I want every other position of the exact same note to light up on the fretboard, so that I learn the neck's repeating layout.
3. As a bass student, I want the matching note to light up on the bass-clef staff when I tap a fret, so that I connect what I play with what I read.
4. As a bass student, I want to tap a note on the staff and see every fretboard position that produces it, so that I can find a written note on my instrument.
5. As a bass student, I want the note played each time I select it, so that I associate pitch, position, and notation by ear.
6. As a bass student, I want the correspondence table's row for my selected note to light up, so that I confirm its name, octave, frequency, and every position at a glance.
7. As a bass student, I want to tap a row in the correspondence table, so that I can locate on the fretboard and staff a note I was reading about.
8. As a bass student, I want notes of the same name in other octaves to receive a weaker, clearly different highlight, so that I perceive octave relationships without mistaking them for the exact note.
9. As a bass student, I want open strings shown as fret 0 alongside frets 1–20, so that the positions I play most are part of the same map.
10. As a bass student, I want the full range of a 4-string bass — from open Mi to the 20th fret of Sol — available, so that the whole instrument is covered, edge to edge.
11. As a bass student, I want note names in French (Do, Ré, Mi, Fa, Sol, La, Si) with their octave, so that the app speaks the language of my lessons.
12. As a bass student, I want accidental notes spelled with sharps by default, so that names stay consistent and predictable.
13. As a bass student, I want each note's exact frequency displayed, so that I can relate note names to tuning and physics (La4 = 440 Hz).
14. As a bass student, I want the staff to follow the bass convention — written one octave above the sounding pitch — so that what I see matches method books and standard notation.
15. As a bass student, I want the staff to display written names while the table displays sounding names, so that I see both conventions side by side without confusion.
16. As a bass student, I want high notes above the staff on ledger lines to stay readable and tappable, so that the top of the range is as usable as the middle.
17. As a bass student, I want to browse the full correspondence table — every note in the range with all its (string, fret) positions — so that I can study the neck without touching the graphics.
18. As a bass student, I want to filter the table by string, so that I can focus on the positions of one string.
19. As a bass student, I want to filter the table by note name, so that I can see every octave of one pitch class and where each lives.
20. As a bass student, I want to combine the string and note-name filters, so that I can answer precise questions like "where is Ré♯ on the Sol string?"
21. As a bass student, I want tapping the same note again to replay it, so that repeated listening costs one extra tap.
22. As a bass student, I want fast repeated taps on different notes to always play the latest one cleanly, so that exploring feels instant with no sound pile-up.
23. As a bass student, I want a volume slider, so that I can adapt to my environment.
24. As a bass student, I want a mute toggle, so that I can explore silently in public.
25. As a bass student, I want my volume and mute choice remembered between sessions, so that I don't reset it every time.
26. As a bass student on Android, I want fret cells and staff noteheads big enough to tap with a thumb, so that I never mis-tap on a phone.
27. As a bass student on Android, I want the fretboard to scroll horizontally with the open-string end always visible, so that I keep my bearings while exploring high frets.
28. As a bass student on Android, I want horizontally scrollable views to bring my selection into view without moving the page vertically, so that I can keep my place while exploring.
29. As a bass student on PC, I want the whole fretboard, staff, and table laid out together without scrolling between them, so that I can compare representations in one glance.
30. As a bass student on PC, I want mouse clicks to behave exactly like taps on the phone, so that the app works the same everywhere.
31. As a bass student on Android, I want to install the app from the browser onto my home screen, so that it opens full-screen like a native app.
32. As a bass student on PC, I want to install the app from Chrome or Edge, so that it gets its own window and taskbar entry.
33. As a bass student, I want the app to work fully offline once loaded, so that I can practice in a basement, on a plane, or with flaky data.
34. As a bass student, I want the app to load fast with no account and no data collection, so that I can just use it.
35. As a returning student, I want a discreet notice when a new version is available with a one-tap reload, so that I stay current without losing my place.
36. As a bass teacher, I want the three synchronized views projectable in a desktop browser, so that I can demonstrate note equivalence during a lesson.
37. As a Firefox desktop user, I want full functionality in a tab including offline, so that I am not blocked even though Firefox cannot install PWAs.

## Implementation Decisions

Vocabulary used throughout (from the wayfinder map): a **position** is a (string, fret) pair; the **sounding pitch** is the note actually heard; the **written pitch** is what appears on the staff (bass convention: one octave above sounding); **primary equivalence** is exact pitch (same note, same octave, same frequency); the **secondary highlight** marks other octaves of the same note name.

1. **Stack and delivery.** Vanilla HTML/CSS/JS as ES modules; no framework, no build step, no runtime dependencies, system font stack, no external assets of any kind (audio is synthesized). Served as static files over HTTPS (localhost for development). All URLs are relative so the app works on any static host and under any base path — the concrete host and URL are deliberately undecided.
2. **Language and formatting.** The UI is French: solfège note names with a scientific octave digit (Mi1, La1, Ré2, Sol2), sharps written with ♯ (Fa♯1), frequencies with one decimal and a French decimal comma (41,2 Hz), French labels for strings, filters, and controls. The manifest carries a French working title; final branding and icons are deferred (placeholder icons suffice for installability).
3. **Musical model — single source of truth.** One pure module owns all musical rules and derives everything else; no view owns musical math. Constants: standard tuning Mi1–La1–Ré2–Sol2 (MIDI 28, 33, 38, 43), frets 0–20 per string (84 positions), equal temperament, La4 = 440 Hz. The frequency of MIDI number m is 440 × 2^((m−69)/12) Hz. Derived: the 36 distinct sounding pitches from Mi1 (41,2 Hz) to Ré♯4; each position's pitch; each pitch's positions (up to four — e.g. Do3 sits at Mi·20, La·15, Ré·10, Sol·5); French name and octave; written pitch = sounding pitch + one octave (MIDI + 12), giving a written range of Mi2 to Ré♯5; staff placement (staff step and ledger-line count). Semitone arithmetic uses integers internally; the MIDI number is the pitch identity across the whole app.
4. **Selection model.** One piece of app-level state: the currently selected sounding pitch (or none). Every interaction — fretboard cell, staff notehead, table row — resolves to a pitch through the model, updates the state, and the state fans out to the three views and the audio module. Selecting the already-selected pitch replays the tone and changes nothing else. The selection does not persist across reloads.
5. **Highlight semantics.** Primary tier: every location of the exact pitch — all its fretboard positions, its staff notehead, its table row. Secondary tier: locations of the same pitch class in other octaves, in the same three views, with a visually weaker treatment. The behavior is fixed here; the exact visual treatment of the secondary tier is validated during implementation.
6. **Fretboard view.** Horizontal SVG, Mi string at the bottom, uniform-width columns (not realistic fret spacing) for consistent touch targets: column 0 is the open-string column at the nut, then frets 1–20. Fret markers at 3, 5, 7, 9, 12 (double), 15, 17, 19; fret numbers below; string names at the nut. Cells are blank by default; highlighted cells display the note name (full style on primary, muted on secondary). The whole cell is the pointer target, sized at roughly 44 px minimum on touch. On narrow screens the board scrolls horizontally with the nut column pinned, and auto-scrolls to keep the selection visible.
7. **Staff view.** A single horizontal bass-clef staff strip (SVG): one notehead per written pitch — 36 noteheads, chromatic, low to high, uniform spacing — with a ♯ accidental left of each sharp notehead, ledger lines as needed (from one line below the staff to five above), and a small written-name label (e.g. Mi2) under each notehead. Each notehead has an enlarged invisible hit area. The strip scrolls horizontally on narrow screens and auto-scrolls to the selection.
8. **Correspondence table.** One row per distinct sounding pitch (36 rows, ascending). Columns: note name + octave, frequency, and positions as compact "Corde·case" chips (e.g. Mi·12, La·7, Ré·2). The whole row is one click target selecting the pitch. Two filters — string and note name — combine with AND logic; the active selection is highlighted within whatever filtered view is showing. Default is unfiltered.
9. **Audio.** One shared AudioContext, created lazily and resumed on the first user gesture (autoplay policy, verified in the constraints research). A monophonic synthesized plucked-bass voice — an oscillator blend through a lowpass filter, fast attack, exponential decay under about a second — tuned to the exact frequency of the selection; a new selection immediately cuts the previous tone (last click wins). No samples, no external audio assets. The exact recipe is tuned by ear during implementation within these constraints. Controls live in the header: a volume slider and a mute toggle, persisted in localStorage. No stop button — the short decay plus last-click-wins make one unnecessary.
10. **Layout and responsiveness.** Header (title + audio controls) → fretboard → staff → table. On wide screens the staff and table sit side by side; on narrow screens all sections stack in that order, each scrollable as needed. Pointer events unify click and tap; no separate touch code path.
11. **DOM contract.** Every interactive element carries semantic data attributes and French aria-labels identifying what it is (string + fret for cells, written pitch for noteheads, sounding pitch for rows). This is part of the shipped accessibility surface, not a test hook.
12. **PWA and offline.** Manifest with French name and short_name, 192 px and 512 px icons, relative start_url, display standalone, theme colors. A service worker precaches the complete app shell (HTML, CSS, JS modules, manifest, icons) on first load, serves cache-first for same-origin GETs, uses a versioned cache name, and cleans up old caches on activation. When a new version arrives it activates and shows a discreet French "reload to update" notice with a one-tap reload. After the first load the app is fully functional offline.
13. **Browser support.** Chrome and Edge desktop (installable), Chrome on Android (installable as a WebAPK), Firefox desktop (fully functional in a tab including offline; not installable — a platform limitation, not an app defect), Safari desktop (Add to Dock). The gesture-gated AudioContext satisfies the autoplay policies of all of them.

## Testing Decisions

- **One automated seam: real-browser E2E with Playwright**, kept as a dev-only dependency so the shipped app remains pure static files with no build. A static file server serves the app to the tests. Two viewports: a desktop Chromium viewport and a touch-emulated mobile viewport (a phone device descriptor). This is the repo's first test suite — it sets the pattern, and Playwright artifacts stay out of the precached app shell.
- **What makes a good test here:** assert only external behavior — what a user sees, taps, and hears — by driving real pointer/touch events and reading the DOM through the accessibility contract (decision 11). Never import internal modules, never call test-only APIs, never assert styling internals beyond the two highlight tiers' presence. Where audio must be observed, instrument the standard web APIs from outside the page (wrap the AudioContext constructor before app load to observe creation, resume, and scheduled oscillator frequencies) rather than adding app-side hooks.
- **Coverage through this seam:**
  - Musical model, exhaustively, via the rendered table: all 36 rows with names, octaves, frequencies, and full position sets — including both range ends (Mi1 at Mi·0, Ré♯4 at Sol·20), fret-0 positions, sharp-only spellings, and the four-position notes such as Do3.
  - Notation octave via the staff labels: every staff label equals the corresponding sounding name raised one octave.
  - Synchronization in all three directions: fretboard tap → staff and table highlights; staff tap → fretboard and table; row tap → fretboard and staff; primary and secondary tiers asserted each time.
  - Selection semantics: a second tap on the same selection replays the tone; each selection schedules an oscillator at the exact frequency of the selected pitch; a new selection cuts the previous tone.
  - Audio gating: no AudioContext creation or activity before the first user gesture; context created and running after.
  - Offline: after the first load, block all network requests and reload — the app is still fully interactive.
  - Updates: serve a bumped service-worker version — the reload notice appears, and after reload the new version is active.
  - Ergonomics: on the mobile viewport, tap targets meet the minimum size, taps land on the intended cell or notehead, the fretboard and staff scroll horizontally to their selection, and selecting a note does not move the page vertically.
- **Modules tested:** all of them, through the seam — the musical model via the table and staff projections, the views via interaction, the audio module via external instrumentation, the service worker via the offline and update scenarios.
- **Manual acceptance checklist (not automatable here):** the bass tone's character by ear; readability of the staff's extreme ledger lines and of the secondary highlight on a physical Android device; the actual install flows on Android (home screen / WebAPK) and on desktop Chrome/Edge.

## Out of Scope

- User accounts, backend, synchronization, analytics, or any data collection.
- Lessons, exercises, sheet-music playback, or gamification.
- Tuner, microphone input, or note recognition.
- Alternate tunings; five- and six-string basses; any instrument other than a four-string bass.
- Realistic sampled audio or external audio assets.
- App-store distribution (Capacitor / Trusted Web Activity wrappers) — installation from the browser URL only.
- Flat (♭) spellings and double accidentals — sharps only.
- Left-handed fretboard orientation.
- Full keyboard navigation and a dedicated screen-reader mode (beyond the basic semantic attributes of decision 11).
- Localization to any language other than French.
- Final visual identity, icon design, and the definitive app name (working placeholder only).
- Persisting the note selection across sessions (only audio preferences persist).

## Further Notes

- The two known design risks are staff readability at the top ledger lines (written Ré♯5 sits five ledger lines above the staff) and the pedagogical value/look of the secondary octave highlight. This spec fixes their behavior; the implementation validates their ergonomics with a quick in-repo prototype before polishing — absorbing the wayfinder map's staff/responsive prototype ticket as an implementation-time validation step rather than a separate decision.
- The deployment host, URL, and base path stay open on purpose; the relative-URL constraint keeps the app portable to any static HTTPS host. Local development on localhost is a secure context and needs nothing extra.
- The synthesized tone recipe is deliberately a tune-by-ear decision inside the constraints fixed in decision 9 (gesture-gated, monophonic, pluck-like, under a second, no samples).
- This spec absorbs the open wayfinder tickets 02–07 (technology/distribution, musical model, sound, architecture/offline, tests/acceptance); the map's "Not yet specified" items remain deferred here deliberately.
- Firefox desktop users get full functionality including offline in a tab; the install limitation is Firefox's, and the spec documents it rather than working around it.
