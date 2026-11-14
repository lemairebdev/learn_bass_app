# 08 — Scaffold the app shell, PWA assets, and Playwright harness

Type: task
Status: resolved

## Goal

Establish the repo structure, the French app shell, the PWA manifest with placeholder icons, and the Playwright E2E harness (static server + desktop and touch-mobile viewports) that every later ticket builds on.

## Spec pointers

Read [the spec](../spec.md) first — this ticket covers:
- Implementation Decision 1 — vanilla ES modules, no framework, no build step, no runtime dependencies, no external assets, all URLs relative.
- Implementation Decision 2 — French UI, a French working title, placeholder icons.
- Implementation Decision 10 — layout: header (title + audio controls) → fretboard → staff → table; wide screens: staff and table side by side; narrow screens: stacked in that order.
- Implementation Decision 12 — the manifest part only. Do **not** create the service worker (ticket 14 owns it).
- Testing Decisions — Playwright kept as a dev-only dependency; a static file server serves the app to the tests; two viewports: desktop Chromium and a touch-emulated phone device descriptor.
- User stories 29, 34 (desktop one-glance layout; fast load, no account).

## Deliverables

Repo layout — later tickets depend on these exact paths:

- `index.html` — French shell: a `<header>` with the working title and an empty controls container (ticket 13 fills it), then three sections in order with mount points: fretboard, staff (portée), correspondence table (tableau). Loads `js/app.js` as an ES module. Every URL relative.
- `styles.css` — responsive layout per decision 10, system font stack, French labels.
- `manifest.webmanifest` — French `name` and `short_name`, 192 px and 512 px icons, relative `start_url` (`./`), `display: standalone`, theme and background colors.
- `icons/icon-192.png` and `icons/icon-512.png` — valid placeholder PNGs at exactly those sizes, generated locally (no external assets).
- `js/app.js` — the bootstrap module; later tickets extend it. A stub is enough here.
- `package.json` (+ lockfile) — dev-only: `@playwright/test` and `http-server` (or an equivalent zero-config static server). Add an npm `test` script. No runtime dependencies; the shipped app stays pure static files.
- `playwright.config.js` — two projects: `desktop` (Chromium, wide viewport) and `mobile` (Chromium with a Playwright phone device descriptor: touch, isMobile). `webServer` serving the repo root on localhost with caching disabled; honor `process.env.TEST_PORT` (default 4173) so parallel worktrees don't collide; `reuseExistingServer: false`.
- `tests/app-shell.spec.js` — the app loads with no console errors and no failed or cross-origin requests on both viewports; the four sections exist in the decision-10 order; the header shows the French title; the manifest is fetched, parses, and has the fields above with a relative `start_url`; on the narrow viewport the sections stack and on the wide viewport the staff and table sit side by side (assert via bounding boxes).
- `.gitignore` — `node_modules/`, `test-results/`, `playwright-report/`, `*.log`.
- `README.md` — how to run the app locally, how to run the tests (`npm install`, `npx playwright install chromium`, `npm test`), the browser-support matrix from decision 13, the file-layout conventions above, and the `TEST_PORT` convention.

## Done when

- From a clean checkout: `npm install && npx playwright install chromium && npm test` passes.
- The shell renders the French UI in both viewports with decision-10 responsive behavior.
- No runtime dependency, no build step, no absolute URL in any shipped file.

## Comments

- **Resolved 2026-11-14.** Implemented on branch `ticket/08-scaffold-shell-harness`, merged to `integration/learn-bass-pwa` as `d49ed59`. Suite: 10 passed, 0 failed (5 specs × desktop/mobile). Decisions recorded by the implementer: working title « Apprendre la basse » / short_name « Basse »; `http-server` as the dev server; desktop viewport 1440×900, mobile = Pixel 7 descriptor; English identifiers in code, French surface text; placeholder quarter-note icons; environment note — this machine lacks Chromium system libs, so `playwright.config.js` prepends `~/.cache/playwright-libs` via `LD_LIBRARY_PATH` when present (one-time setup documented in README). A guard spec now enforces decision 1 (no absolute URLs, no bare imports) across shipped files forever.
