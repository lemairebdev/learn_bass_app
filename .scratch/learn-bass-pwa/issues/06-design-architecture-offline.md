# Design architecture, offline behaviour, and updates

Type: grilling
Status: resolved

Blocked by: 02, 04, 05

## Question

What is the architecture? Define the single source of truth for notes, JS modules, SVG generation, manifest, icons, caching strategy, and behaviour when a new version is available.

## Answer

Decided in the spec: Implementation Decision 3 (one pure module owns all musical rules; no view owns musical math), Decision 4 (one app-level state — the selected sounding pitch — fanning out to the three views and the audio module), Decisions 10–11 (layout; DOM contract of data attributes and French aria-labels), Decision 12 (manifest; service worker precaching the complete app shell on first load, cache-first for same-origin GETs, versioned cache name, old-cache cleanup on activation, discreet French reload-to-update notice with one-tap reload). Tickets 02, 04, and 05 that this was blocked by are likewise resolved by the spec. Implementation tickets: [08-scaffold-shell-harness.md](08-scaffold-shell-harness.md) and [14-service-worker-offline.md](14-service-worker-offline.md).
