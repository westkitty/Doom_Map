# Next Doom Map continuation

- **Branch:** `arena/01a0e93e-doom-map`
- **PR:** https://github.com/westkitty/Doom_Map/pull/1
- **Current phase:** Phase 2 complete. Phase 3 (Scenario & Time Core) next.
- **Verified:** clean npm ci; strict typecheck; 42 unit and 20 local browser tests;
  production /Doom_Map/ build; WGS84/ENU/rebasing, picking/navigation/quality,
  persistent camera bookmark, low-LOD Natural Earth, bounded regional scheduler,
  version-keyed IndexedDB persistent provider cache (`doom-map-provider-cache`),
  local 3D building extrusions (<15 km altitude) with ENU triangulation, roof lines,
  and building truth contract inspector.
- **Known failures:** two moderate dev-tool audit findings; production audit has zero findings.
- **Next incomplete requirement:** Phase 3 — Scenario schema, seeded PRNG, deterministic scenario clock with play/pause/scrub/speed/seek, chapter markers, and IndexedDB scenario storage.
- **Files to create/modify:** `src/core/scenario/`, `src/core/time/`, `tests/scenario.test.ts`, `tests/browser/time.spec.ts`.
- **Validation:** `npm run check`, browser tests via `LD_LIBRARY_PATH=/tmp/chromium-libs/lib CHROMIUM_PATH=/tmp/chromium npm run test:browser`.
