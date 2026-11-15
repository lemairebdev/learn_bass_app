# 14 — Service worker: offline and update flow

Type: task
Status: resolved
Blocked by: 13

## Goal

Offline-first delivery: the service worker precaches the complete app shell and serves it cache-first; when a new version arrives it activates and shows the discreet French reload-to-update notice with one-tap reload.

## Spec pointers

- Implementation Decision 12 — PWA and offline (read fully): precache the complete app shell (HTML, CSS, JS modules, manifest, icons) on first load; cache-first for same-origin GETs; versioned cache name; old-cache cleanup on activation; discreet French notice with one-tap reload; after the first load the app is fully functional offline.
- User stories 33, 35, 37.
- Testing Decisions — offline and updates coverage; Playwright artifacts stay out of the precached app shell.
- Blocked by 13 so that the precache list covers the final app-shell file set.

## Deliverables

- `sw.js` at the repo root — versioned cache name; install: precache the complete app shell; fetch: cache-first for same-origin GETs; activate: delete old caches and notify the page that a new version is active.
- Registration from the app at load time (relative URL).
- The reload-to-update notice — discreet, French (e.g. « Une nouvelle version est disponible — Recharger »), one-tap reload, shown only when a new version has actually installed.
- `tests/offline.spec.js` — after one online load, block all network (context offline or route-abort everything) and reload: the app still renders and is fully interactive (select a note: highlights appear, a tone is scheduled).
- `tests/update.spec.js` — serve a bumped `sw.js` via route interception (rewritten version), let the new worker install: the notice appears; tapping it reloads and the new version is active — assert an externally real marker (e.g. a version the notice or app displays, or the active cache name), never a test-only API.
- README — add the human-verified install checklist (Chrome on Android home screen / WebAPK; desktop Chrome/Edge install; Firefox tab-only with offline) as manual acceptance items.

## Done when

- The suite above passes together with the existing suite.
- If another implementer may be running tests concurrently, run yours with `TEST_PORT=4214 npm test`.

## Comments

- **Resolved 2026-11-15.** Implemented on branch `ticket/14-service-worker-offline`, merged to `integration/learn-bass-pwa` as `bb60c70`. Full suite: 88 passed, 4 expected skips, 0 failed.
- `sw.js` precaches the full shell, including `js/audio.js`, uses a versioned cache, cache-first for same-origin GET requests, and removes obsolete app caches at activation. The update flow notifies the page that a new worker is ready, waits for the user's one-tap « Recharger » acceptance, then activates and reloads.
- Offline E2E confirms the app reloads and remains interactive with network disabled. Update E2E confirms the notice, reload, new active cache, and removal of the previous cache.
- README contains the manual install checklist for Chrome Android/WebAPK, desktop Chrome/Edge, and Firefox offline tab use.
