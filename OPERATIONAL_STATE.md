# Doom Map — Operational State

<!-- operational-state:metadata
{
  "schema_version": 1,
  "project_id": "doom-map",
  "project_name": "Doom Map",
  "project_root": "westkitty/Doom_Map",
  "artifact_path": "",
  "state_revision": 13,
  "last_updated": "2026-09-28T19:55:00Z",
  "current_baseline": {
    "identity": "Phase 2 persistent caching and 3D buildings slice on arena/01a0e93e-doom-map",
    "state": "current-baseline",
    "last_verified": "2026-09-28T19:55:00Z"
  },
  "scope_boundaries": [
    "Doom Map repository, web deployment, and native wrapper only",
    "Educational/civilian disaster simulation; no offensive targeting optimizer"
  ],
  "linked_parent_state": null
}
-->

## 1. Current authority and phase

**Active implementation; Phase 2 advanced (streaming geography + local 3D buildings + persistent cache). Phase 3 Scenario/Time engine next.**

- Repository: westkitty/Doom_Map; session branch: `arena/01a0e93e-doom-map`.
- Remote main at last fetch: `e2a2a86a7056a02617d3f5874c0987805b1ea300`.
- Pull request: https://github.com/westkitty/Doom_Map/pull/1
- Node 22.22.3/npm 10.9.8 Linux environment; no Mac/device assumptions.
- Phase 0 local/CI spine implemented; new Pages delivery awaits merge.
- Phase 1 navigation, WGS84/ENU/floating origin, touch, bookmarks, quality tiers implemented with browser evidence.
- Phase 2 delivers:
  1. Immutable Natural Earth global and regional coastline streaming.
  2. Bounded, compound-keyed IndexedDB persistent provider cache (`doom-map-provider-cache`) with freshness, LRU eviction, and stale network fallback.
  3. Sourced local 3D building extrusions below 15 km altitude with local ENU triangulation, usage materials, raycast picking, and truth contract metadata inspector (observed vs inferred heights, storeys, confidence, structural limitations).

## 2. Active invariants

- **INV-001:** Three.js owns visible scene/globe/camera/VFX; no renderer replacement.
- **INV-002:** Scientific honesty: machine-readable source/version/fidelity,
  assumptions, uncertainty and limitations. Illustrative visuals are not science.
- **INV-003:** Global high detail streams by geographic LOD with bounded resources;
  never load worldwide buildings/terrain into the application.
- **INV-004:** Product requires >=40 genuinely runnable hazards; currently **zero** (Phase 4/5/8).
- **INV-005:** Future Tauri wrapper shares the web core; currently absent.
- **INV-006:** Educational/civilian consequences only; no targeting/harm optimization.

WGS84 geodetic/ECEF/ENU and render-relative coordinates remain distinct.
Authoritative geographic values use JS Float64 numbers, not GPU Float32 storage.
Time, hazards, consequence graph, providers, rendering, DOM and persistence have
separate ownership.

## 3. Verified working behavior (scoped)

### Installation / build / evidence spine
- Clean `npm ci` passes.
- Strict TypeScript, **42 unit tests**, production build pass locally.
- **20 Playwright browser tests** pass locally on Chromium 143/SwiftShader.
- CI and Pages workflows use npm ci, lockfile caching, type/unit/build/browser gates.
- Production and preview base `/Doom_Map/`; development remains `/`.

### Spatial / globe & streaming
- Camera-relative rendering: ECEF camera, render camera at zero, world group rebased each frame.
- Bounded regional coastline provider (200–3,000 km altitude) with <=3 concurrent requests, <=12 decoded tiles, <=2 MB memory, <=9 GPU tiles.
- Persistent IndexedDB cache with compound keys `[provider, version, codec, lod, tile]`, 128 entries / 8 MB capacity, atomic eviction, and offline reading.
- Local 3D building extrusions (<15 km altitude) with local ENU triangulation, roof edge lines, use-based materials, and raycast picking.
- Building truth contract: observed vs inferred height, storeys, usage, confidence, attribution, and structural limitations displayed in DOM inspector.
- Zooming to orbit cleanly unloads all local building GPU meshes.
- Screenshots inspected: lit Earth, Natural Earth coastlines, and rendered 3D building extrusions.

## 4. CI / delivery evidence

- Implementation CI runs: 36467794054 (touch), 36468117863 / 36468124756 (PR #1).
- Pages environment API permits **main only**. Branch work is **not deployed to public Pages**.
- Production preview on port 4173 serves the branch artifact.

## 5. Known failures / limitations

- Full npm audit: **2 moderate dev-tool findings** (Vitest/@vitest/mocker, GHSA-82fw-gwwq-j7x9). Production audit: **0 findings**.
- Vite >500 kB chunk warning remains (entry ~584 kB minified / 151 kB gzip).
- No scenario clock, time scrubbing, hazard solvers, consequence graph, or Tauri wrapper yet.

## 6. Exact next incomplete work

Advance to **Phase 3 — Scenario & Time Core**:
1. Implement scenario schema (version, ID, seed, hazard parameters, provider snapshots).
2. Seeded PRNG and deterministic scenario clock (play, pause, speed multipliers 1x/10x/100x/1000x, scrub, seek, chapter markers).
3. IndexedDB scenario vault and export/import JSON capability.
4. Advance to Phase 4 (Hazard Framework) and Phase 5 (Flagship Scientific Solvers).

## 7. Session revision ledger

- df36fcd — lockfile, browser CI, production preview repair, lifecycle metrics.
- 4faeb6e — validated provenance and Science panel.
- f864b96 — ENU/rebasing/picking, navigation, quality, bookmarks.
- 2361188 — sourced/attributed Natural Earth low-LOD context.
- 23d476d — first bounded regional provider/scheduler and fallback.
- 8b65c2a — targeted security patches and corrected Pages environment URL syntax.
- 5dbe6a1 — multi-touch ownership and portrait browser acceptance.
- 90a8ede — PR #1 body REST update and documentation alignment.
- r13 — Bounded version-keyed IndexedDB cache, local 3D building extrusions, truth contract inspector, 42 unit / 20 browser tests.
