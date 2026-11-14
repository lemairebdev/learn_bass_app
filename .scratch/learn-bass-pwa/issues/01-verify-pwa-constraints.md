# Verify PWA, Web Audio, and wrapper constraints on Android/PC

Type: research
Status: resolved

## Question

What are the current constraints for installing and running a vanilla PWA on Android and PC, including offline support, HTTPS requirements, and audio playback after a user gesture? How do Capacitor and Flutter compare for this specific use case when simplicity is the only criterion?

## Answer

Researched November 2026 against Chrome for Developers, web.dev, MDN, and 2026 framework comparisons.

### Installability

- Current Chrome install criteria: served over HTTPS; a web app manifest with `name` or `short_name`, 192px and 512px icons, `start_url`, a `display` of `standalone`/`fullscreen`/`minimal-ui`/`window-controls-overlay`, and no `prefer_related_applications: true`; plus engagement heuristics (one prior tap/click and 30s of viewing). A service worker with a fetch handler is no longer required for installation (requirement dropped in Chrome 108 on Android / 112 on desktop), but without one an installed app that goes offline shows the browser's default offline page instead of the app. Users can also install any site manually from the browser menu. Sources: [Install criteria](https://web.dev/articles/install-criteria), [Revisiting Chrome's installability criteria](https://developer.chrome.com/blog/update-install-criteria), [Installability criteria notes](https://openpwa.net/reference/installation/installability-criteria).
- Android: Chrome on devices with Google Mobile Services installs a PWA as a WebAPK that Google mints and signs — no packaging or signing on our side; the app then appears in the launcher and in Settings > Apps. Browsers without a minting server (Firefox, Edge, Brave, Samsung Internet on non-Samsung devices) fall back to a home-screen shortcut. Source: [web.dev — Installation](https://web.dev/learn/pwa/installation).
- Desktop (PC): Chrome and Edge on Windows, Linux, macOS, and ChromeOS fully support install (install badge in the address bar; only `standalone` and `minimal-ui` display modes). Safari 17+ on macOS offers "Add to Dock" for any site, manifest or not. Desktop Firefox has no manifest-driven install; since Firefox 143 (Sept 2025) it can only pin a site as a Windows taskbar web app, and macOS/Linux need a third-party extension — the app still works in a Firefox tab, it just can't be installed as an app. Sources: [web.dev — Installation](https://web.dev/learn/pwa/installation), [openpwa — Desktop](https://openpwa.net/reference/platforms/desktop).

### Offline support

- Full offline after first load is delivered by a service worker plus the Cache API, and behaves the same in a browser tab and when installed. Both are supported in all current major browsers (Chrome, Edge, Firefox, Safari, Samsung Internet, Brave). Source: [MDN — Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API).

### HTTPS / secure contexts

- Service workers (and Cache Storage) require a secure context: HTTPS in production; `localhost`, `127.0.0.1`, and `::1` count as secure for local development. Source: [MDN — Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API).
- The core Web Audio API (`AudioContext`, `OscillatorNode`, `GainNode`, `BiquadFilterNode`, ...) is not secure-context-gated; only peripheral members such as `setSinkId`/`sinkId` and `AudioWorklet` are. In practice the app is HTTPS anyway because of the service worker, and oscillators/gain are all we need. Source: [MDN — AudioContext](https://developer.mozilla.org/en-US/docs/Web/API/AudioContext).

### Audio after a user gesture

- Chrome has applied its autoplay policy to Web Audio since Chrome 71: an `AudioContext` created before a user gesture starts in the `suspended` state, and you must call `resume()` after the first gesture (or create the context lazily on first interaction). Audible autoplay without a gesture is otherwise allowed only if the user has previously interacted with the domain, has a high Media Engagement Index (desktop), or has installed the PWA / added it to the home screen. Sources: [Chrome autoplay policy](https://developer.chrome.com/blog/autoplay), [MDN autoplay guide](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay).
- Firefox behaves the same by default (`media.autoplay.block-webaudio` is true: audio contexts play only after user activation). Source: [MDN autoplay guide](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay).
- For this app the constraint is trivially satisfied: every sound is triggered by tapping a note, fret, or table row — i.e. by a user gesture. The pattern is one shared `AudioContext`, created or resumed on the first tap.

### Capacitor vs Flutter (simplicity as the only criterion)

- Capacitor wraps an existing web app (vanilla HTML/CSS/JS is fine) in a native Android/iOS WebView and exposes device APIs through plugins; wrapping an existing web app takes weeks with no rewrite. But it adds a native build toolchain (Android SDK/Gradle, Xcode), store submission and review (stores expect more than a "website in a wrapper"), and gains nothing when no native device API is needed — this app needs none (no camera, push, biometrics, or file system). Sources: [Kanopy Labs 2026 comparison](https://kanopylabs.com/blog/capacitor-vs-react-native-vs-flutter), [daniotech — how to choose](https://daniotech.com/blog/flutter-vs-react-native-vs-capacitor).
- Flutter requires a full rewrite in Dart with its own rendering engine (Impeller) and toolchain, which pays off only for animation-heavy, custom-UI apps. A fretboard/reference app playing one-shot synthesized tones is far below the performance class where the WebView ceiling matters (Kanopy: Capacitor handles dashboards, readers, and form-heavy utilities "without breaking a sweat"). Source: [Kanopy Labs 2026 comparison](https://kanopylabs.com/blog/capacitor-vs-react-native-vs-flutter).
- Verdict: with simplicity as the sole criterion the vanilla PWA remains the right choice — one codebase, no build pipeline, no store, installable by URL on Android (WebAPK) and desktop Chrome/Edge, offline via service worker. If Play Store distribution ever becomes a hard requirement, the simplest escalations are Capacitor or a Trusted Web Activity via PWABuilder (both reuse the PWA unchanged); Flutter is the most complex option for this use case and adds no benefit.

### Net constraints for the spec

1. Deploy over HTTPS on any static host; localhost for development.
2. Manifest with `name`, 192px and 512px icons, `start_url`, `display: standalone`.
3. Service worker caching on first load for offline (required for offline even though not for installability).
4. Create/resume the `AudioContext` on the first user gesture; all sounds are gesture-triggered anyway.
5. Firefox desktop users can use the app in a tab with full offline behaviour; they just cannot install it as an app.
