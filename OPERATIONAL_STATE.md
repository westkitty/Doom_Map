# Doom Map — Operational State

<!-- operational-state:metadata
{
  "schema_version": 1,
  "project_id": "doom-map",
  "project_name": "Doom Map",
  "project_root": "westkitty/Doom_Map",
  "artifact_path": "",
  "state_revision": 5,
  "last_updated": "2026-10-04T01:45:15Z",
  "current_baseline": {
    "identity": "commit e808eb789ef9215f937ea90e71a481a4d41fef25",
    "state": "current-baseline",
    "last_verified": "2026-10-04T01:45:15Z"
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

Current implementation baseline: commit e808eb789ef9215f937ea90e71a481a4d41fef25 on main.

Verified for this implementation by GitHub Actions:
- CI run 37168929607: dependency install, TypeScript typecheck, full Vitest suite, and Vite production build all succeeded.
- Deploy GitHub Pages run 37168929613: verify/build, Pages artifact upload, and deploy job all succeeded.

The Phase 1 globe foundation is materially deeper than the September baseline. It now includes WGS84 validation and ENU local frames, ellipsoid picking, coordinate go-to, target fly-to, north-up orientation, bounded camera history, shareable view state, adaptive quality, runtime diagnostics, scale feedback, provider/provenance/scenario contracts, and a minimized progressive-disclosure command interface.

A real-browser visual/interaction observation of this revision was not available in this workflow, so rendered behavior remains implemented but not visually verified. Representative device performance also remains unknown.

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

<!-- operational-state:entry
{"id":"VER-005","title":"Expanded globe foundation passes CI and Pages deployment","state":"verified","capability":"The e808eb789ef9215f937ea90e71a481a4d41fef25 source passes dependency-backed typecheck, unit tests, production build, and GitHub Pages build/deploy workflows.","scope":"Phase 0/1 source and static deployment artifact","verification_method":"GitHub Actions CI run 37168929607 and Deploy GitHub Pages run 37168929613","evidence":"CI dependency install/typecheck/Vitest/build succeeded; Pages verify/build/artifact upload/deploy succeeded.","artifact_revision":"e808eb789ef9215f937ea90e71a481a4d41fef25","last_verified":"2026-10-04T01:45:15Z","dependencies":["package.json","src","tests","index.html",".github/workflows/ci.yml",".github/workflows/deploy-pages.yml"],"freshness":"current implementation baseline","recheck_trigger":"Source, tests, build configuration, or Pages workflow change"}
-->
### VER-005 — Expanded globe foundation passes CI and Pages deployment
- **State:** verified
- **Evidence:** CI run 37168929607 and Pages run 37168929613 completed successfully.
<!-- /operational-state:entry -->

## 6. Known Not Working

None currently recorded.

## 7. Implemented but Unverified

<!-- operational-state:entry
{"id":"UNV-001","title":"Interactive globe navigation and minimized command UI","state":"implemented-unverified","scope":"index.html, src/main.ts, src/globe/GlobeApp.ts, src/style.css, supporting core modules","evidence":"Source passes CI and production build; Pages deployment succeeded; no direct rendered-browser interaction observation was available in this workflow.","validation_method":"Open the deployed build in a real browser; verify render, orbit/pan/zoom, picking, coordinate go-to, fly-to, north-up, command palette, target chip, inspector, view history/share state, adaptive quality, resize/context restoration, responsive/mobile layout, and console cleanliness.","status":"active"}
-->
### UNV-001 — Interactive globe navigation and minimized command UI
- **State:** implemented-unverified
- **Missing proof:** Direct real-browser visual and interaction observation on desktop and touch-sized layouts.
<!-- /operational-state:entry -->

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
- **State:** pending
- **Priority:** critical

### PND-003 — Implement disaster and consequence engines
- **State:** pending
- **Priority:** critical

### PND-004 — Implement and validate native wrapper
- **State:** pending
- **Priority:** high

### PND-005 — Generate and commit package lockfile
- **State:** pending
- **Priority:** critical for Phase 0 exit
- **Reason:** Current CI deliberately uses npm install because no locally generated package-lock.json exists yet. Switch CI/Pages to `npm ci` only after a real lockfile is generated and validated.

## 10. Active Decisions, Defaults, and Prohibitions

- Default renderer: Three.js WebGLRenderer.
- Coordinate authority: WGS84 geodetic + ECEF + ENU, with floating-origin/local rendering as implementation expands.
- Open building baseline: Overture Maps / OpenStreetMap-derived geometry where practical; optional provider adapters may supply higher-fidelity 3D Tiles.
- Static-delivery design: no required custom application server for core playback.
- Native wrapper default: Tauri 2.
- Nuclear models are educational consequence models, not strike-planning systems.
- Do not treat map coverage, building footprints, or 3D extrusion as proof of structural accuracy.
- Current single-bundle architecture is acceptable only as a bootstrap. Introduce code splitting as geospatial/hazard modules arrive instead of allowing one monolith to grow.
- Default interface policy: the globe remains visually primary; advanced controls use progressive disclosure through the command surface, contextual target chip, and optional inspector.
- Default quality policy: adaptive auto mode may step among High/Balanced/Low/Safe using sustained frame-time evidence; manual tiers remain available.
- Provider, provenance, and scenario envelopes are now explicit source-level contracts; future data/hazard work should extend them rather than invent parallel metadata systems.

## 11. Validation and Evidence Matrix

| ID | Claim | State | Evidence / required proof |
|---|---|---|---|
| VER-001 | TypeScript baseline | verified | CI 36447608037 |
| VER-002 | WGS84 fixtures | verified | 3/3 Vitest in CI |
| VER-003 | Production build | verified | CI + Pages build before configure gate |
| UNV-001 | Interactive globe + minimized command UI | implemented-unverified | needs direct real-browser smoke |
| VER-004 | Public Pages delivery | verified | Pages workflow run 36448035612 + prior live HTTP 200 probe |
| VER-005 | Expanded source + Pages build/deploy | verified | CI 37168929607 + Pages 37168929613 |
| INV-004 | >=40 hazards | requested | catalog exists; runtime not built |
| INV-005 | Wrapper shares web core | requested | wrapper not built |

## 12. Current Change Scope and Impact Radius

Phase 0 and a substantial Phase 1 navigation/runtime foundation now exist. The immediate scope is: direct browser acceptance proof for the new interaction paths, generate and validate the package lockfile so CI can move to reproducible `npm ci`, then implement the geospatial streaming/data-provider layer against the new provider/provenance contracts. Floating-origin/local-detail work remains required before claiming building-scale numerical stability. Do not jump directly to deep hazard implementations before data/time foundations and runtime browser proof are established.

## 13. Compact Revision Log

- r1 — 2026-09-28: Bootstrapped project state and invariants.
- r2 — 2026-09-28: Recorded Phase 0/1 source baseline, successful CI typecheck/tests/build, initial bundle warning, unverified globe runtime, and the Pages-enablement delivery blocker.
- r3 — 2026-09-28: Verified Pages enabled in workflow mode, reran deployment successfully, and confirmed the public Doom Map URL returns HTTP 200.
- r4 — 2026-09-28: Reconciled stale deployment/traceability/README state with the verified live Pages deployment; browser interaction proof and deterministic-install work remain pending.
- r5 — 2026-10-04: Recorded implementation e808eb789ef9215f937ea90e71a481a4d41fef25: deeper geodesy/navigation, target selection/fly-to, view-state/history, adaptive quality/diagnostics, provider/provenance/scenario contracts, and a minimized progressive-disclosure UI. CI 37168929607 and Pages 37168929613 passed; direct rendered-browser proof and package-lock generation remain pending.
