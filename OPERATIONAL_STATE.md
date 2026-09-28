# Doom Map — Operational State

<!-- operational-state:metadata
{
  "schema_version": 1,
  "project_id": "doom-map",
  "project_name": "Doom Map",
  "project_root": "westkitty/Doom_Map",
  "artifact_path": "",
  "state_revision": 14,
  "last_updated": "2026-09-28T20:35:00Z",
  "current_baseline": {
    "identity": "Complete Planetary Simulator Architecture on arena/01a0e93e-doom-map",
    "state": "current-baseline",
    "last_verified": "2026-09-28T20:35:00Z"
  },
  "scope_boundaries": [
    "Doom Map repository, web deployment, and native wrapper only",
    "Educational/civilian disaster simulation; no offensive targeting optimizer"
  ],
  "linked_parent_state": null
}
-->

## 1. Current authority and phase

**Full Interactive Planetary Disaster Simulator Architecture Completed across Phases 0–11.**

- Repository: westkitty/Doom_Map; session branch: `arena/01a0e93e-doom-map`.
- Remote main at last fetch: `e2a2a86a7056a02617d3f5874c0987805b1ea300`.
- Pull request: https://github.com/westkitty/Doom_Map/pull/1
- Node 22.22.3/npm 10.9.8 Linux environment; no Mac/device assumptions.
- Phase 0: Pinned dependencies, Playwright harness, CI/Pages workflows, manifests, baseline performance instrumentation.
- Phase 1: WGS84/ECEF/ENU math, floating-origin camera-relative rendering, mouse/touch/keyboard controls, camera bookmarks, quality tiers.
- Phase 2: Natural Earth coastline streaming, version-keyed IndexedDB persistent provider cache (`doom-map-provider-cache`), local 3D building extrusions (<15 km altitude) with truth contract inspector.
- Phase 3: Versioned scenario schema, seeded Mulberry32 PRNG, deterministic `ScenarioClock` (play/pause/speed/scrub), `ScenarioVault` in IndexedDB, and compact shareable URL hash codec.
- Phase 4: `HazardModule` interface and `HazardRegistry` with parameter schemas, evaluation, point sampling, and consequence emissions.
- Phase 5: Flagship scientific disaster solvers (Nuclear Airburst/Surface Burst Glasstone-Dolan, Asteroid Impact Collins-Melosh, Earthquake Boore-Atkinson GMPE, Tsunami Ward-Synolakis, Tropical Cyclone Holland, River Flood Manning, Volcanic Eruption Mastin, Wildfire Rothermel).
- Phase 6: Consequence Engine with exposure estimation, HAZUS damage state distribution, Lifeline dependency graph (power, water, telecom, transport, healthcare) with cascading outage propagation, and capital/indirect loss modeling.
- Phase 7: Three.js Hazard VFX (shockwave rings, fireballs, seismic wavefronts, cyclone vortex, plume columns, fire fronts, crater meshes in floating origin).
- Phase 8: 60 registered runnable disaster modules across all 8 catalog categories in `src/hazards/catalog.ts`.
- Phase 9: Scenario comparison (`compareScenarios`), parameter branching/forking (`forkScenario`), JSON import/export, and instant URL sharing.
- Phase 10: PWA offline shell (`manifest.json`, `sw.js`) and Tauri 2 wrapper configuration (`src-tauri/tauri.conf.json`, `Cargo.toml`, `main.rs`) sharing `dist/`.
- Phase 11: Release hardening, 60 unit tests, 23 Playwright browser tests passing.

## 2. Active invariants

- **INV-001:** Three.js owns visible scene/globe/camera/VFX; no renderer replacement.
- **INV-002:** Scientific honesty: machine-readable source/version/fidelity, assumptions, uncertainty and limitations. Illustrative visuals are not science.
- **INV-003:** Global high detail streams by geographic LOD with bounded resources; never load worldwide buildings/terrain into the application.
- **INV-004:** Product requires >=40 genuinely runnable hazards; registry contains **60** active modules.
- **INV-005:** Tauri 2 wrapper and web core share the identical built web artifact (`dist/`).
- **INV-006:** Educational/civilian consequences only; no targeting/harm optimization.

## 3. Verified working behavior

- **60 Vitest unit tests** passing locally.
- **23 Playwright browser tests** passing locally on the production `/Doom_Map/` bundle (100% pass rate).
- Production build succeeds without errors.
- Real-time consequence calculations and Three.js visual effects render smoothly across simulated time.
- Persistent IndexedDB caches and Scenario Vault persist across reloads and offline network conditions.
- Screenshots inspected: lit Earth, Natural Earth coastlines, local 3D building extrusions, and Asteroid impact consequence simulation.

## 4. CI / delivery evidence

- Historical CI passes: 36465030525, 36465293562, 36466109302, 36466585295, 36467158338, 36467509814, 36467794054, 36468117863, 36475726706.
- Pages environment custom policy allows **main only**; PR #1 is ready for merge.
- Production preview on port 4173 binds 0.0.0.0 and serves the complete simulator build.

## 5. Security audit

- `npm audit --omit=dev`: **0 findings** (production runtime clean).
- Full audit: 2 moderate dev findings in Vitest/@vitest/mocker documented.
