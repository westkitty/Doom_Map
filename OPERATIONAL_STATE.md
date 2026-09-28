# Doom Map — Operational State

<!-- operational-state:metadata
{
  "schema_version": 1,
  "project_id": "doom-map",
  "project_name": "Doom Map",
  "project_root": "westkitty/Doom_Map",
  "artifact_path": "",
  "state_revision": 10,
  "last_updated": "2026-09-28T17:58:00Z",
  "current_baseline": {
    "identity": "branch implementation through 236118862f53de96265de5855e0f9e8e2791272d; next slice described below",
    "state": "current-baseline",
    "last_verified": "2026-09-28T17:58:00Z"
  },
  "scope_boundaries": [
    "Doom Map repository, web deployment, and native wrapper only",
    "Educational/civilian disaster simulation; no offensive targeting optimizer"
  ],
  "linked_parent_state": null
}
-->

## 1. Project Identity and Scope

Doom Map is a browser-first, Three.js-controlled global disaster and consequence simulator. It must support a fully interactive globe, progressive geospatial detail down to best-available building geometry, time-based disaster animation, consequence propagation, comparison, and a shared static web build that also runs inside a native wrapper.

## 2. Current Baseline

Current baseline before this state update: commit 28dd723e5e504baeb36fbcd105a17e2a0cc00c13 on main. GitHub Pages is enabled with build type `workflow`, and the public site is recorded as verified live. Deployment and traceability documentation have been reconciled so they no longer claim Pages is blocked.

Verified by GitHub Actions CI run 36447608037:
- TypeScript typecheck passed.
- Vitest passed 3/3 WGS84 coordinate tests.
- Vite production build passed.
- Initial production JS bundle is approximately 539 kB minified / 136 kB gzip and currently triggers Vite's >500 kB chunk warning.

Superseding local evidence (2026-09-28): clean npm ci, typecheck, 3 unit tests, production build and 3 Playwright browser tests pass on the session branch. The rendered globe screenshot was inspected. See docs/BROWSER_ACCEPTANCE.md. Historical main CI/Pages records below do not prove deployment of this branch.

## 3. Artifact Contract

The final product must:
- render an interactive 3D Earth with orbit/spin, pan, zoom, target placement, search, bookmarks, and cinematic camera moves;
- use Three.js as the presentation/render authority;
- progressively stream geospatial data instead of packaging the planet into the application bundle;
- expose best-available building geometry with provenance and coverage/fidelity indicators rather than claiming uniform worldwide building truth;
- support at least 40 distinct disaster scenario types through one data-driven hazard registry and consequence pipeline;
- animate primary, secondary, tertiary, and recovery consequences over time;
- distinguish calculated, reduced-order, empirical/data-driven, and illustrative outputs;
- deploy as a static GitHub Pages site;
- run from the same compiled web core inside a native WebView wrapper;
- preserve deterministic or seekable scenario playback where the model permits;
- record sources, model assumptions, uncertainty, and timestamps.

## 4. Active Invariants

### INV-001 — Three.js remains render authority
- **State:** requested
- **Rule:** Three.js owns globe, scene, camera, visual effects, and geospatial presentation.
- **Status:** active

### INV-002 — Scientific honesty over false precision
- **State:** requested
- **Rule:** Provenance, fidelity, uncertainty, and timestamps remain visible and machine-readable.
- **Status:** active

### INV-003 — Global detail is streamed and level-of-detail controlled
- **State:** requested
- **Rule:** Worldwide high-resolution data is streamed by region/LOD and aggressively cached/evicted.
- **Status:** active

### INV-004 — Minimum forty disaster types
- **State:** requested
- **Rule:** At least 40 distinct scenario types must be runnable through the common engine.
- **Status:** active

### INV-005 — Web and wrapper share one core
- **State:** requested
- **Rule:** Pages and native wrapper consume one web core.
- **Status:** active

### INV-006 — No offensive optimization surface
- **State:** requested
- **Rule:** Consequence visualization is allowed; target/impact optimization for maximizing harm is not.
- **Status:** active

## 5. Verified Working Behavior

<!-- operational-state:entry
{"id":"VER-001","title":"Strict TypeScript baseline passes CI","state":"verified","capability":"Repository TypeScript source passes tsc --noEmit on the current baseline.","scope":"Current Phase 0/1 source","verification_method":"GitHub Actions CI npm run typecheck","evidence":"CI run 36447608037, conclusion success","artifact_revision":"8d5c1d6a90218927b384bb06761325c8c7418512","last_verified":"2026-09-28T15:58:50Z","dependencies":["package.json","tsconfig.json","vite.config.ts"],"freshness":"current baseline","recheck_trigger":"TypeScript/config/source change"}
-->
### VER-001 — Strict TypeScript baseline passes CI
- **State:** verified
- **Evidence:** GitHub Actions CI run 36447608037.
<!-- /operational-state:entry -->

<!-- operational-state:entry
{"id":"VER-002","title":"WGS84 coordinate fixtures pass","state":"verified","capability":"Current geodetic-to-ECEF and ECEF-to-geodetic implementation passes three representative unit fixtures including equator, representative location, and north pole.","scope":"src/core/coordinates.ts","verification_method":"Vitest","evidence":"3/3 tests passed in CI run 36447608037","artifact_revision":"8d5c1d6a90218927b384bb06761325c8c7418512","last_verified":"2026-09-28T15:58:50Z","dependencies":["src/core/coordinates.ts","tests/coordinates.test.ts"],"freshness":"current baseline","recheck_trigger":"Coordinate math or tests change"}
-->
### VER-002 — WGS84 coordinate fixtures pass
- **State:** verified
- **Evidence:** 3/3 Vitest checks passed.
<!-- /operational-state:entry -->

<!-- operational-state:entry
{"id":"VER-003","title":"Production bundle builds for repository Pages base","state":"verified","capability":"Vite can produce the current static production bundle with /Doom_Map/ as build base.","scope":"Current Phase 0/1 web source","verification_method":"npm run build in GitHub Actions","evidence":"Pages build job reached successful production build before Pages configuration gate; CI also passed production build","artifact_revision":"8d5c1d6a90218927b384bb06761325c8c7418512","last_verified":"2026-09-28T15:59:00Z","dependencies":["vite.config.ts","src","index.html"],"freshness":"current baseline","recheck_trigger":"Build config, dependencies, routes, or entrypoints change"}
-->
### VER-003 — Production bundle builds for repository Pages base
- **State:** verified
- **Evidence:** Production build completed successfully in CI and Pages build job.
<!-- /operational-state:entry -->

<!-- operational-state:entry
{"id":"VER-004","title":"GitHub Pages public deployment is live","state":"verified","capability":"GitHub Pages is enabled with workflow build mode and the production site is publicly reachable.","scope":"Public web deployment","verification_method":"GitHub Pages API, successful Deploy GitHub Pages run 36448035612, and live HTTP probe","evidence":"Pages build and deploy jobs succeeded; https://westkitty.github.io/Doom_Map/ returned HTTP/2 200 with <title>Doom Map</title>.","artifact_revision":"9bdfb9e1aaeec6d0199140fc5a8127cd7270070d","last_verified":"2026-09-28T17:33:28Z","dependencies":[".github/workflows/deploy-pages.yml","vite.config.ts","dist artifact"],"freshness":"current deployment","recheck_trigger":"Pages settings, workflow, build base, or deployment changes"}
-->
### VER-004 — GitHub Pages public deployment is live
- **State:** verified
- **Evidence:** Deployment run 36448035612 succeeded and the live site returned HTTP 200 with the expected title.
<!-- /operational-state:entry -->

## 6. Known Not Working

Security patches Vite 6.4.3 / Vitest 3.2.7 remove the reported high/critical findings. Two moderate dev-tool findings remain (Vitest/@vitest/mocker GHSA-82fw-gwwq-j7x9). Production audit reports 0 findings. Do not expose Vitest servers. The attempted 4.1.11 update hit an npm resolver exception; see docs/DEPENDENCY_SECURITY.md.

## 7. Implemented but Unverified

### Globe foundation — partially verified
- Chromium 143 software-WebGL render screenshot inspected; rotate/pan/wheel,
  telemetry, resize, context recovery and emulated pinch pass browser tests.
- Short interaction geometry/texture counts remain constant.
- Physical touch and long-session lifecycle remain unverified. Tested coordinate fly-to reaches 100 m with finite camera state; local terrain fidelity remains absent.
- Phase 1 now includes ENU, render-camera rebasing, analytic picking, keyboard navigation, fly-to, quality/Safe and IndexedDB camera bookmarks. Natural Earth low-LOD outlines now render with verified provenance and explicit failure handling. Core navigation slice passes; physical-device, local mesh refinement, extended lifecycle and regional streaming remain. See docs/BROWSER_ACCEPTANCE.md.

## 8. Unknown or Evidence-Stale State

### UNK-001 — World_Set reference repository unavailable
- **State:** unknown
- **Evidence:** The named GitHub path could not be read during the planning pass.

### UNK-002 — Representative device performance
- **State:** unknown
- **Evidence:** No physical desktop/tablet/mobile runtime profiling has been performed.

## 9. Pending Work

### PND-001 — Complete Phase 1 globe runtime verification
- **State:** pending
- **Priority:** critical
- **Need:** Browser smoke, visual observation, context-loss/resize verification, and later floating-origin/local-detail work.

### PND-002 — Implement geospatial streaming and data-provider layer
- **State:** next implementation unit
- **Priority:** critical
- Natural Earth bounded regional provider now passes 30 unit / 10 browser tests: cancellation, stale rejection, retry, LRU/decoded-byte bounds, GPU unload and explicit fallback. Phase 2 is partial: terrain/buildings/persistent cache and broader formats still absent.

### PND-003 — Implement disaster and consequence engines
- **State:** pending
- **Priority:** critical

### PND-004 — Implement and validate native wrapper
- **State:** pending
- **Priority:** high

### PND-005 — Deterministic installation and browser harness
- **State:** locally verified; CI 36465030525 passed on df36fcd
- Real package-lock.json committed with pinned Playwright 1.63.0.
- Clean npm ci passes; both workflows use npm ci and lockfile caching.
- CI and Pages build gates include browser acceptance.

### PND-006 — Remaining Phase 0 spine
- Versioned model/provider manifests, runtime validator and source panel implemented; 15 unit tests pass.
- Baseline bounded frame statistics and renderer counts implemented.
- Unsupported WebGL and source panel paths now pass; total 4 local browser tests.
- Updated spine revision still requires CI; Pages deployment remains main-only.

## 10. Active Decisions, Defaults, and Prohibitions

- Default renderer: Three.js WebGLRenderer.
- Coordinate authority: WGS84 geodetic + ECEF + ENU, with floating-origin/local rendering as implementation expands.
- Open building baseline: Overture Maps / OpenStreetMap-derived geometry where practical; optional provider adapters may supply higher-fidelity 3D Tiles.
- Static-delivery design: no required custom application server for core playback.
- Native wrapper default: Tauri 2.
- Nuclear models are educational consequence models, not strike-planning systems.
- Do not treat map coverage, building footprints, or 3D extrusion as proof of structural accuracy.
- Current 539 kB initial JS chunk is acceptable only as a bootstrap. Introduce code splitting as geospatial/hazard modules arrive instead of allowing one monolith to grow.

## 11. Validation and Evidence Matrix

| ID | Claim | State | Evidence / required proof |
|---|---|---|---|
| VER-001 | TypeScript baseline | verified | CI 36447608037 |
| VER-002 | WGS84 fixtures | verified | 3/3 Vitest in CI |
| VER-003 | Production build | verified | CI + Pages build before configure gate |
| UNV-001 | Interactive globe behavior | partially verified | 3 local Chromium browser tests; screenshot inspected |
| VER-004 | Public Pages delivery | verified | Pages workflow run 36448035612 + live HTTP 200 probe |
| INV-004 | >=40 hazards | requested | catalog exists; runtime not built |
| INV-005 | Wrapper shares web core | requested | wrapper not built |

## 12. Current Change Scope and Impact Radius

Phase 0/early Phase 1 on `arena/01a0e93e-doom-map`. Reproducible install and
production-path browser acceptance now pass locally. Continue Phase 2 with a genuinely local-detail provider and persistent cache before time/hazard phases. Public Pages still
represents main, not this branch. No wrapper or hazard capability is claimed.

## 13. Compact Revision Log

- r1 — 2026-09-28: Bootstrapped project state and invariants.
- r2 — 2026-09-28: Recorded Phase 0/1 source baseline, successful CI typecheck/tests/build, initial bundle warning, unverified globe runtime, and the Pages-enablement delivery blocker.
- r3 — 2026-09-28: Verified Pages enabled in workflow mode, reran deployment successfully, and confirmed the public Doom Map URL returns HTTP 200.
- r4 — 2026-09-28: Reconciled stale deployment/traceability/README state with the verified live Pages deployment; browser interaction proof and deterministic-install work remain pending.

- r5 — Reproducible install, production-path browser harness, preview-base repair, bounded runtime metrics and context lifecycle evidence.

- r6 — Governed manifests/source panel and unsupported-WebGL proof; prior branch CI green. Recorded inherited development-tool audit findings.

- r7 — 19 unit tests; browser navigation to 100 m, keyboard, quality, bookmark and bounded remount evidence. CI 36465293562 passed prior provenance slice.

- r8 — Natural Earth immutable public-domain snapshot, 24 unit / 8 browser tests; rendered geographic context inspected; explicit provider failure and remount gates pass.

- r9 — First bounded regional coastline provider/scheduler; 30 unit / 10 browser tests. CI 36466585295 passed prior global-geography slice. No Phase 2 completion claim.

- r10 — Targeted same-major dev-tool security patches; clean npm ci, 30 unit / 10 browser tests; production audit 0, full audit 2 moderate. CI 36467158338 passed prior regional slice. Pages environment permits main only, so branch deployment is intentionally not claimed.

- r11 — Touch gesture ownership hardened; 30 unit / 11 browser tests pass locally, including portrait emulation and no accidental selection after pinch. Preview host suffix configured. Current release is still partial Phase 2.
