# Next Doom Map continuation

- **Remote implementation HEAD at handoff preparation:**
  `5dbe6a1e265508aa0305d90bb165b6fcc3ce9b57` on
  `arena/01a0e93e-doom-map`; subsequent handoff-only commit is identified by git.
  Remote main last fetched: `e2a2a86a7056a02617d3f5874c0987805b1ea300`.
  PR: https://github.com/westkitty/Doom_Map/pull/1
- **Current phase:** Phase 2 partial. Coastline streaming is not local terrain/buildings.
- **Verified:** clean npm ci; strict typecheck; 30 unit and 11 local browser tests;
  production /Doom_Map/ build; WGS84/ENU/rebasing, picking/navigation/quality,
  persistent camera bookmark, low-LOD Natural Earth, bounded regional scheduler,
  explicit failures/fallback, context recovery, emulated touch and short lifecycle.
  CI IDs/current observation are in OPERATIONAL_STATE.md.
- **Known failures:** two moderate dev-tool audit findings; attempted Vitest 4
  install hit npm resolver exception. Standard browser-download and public Pages
  domains are unreachable from sandbox. Production audit has no findings.
- **Unverified/absent:** physical devices/performance, long-session leaks,
  refined local globe/terrain/buildings, persistent provider cache, time/hazard/
  consequence engine, offline shell, native wrapper. Branch is not deployed:
  Pages environment allows main only. No branch-policy bypass was attempted.
- **First incomplete requirement:** bounded persistent provider cache, followed by
  a real local-detail terrain/building provider with source/coverage/fidelity.
- **Files:** `src/data/TileScheduler.ts`, `src/data/providers/types.ts`,
  `src/data/providers/NaturalEarth.ts`, `src/globe/RegionalGeography.ts`,
  `src/globe/GlobeApp.ts`, `src/core/bookmarks.ts` (existing IndexedDB example),
  `data/providers.json`, `THIRD_PARTY_DATA.md`, `tests/scheduler.test.ts`,
  `tests/browser/globe.spec.ts`.
- **Expected validation:** cache schema/version isolation, quota/failure/eviction,
  stale responses, offline reads explicitly labeled, bounded memory and GPU
  residency across region changes; then `npm ci && npm run check`, production
  browser tests and branch CI. Standard setup: `npx playwright install --with-deps
  chromium`. Existing local fallback command:
  `LD_LIBRARY_PATH=/tmp/chromium-libs/lib CHROMIUM_PATH=/tmp/chromium npm run test:browser`.
  Its extraction paths are ephemeral; details in docs/BROWSER_ACCEPTANCE.md.
- **Immediate next action:** fetch main without switching branches, read current
  state, confirm SHA/CI, then implement version-keyed bounded IndexedDB caching
  behind the DataProvider contract. Do not skip straight to hazard effects.
