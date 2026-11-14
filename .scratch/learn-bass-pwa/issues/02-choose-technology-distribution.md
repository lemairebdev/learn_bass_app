# Choose technology and distribution mode

Type: grilling
Status: resolved

Blocked by: 01

## Question

Should the app stay a vanilla PWA installable from an HTTPS URL, or should it be wrapped as an APK or built with another stack? Is app-store distribution expected, or is an installable URL enough?

## Answer

Decided in the specification this grilling fed into: [`.scratch/learn-bass-pwa/spec.md`](../spec.md) — stay a vanilla PWA, installable from the browser URL only. Implementation Decision 1 (vanilla HTML/CSS/JS as ES modules, no framework, no build step, no runtime dependencies, all URLs relative so any static HTTPS host works), Decision 12 (manifest + service worker), Decision 13 (browser matrix: Chrome/Edge desktop and Chrome on Android installable; Firefox desktop fully functional in a tab but not installable — a platform limitation, not an app defect). App-store distribution and native wrappers are explicitly out of scope (spec, Out of Scope).
