# Doom Map — Operational State

<!-- operational-state:metadata
{
  "schema_version": 1,
  "project_id": "doom-map",
  "project_name": "Doom Map",
  "project_root": "westkitty/Doom_Map",
  "artifact_path": "",
  "state_revision": 12,
  "last_updated": "2026-09-28T18:49:00Z",
  "current_baseline": {
    "identity": "implementation commit 5dbe6a1e265508aa0305d90bb165b6fcc3ce9b57 on arena/01a0e93e-doom-map",
    "state": "current-baseline",
    "last_verified": "2026-09-28T18:49:00Z"
  },
  "scope_boundaries": [
    "Doom Map repository, web deployment, and native wrapper only",
    "Educational/civilian disaster simulation; no offensive targeting optimizer"
  ],
  "linked_parent_state": null
}
-->

## 1. Current authority and phase

**Active implementation; Phase 2 partially implemented. Not a complete simulator.**

- Repository: westkitty/Doom_Map; session branch: `arena/01a0e93e-doom-map`.
- Remote main at last fetch: `e2a2a86a7056a02617d3f5874c0987805b1ea300`.
- Latest implementation: `5dbe6a1e265508aa0305d90bb165b6fcc3ce9b57`, pushed with verified remote SHA parity.
- Pull request: https://github.com/westkitty/Doom_Map/pull/1
- Node 22.22.3/npm 10.9.8 Linux environment; no Mac/device assumptions.
- Phase 0 local/CI spine implemented; new Pages delivery awaits merge.
- Core Phase 1 navigation and low-LOD geography have browser evidence. Physical
  devices, refined local surface and long-session behavior are not fully verified.
- Phase 2 currently streams **coarse coastline tiles only**. No terrain/building
  detail, population, infrastructure, time engine or hazards have been implemented.

## 2. Active invariants

- **INV-001:** Three.js owns visible scene/globe/camera/VFX; no renderer replacement.
- **INV-002:** Scientific honesty: machine-readable source/version/fidelity,
  assumptions, uncertainty and limitations. Illustrative visuals are not science.
- **INV-003:** Global high detail streams by geographic LOD with bounded resources;
  never load worldwide buildings/terrain into the application.
- **INV-004:** Product requires >=40 genuinely runnable hazards; currently **zero**.
- **INV-005:** Future Tauri wrapper shares the web core; currently absent.
- **INV-006:** Educational/civilian consequences only; no targeting/harm optimization.

WGS84 geodetic/ECEF/ENU and render-relative coordinates remain distinct.
Authoritative geographic values use JS Float64 numbers, not GPU Float32 storage.
Time, hazards, consequence graph, providers, rendering, DOM and persistence have
separate ownership. IndexedDB owns persistent camera bookmarks so far.

## 3. Verified working behavior (scoped)

### Installation / build / evidence spine
- Pinned dependencies and committed lockfile; clean `npm ci` passes.
- Strict TypeScript, **30 unit tests**, production build pass locally.
- **11 Playwright browser tests** pass locally on Chromium 143/SwiftShader.
- CI and Pages workflows use npm ci, lockfile caching, type/unit/build/browser gates.
- Production and preview base `/Doom_Map/`; development remains `/`.
- Real production-path testing caught and repaired preview asset 404s.
- Current JS entry ~562 kB minified / 144 kB gzip, plus ~2 kB lazy geography chunk.
  Vite's >500 kB warning remains; this is not a final bundle/performance budget.

### Spatial / globe
- WGS84 forward/inverse conversion, ENU axes/inverse, render-relative offsets,
  and reference-ellipsoid picking pass fixtures including poles/antimeridian and
  surface/negative/orbital heights.
- Camera-relative rendering: control camera is ECEF; render camera is at zero;
  world rebases each frame. Regional meshes have separate local anchors.
- Browser-proven mouse orbit/right-pan/wheel, keyboard orbit/pan/zoom/reset/select,
  coordinate and double-click fly-to, user interruption, reduced-motion path.
- Tested coordinate fly-to reaches 100 m altitude with finite telemetry. It does
  **not** prove local terrain or building-scale visual fidelity.
- IndexedDB camera save/restore persists across reload.
- Ultra/High/Balanced/Low/Safe control DPR, atmosphere and grid. No nonexistent
  particle/building/post-processing budgets are claimed.
- WebGL loss/recovery, accessible unsupported-WebGL message, resize tested.
- Portrait touch drag/double tap and two-finger pinch tested via Chromium emulation.
  Multi-pointer gestures no longer accidentally select a location.
- Screenshots inspected: lit globe/grid/atmosphere and real Natural Earth outlines.

### Provenance / first streaming slice
- Versioned model/provider manifests validated in unit tests and at startup;
  Science panel exposes references, fidelity, assumptions and limitations.
- Immutable Natural Earth public-domain snapshot, license and hash fixtures.
  Global fallback is 138 kB; derived 72 coarse 30° cells add no geographic detail.
- Common typed DataProvider contract; priority/concurrency bounds, AbortController,
  timeout, stale-result rejection, retry/backoff, decoded CPU LRU/byte budgets,
  explicit degraded health and fallback.
- Regional requests at 200–3,000 km camera altitude: <=3 concurrent requests,
  <=9 desired GPU tiles, <=12 decoded tiles, <=2 MB decoded data.
- Four browser regional moves stay within tested bounds; returning to orbit
  unloads all regional GPU tiles. Provider HTTP 503 tests pass.
- Three synthetic pagehide/pageshow cycles dispose tracked geometries and restore
  equal scene counts. One Three.js texture counter remains after disposal; no
  assertion that all GPU memory is zero or that long sessions cannot leak.
- Runtime panel reports rolling frame statistics, draw calls, triangles,
  geometries/textures, request queue, decoded bytes and GPU tile residency.

See `docs/BROWSER_ACCEPTANCE.md` for reproduction and historical slice evidence.

## 4. CI / delivery evidence

- Historical main CI: 36447608037 (bootstrap).
- Historical Pages deployment: 36448035612; HTTP 200/title recorded before session.
- Branch CI successes: 36465030525 (browser spine), 36465293562 (provenance),
  36466109302 (navigation), 36466585295 (global geography), 36467158338 (regional),
  36467509814 and PR run 36467517497 (security-patched toolchain).
- Latest touch commit CI **36467794054 passed** on 5dbe6a1, including all 11 browser tests.
  Actions reported Node-20 action-runtime deprecation and upcoming Ubuntu image migration warnings; neither failed the run.
- Pages environment API permits **main only**. No bypass, main push or merge was
  performed. Branch work is **not deployed to public Pages**.
- Fresh public Pages curl probe in this sandbox failed TLS connection; this is a
  network limitation, not evidence of a public application outage.
- Production preview on port 4173 binds 0.0.0.0 and accepts `.e2b.app`; host-header
  probe returned HTTP 200. It serves the branch artifact, not public Pages.

## 5. Known failures / limitations

- Full npm audit: **2 moderate dev-tool findings** (Vitest/@vitest/mocker,
  GHSA-82fw-gwwq-j7x9). `npm audit --omit=dev`: **0 findings**.
- Vite 6.4.3 / Vitest 3.2.7 deliberately patch inherited high/critical issues.
  Attempted Vitest 4.1.11 install hit npm Arborist `edgesOut` exception; no forced
  peer overrides. Do not expose Vitest servers. See docs/DEPENDENCY_SECURITY.md.
- Sandbox cannot download standard Chromium from Playwright/Google or Debian
  libraries. External npm-delivered Chromium fallback used locally; CI uses the
  standard Playwright browser successfully. See browser evidence doc.
- Coarse Earth tessellation and coastlines are not a local precision terrain
  surface. Coastlines intentionally hide below 200 km. No buildings exist.
- No physical device/GPU performance, long-session leak, actual bfcache, offline
  shell or native wrapper proof. Sun/atmosphere are fixed illustrative visuals.
- Persistent provider caches, workers, frustum-driven priority, graceful fades,
  higher-resolution source adapters and geographic place-name search are absent.

## 6. Exact next incomplete work

Continue Phase 2, not hazard/VFX expansion:
1. Add a bounded IndexedDB provider cache keyed by provider + version + tile ID,
   with explicit freshness/eviction/offline/failure policy; current cache is RAM-only.
2. Select and verify a keyless local terrain/building source and its terms/CORS;
   implement a bounded regional adapter through DataProvider/TileScheduler.
3. Render local anchored geometry only at appropriate LOD. Preserve observed vs
   inferred building height, coverage, timestamp and uncertainty. Test real load,
   region unload, provider failure, stale results and repeated resource bounds.
4. Finish Phase 2 exit evidence before scenario/time/hazard phases.

Maintain buildability, branch discipline and scoped evidence. The complete
long-term product definition in the governing plans remains unchanged.

## 7. Session revision ledger

- df36fcd — lockfile, browser CI, production preview repair, lifecycle metrics.
- 4faeb6e — validated provenance and Science panel.
- f864b96 — ENU/rebasing/picking, navigation, quality, bookmarks.
- 2361188 — sourced/attributed Natural Earth low-LOD context.
- 23d476d — first bounded regional provider/scheduler and fallback.
- 8b65c2a — targeted security patches and corrected Pages environment URL syntax.
- 5dbe6a1 — multi-touch ownership and portrait browser acceptance.
- r12 — consolidate superseded intermediate counts into this current evidence state.
