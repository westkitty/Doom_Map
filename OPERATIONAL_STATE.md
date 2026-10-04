# Doom Map — Operational State

<!-- operational-state:metadata
{
  "schema_version": 1,
  "project_id": "doom-map",
  "project_name": "Doom Map",
  "project_root": "westkitty/Doom_Map",
  "artifact_path": "",
  "state_revision": 8,
  "last_updated": "2026-10-04T04:07:59Z",
  "current_baseline": {
    "identity": "commit 69905d40334d7fa21cac979d2509957012de1363",
    "state": "current-baseline",
    "last_verified": "2026-10-04T04:07:59Z"
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

Current implementation baseline: commit 69905d40334d7fa21cac979d2509957012de1363 on main.

Verified for this implementation by GitHub Actions:
- CI run 37176072053: committed-lockfile `npm ci`, strict TypeScript typecheck, the complete Vitest suite, and Vite production build all succeeded.
- Deploy GitHub Pages run 37176072086: deterministic `npm ci`, verify/build, Pages artifact upload, and deploy all succeeded.

This round connects the existing geospatial and replay foundations more directly to runtime use. It adds Web Mercator tile conversion, antimeridian-safe viewport coverage, prefetch rings, deterministic tile prioritization, stale-view cancellation epochs, data freshness classification, tile residency accounting, a composed GeoTileStore, explicit data-layer state, validated GeoJSON point extraction, disposable Three.js point layers, GlobeApp-owned data-layer lifecycle, reference-provider rendering through the tile-store path, streaming/attribution diagnostics, model-version compatibility checks, provider snapshot compatibility checks, runtime input journals, true checkpoint restoration, deterministic scenario batch execution, and scenario outcome comparison.

Implementation commit 9dc387f82916108c558c94f2d95d3ed7e82d0d58 initially failed strict TypeScript because `src/main.ts` referenced `import.meta.env.BASE_URL` without Vite's client ambient types in the project. Repair commit 69905d40334d7fa21cac979d2509957012de1363 replaced that dependency with `new URL('./', document.baseURI).pathname`, preserving Pages base-path behavior without changing TypeScript configuration. The full CI and Pages workflows then passed.

The new reference data layer remains illustrative fidelity-D fixture data. Source, unit tests, production build, and deployment prove the integration path exists; direct visual browser observation of the rendered reference markers remains unavailable in this workflow.

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

<!-- operational-state:entry
{"id":"VER-006","title":"Deterministic simulation and bounded streaming primitives pass CI and Pages deployment","state":"verified","capability":"The 85ff7d55cd0c9a9093b22bf0e91ee18be5a40759 source provides tested deterministic simulation, hazard registry, consequence graph, tile/LOD, request scheduling, cache/retry, provider routing, resource budgeting, floating-origin, trace, capability, and branch-graph primitives.","scope":"Simulation/streaming foundation source and tests","verification_method":"GitHub Actions CI run 37172047741 and Deploy GitHub Pages run 37172047765","evidence":"Strict TypeScript, full Vitest suite, production build, Pages build/artifact upload, and deploy succeeded after repairing one test-fixture typing failure.","artifact_revision":"85ff7d55cd0c9a9093b22bf0e91ee18be5a40759","last_verified":"2026-10-04T02:46:35Z","dependencies":["src/sim","src/hazards","src/consequences","src/geo","src/data","src/globe/floatingOrigin.ts","src/core/runtimeTrace.ts","src/core/capabilities.ts","src/scenario/branchGraph.ts","tests"],"freshness":"current implementation baseline","recheck_trigger":"Simulation, streaming, provider, hazard registry, consequence graph, or related test changes"}
-->
### VER-006 — Deterministic simulation and bounded streaming primitives pass CI and Pages deployment
- **State:** verified
- **Evidence:** CI run 37172047741 and Pages run 37172047765 completed successfully after the bounded test-fixture repair.
<!-- /operational-state:entry -->

<!-- operational-state:entry
{"id":"VER-007","title":"Composed scenario/provider pipelines and reproducible npm installs pass CI and Pages","state":"verified","capability":"The 36730edfaeda7a69be9ad48c0b33b1da59a773fd baseline composes deterministic scenario execution, hazard module registration and validation, replay/bundle integrity, provider retry/failover/deduplication/metadata, foundation auditing, and committed lockfile-based installs.","scope":"Scenario/data runtime foundations, tests, package-lock.json, CI and Pages workflows","verification_method":"GitHub Actions CI run 37174389781 and Deploy GitHub Pages run 37174389792","evidence":"Both workflows installed with npm ci from the committed lockfile; strict TypeScript, full Vitest suite, production build, Pages artifact upload, and deploy succeeded.","artifact_revision":"36730edfaeda7a69be9ad48c0b33b1da59a773fd","last_verified":"2026-10-04T03:33:41Z","dependencies":["package-lock.json","src/scenario","src/hazards","src/data","src/core/foundationAudit.ts","tests",".github/workflows/ci.yml",".github/workflows/deploy-pages.yml"],"freshness":"current implementation baseline","recheck_trigger":"Dependencies, lockfile, scenario/provider runtime, tests, or workflows change"}
-->
### VER-007 — Composed scenario/provider pipelines and reproducible npm installs pass CI and Pages
- **State:** verified
- **Evidence:** CI 37174389781 and Pages 37174389792 passed using `npm ci`.
<!-- /operational-state:entry -->

<!-- operational-state:entry
{"id":"VER-008","title":"Geodata residency and deterministic replay uplift passes CI and Pages","state":"verified","capability":"The 69905d40334d7fa21cac979d2509957012de1363 baseline provides 20 traced improvements covering tile planning/residency, Three.js data-layer ownership, reference-provider scene integration, diagnostics, replay compatibility/journaling/restoration, deterministic batch execution, and outcome comparison.","scope":"Round-05 implementation mapped in docs/UPLIFT_ROUND_05.md","verification_method":"GitHub Actions CI run 37176072053, Deploy GitHub Pages run 37176072086, focused Vitest fixtures, strict TypeScript, production build, and remote source-presence audit","evidence":"npm ci, typecheck, all unit tests, production build, Pages artifact upload, and deploy succeeded after the bounded base-path repair.","artifact_revision":"69905d40334d7fa21cac979d2509957012de1363","last_verified":"2026-10-04T04:07:59Z","dependencies":["docs/UPLIFT_ROUND_05.md","src/geo","src/data","src/globe","src/scenario","src/sim","src/consequences","tests"],"freshness":"current implementation baseline","recheck_trigger":"Tile planning/store, layer ownership, replay/runtime, diagnostics, or mapped tests change"}
-->
### VER-008 — Geodata residency and deterministic replay uplift passes CI and Pages
- **State:** verified
- **Evidence:** CI 37176072053 and Pages 37176072086 passed after the bounded base-path repair.
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

<!-- operational-state:entry
{"id":"UNV-002","title":"Offline app shell and live same-origin reference provider path","state":"implemented-unverified","scope":"public/sw.js, src/offline/registerServiceWorker.ts, public/data/reference-regions.geojson, src/data/staticGeoJsonProvider.ts, src/main.ts","evidence":"Source and mocked provider-path tests pass; production build and Pages deployment succeed. Direct browser service-worker registration/cache/offline navigation and deployed fixture fetch were not observed in this workflow.","validation_method":"In a real browser on the deployed Pages site, confirm service-worker registration, reload/offline app-shell fallback, cache version cleanup, network transition messaging, and successful same-origin fetch of data/reference-regions.geojson.","status":"active"}
-->
### UNV-002 — Offline app shell and live same-origin reference provider path
- **State:** implemented-unverified
- **Missing proof:** Direct deployed-browser service-worker/offline and live fixture-fetch observation.
<!-- /operational-state:entry -->

<!-- operational-state:entry
{"id":"UNV-003","title":"Rendered reference GeoJSON point layer appearance","state":"implemented-unverified","scope":"src/data/referenceDataController.ts, src/globe/geoJsonPointLayer.ts, src/globe/GlobeApp.ts, src/main.ts","evidence":"The provider-to-tile-store-to-Three.js path passes focused tests, strict TypeScript, production build, and Pages deployment. Direct visual browser observation was unavailable.","validation_method":"Open the deployed site in a real browser and confirm the two illustrative reference points render, survive globe interaction, disappear on layer replacement/removal, and do not leak renderer resources.","status":"active"}
-->
### UNV-003 — Rendered reference GeoJSON point layer appearance
- **State:** implemented-unverified
- **Missing proof:** Direct visual browser observation of the deployed layer.
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

### PND-002 — Integrate real geospatial streaming providers
- **State:** pending
- **Priority:** critical
- **Progress:** Tile conversion, antimeridian coverage, prefetch, prioritization, generation cancellation, freshness, residency, composed tile-store behavior, layer ownership, and provider-to-scene integration now exist and are tested with the illustrative same-origin fixture. Real sourced PMTiles/MVT/terrain/building adapters remain pending.

### PND-003 — Implement physical hazard and consequence models
- **State:** pending
- **Priority:** critical
- **Progress:** All 100 catalog items now exist as machine-readable fidelity-D registry manifests, and the consequence DAG primitive exists. Dedicated model modules, parameter schemas, validation fixtures, exposure queries, and recovery logic remain pending.

### PND-004 — Implement and validate native wrapper
- **State:** pending
- **Priority:** high

### PND-005 — Generate and commit package lockfile
- **State:** superseded by VER-007
- **Resolution:** GitHub Actions generated the lockfile, commit e96669ccf75436d917b1556a691b76ff1863295e recorded it, and commit 36730edfaeda7a69be9ad48c0b33b1da59a773fd moved CI and Pages to verified `npm ci` installs.

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
- Provider, provenance, and scenario envelopes are explicit source-level contracts; future data/hazard work should extend them rather than invent parallel metadata systems.
- Simulation determinism is built from fixed-step time, seeded randomness, ordered events, canonical checksums, bounded checkpoints, and explicit scenario branches.
- The 100-entry hazard catalog is a registry and planning/runtime contract, not evidence that 100 scientific models exist; catalogued entries remain fidelity D until promoted by model evidence.
- Streaming must use bounded concurrency, cancellation, retry/backoff, LRU byte budgets, provider-health routing, quality-tier budgets, and SSE-based LOD decisions.
- Floating-origin transforms preserve authoritative ECEF coordinates while allowing later GPU-local rendering; renderer integration is still pending.
- Executable hazard modules are separate from catalog manifests. A hazard becomes runnable only through a registered runtime module with validated parameters and an explicit model version.
- Portable scenario bundles are checksum-verified before import; future schema changes must move forward through explicit migration steps.
- Data fetch composition prefers cancellable shared requests, retry classification, circuit breaking, provider failover, content hashing/byte accounting, and attribution ledgers rather than ad hoc fetch calls.
- The service worker is an app-shell availability mechanism, not a license to present stale scientific data as current; data freshness/provenance remains authoritative.
- CI and Pages must use the committed package-lock.json through `npm ci`; temporary repository-write permission used to bootstrap the lockfile has been removed.
- Geodata view changes must invalidate stale work through explicit view generations rather than allowing old requests to win races.
- Data-layer ownership belongs to GlobeApp; layer replacement/removal must dispose owned Three.js resources.
- Scenario runtime construction must reject model-version drift, and provider snapshots must be checked before claiming replay equivalence.
- Checkpoint restoration must restore clock accumulator, RNG state, hazard state, queued events, consequences, emissions, and input journal together.

## 11. Validation and Evidence Matrix

| ID | Claim | State | Evidence / required proof |
|---|---|---|---|
| VER-001 | TypeScript baseline | verified | CI 36447608037 |
| VER-002 | WGS84 fixtures | verified | 3/3 Vitest in CI |
| VER-003 | Production build | verified | CI + Pages build before configure gate |
| UNV-001 | Interactive globe + minimized command UI | implemented-unverified | needs direct real-browser smoke |
| VER-004 | Public Pages delivery | verified | Pages workflow run 36448035612 + prior live HTTP 200 probe |
| VER-005 | Expanded source + Pages build/deploy | verified | CI 37168929607 + Pages 37168929613 |
| VER-006 | Simulation/streaming foundation | verified | CI 37172047741 + Pages 37172047765 |
| VER-007 | Composed scenario/provider pipeline + reproducible installs | verified | CI 37174389781 + Pages 37174389792 |
| VER-008 | Round-05 geodata/replay uplift | verified | CI 37176072053 + Pages 37176072086 + docs/UPLIFT_ROUND_05.md |
| UNV-003 | Rendered reference GeoJSON layer appearance | implemented-unverified | needs direct browser visual proof |
| UNV-002 | Offline shell + deployed reference-provider path | implemented-unverified | needs direct browser/offline proof |
| INV-004 | >=40 hazards | partially implemented | 100 schema-valid catalog manifests exist; physical model modules remain pending |
| INV-005 | Wrapper shares web core | requested | wrapper not built |

## 12. Current Change Scope and Impact Radius

The geospatial runtime now has a tested planning/residency path from geographic bounds through tile selection, caching/failover, provider payloads, and an owned Three.js data layer. The deterministic scenario runtime now has stronger replay integrity through compatibility gates, journals, and restorable checkpoints. The immediate scope is therefore narrower and more valuable: replace the illustrative fixture with the first properly sourced production geospatial dataset; connect viewport-derived tile coverage to camera movement rather than the single world-tile bootstrap; directly observe browser layer disposal/offline behavior; and promote one evidence-backed hazard model into the runtime registry.

Do not treat the reference points as production mapping data, and do not claim checkpoint-equivalent replay if model/provider compatibility gates fail.

## 13. Compact Revision Log

- r1 — 2026-09-28: Bootstrapped project state and invariants.
- r2 — 2026-09-28: Recorded Phase 0/1 source baseline, successful CI typecheck/tests/build, initial bundle warning, unverified globe runtime, and the Pages-enablement delivery blocker.
- r3 — 2026-09-28: Verified Pages enabled in workflow mode, reran deployment successfully, and confirmed the public Doom Map URL returns HTTP 200.
- r4 — 2026-09-28: Reconciled stale deployment/traceability/README state with the verified live Pages deployment; browser interaction proof and deterministic-install work remain pending.
- r5 — 2026-10-04: Recorded implementation e808eb789ef9215f937ea90e71a481a4d41fef25: deeper geodesy/navigation, target selection/fly-to, view-state/history, adaptive quality/diagnostics, provider/provenance/scenario contracts, and a minimized progressive-disclosure UI. CI 37168929607 and Pages 37168929613 passed; direct rendered-browser proof and package-lock generation remain pending.
- r6 — 2026-10-04: Added 20 engine foundations at 85ff7d55cd0c9a9093b22bf0e91ee18be5a40759: deterministic RNG/time/events/checkpoints/checksums, scenario branches, 100-entry hazard registry, consequence DAG, tile/LOD, bounded request/cache/retry/provider/resource systems, floating origin, runtime trace, and capability classification. Initial commit 2968b21 exposed one strict-TypeScript test-fixture failure; repaired in 85ff7d55cd0c9a9093b22bf0e91ee18be5a40759. CI 37172047741 and Pages 37172047765 then passed.
- r7 — 2026-10-04: Composed the foundations into tested scenario and provider pipelines, added offline app-shell support and foundation auditing, and closed dependency reproducibility. Implementation 39fb13cf added runtime composition; e96669cc committed GitHub-generated lockfile; 36730edfaeda7a69be9ad48c0b33b1da59a773fd restored read-only CI and enforced `npm ci`. CI 37174389781 and Pages 37174389792 passed. Offline service-worker behavior and live deployed fixture fetch remain implemented-unverified.
- r8 — 2026-10-04: Completed the 20-item Round-05 uplift mapped in docs/UPLIFT_ROUND_05.md. Commit 9dc387f8 added tile planning/residency, data-layer ownership/integration, compatibility/journal/restoration, batch, and comparison systems. That commit exposed one TypeScript base-path defect; 69905d40334d7fa21cac979d2509957012de1363 repaired it. CI 37176072053 and Pages 37176072086 then passed.
