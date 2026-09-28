# Doom Map — Operational State

<!-- operational-state:metadata
{
  "schema_version": 1,
  "project_id": "doom-map",
  "project_name": "Doom Map",
  "project_root": "westkitty/Doom_Map",
  "artifact_path": "",
  "state_revision": 1,
  "last_updated": "2026-09-28T15:45:00Z",
  "current_baseline": {
    "identity": "commit f31ad9d1cd5a54d57c42f49bdd01bde1f8f21661",
    "state": "current-baseline",
    "last_verified": "2026-09-28T14:41:30Z"
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

The GitHub repository exists on branch `main`. The only verified artifact at this revision is repository initialization with `.gitignore`. No application runtime, build, deployment, wrapper, dataset adapter, or disaster model is yet verified.

## 3. Artifact Contract

The final product must:
- render an interactive 3D Earth with orbit/spin, pan, zoom, target placement, search, bookmarks, and cinematic camera moves;
- use Three.js as the presentation/render authority;
- progressively stream geospatial data instead of packaging the planet into the application bundle;
- expose best-available building geometry with provenance and coverage/fidelity indicators rather than claiming uniform worldwide building truth;
- support at least 40 distinct disaster scenario types through one data-driven hazard registry and consequence pipeline;
- animate primary, secondary, tertiary, and recovery consequences over time;
- distinguish calculated, reduced-order, empirical, and illustrative model outputs;
- deploy as a static GitHub Pages site;
- run from the same compiled web core inside a native WebView wrapper;
- preserve deterministic or seekable scenario playback where the model permits;
- record sources, model assumptions, uncertainty, and timestamps.

## 4. Active Invariants

<!-- operational-state:entry
{"id":"INV-001","title":"Three.js remains render authority","state":"requested","rule":"Three.js owns globe, scene, camera, visual effects, and geospatial presentation. Other geospatial libraries may supply formats, algorithms, tile loading, or data adapters but must not silently replace the product with a Cesium-only or map-only application.","scope":"All runtime architecture","authority":"Explicit user requirement plus project architecture","evidence":"User requested a 3js globe","validation_method":"Inspect dependency graph and runtime scene ownership; verify Three.js renderer owns the primary canvas.","last_checked":"revision 1","status":"active","recheck_trigger":"Renderer, globe, or geospatial framework changes"}
-->
### INV-001 — Three.js remains render authority
- **State:** `requested`
- **Rule:** Three.js owns globe, scene, camera, visual effects, and geospatial presentation.
- **Status:** active
<!-- /operational-state:entry -->

<!-- operational-state:entry
{"id":"INV-002","title":"Scientific honesty over false precision","state":"requested","rule":"Every disaster output must expose provenance, model class, uncertainty/limitations, and data timestamp where applicable. Exact-looking casualty/damage values are forbidden when the model only supports ranges or coarse estimates.","scope":"All hazard and consequence models","authority":"Project fidelity contract","evidence":"Planning decision 2026-09-28","validation_method":"Schema validation plus UI inspection of model badges and uncertainty displays.","last_checked":"revision 1","status":"active","recheck_trigger":"Any model, source, estimate, or consequence change"}
-->
### INV-002 — Scientific honesty over false precision
- **State:** `requested`
- **Rule:** Provenance, fidelity, uncertainty, and timestamps remain visible and machine-readable.
- **Status:** active
<!-- /operational-state:entry -->

<!-- operational-state:entry
{"id":"INV-003","title":"Global detail is streamed and level-of-detail controlled","state":"requested","rule":"Global terrain, imagery, vectors, and buildings must be fetched progressively by camera region and level of detail. The repository must not attempt to bundle worldwide building or terrain data.","scope":"Data and renderer pipeline","authority":"Scale feasibility requirement","evidence":"Architecture decision 2026-09-28","validation_method":"Network and bundle inspection; camera movement must load and unload bounded regional data.","last_checked":"revision 1","status":"active","recheck_trigger":"Data-provider, caching, bundling, or tile-manager changes"}
-->
### INV-003 — Global detail is streamed and level-of-detail controlled
- **State:** `requested`
- **Rule:** Worldwide high-resolution data is streamed by region/LOD and aggressively cached/evicted.
- **Status:** active
<!-- /operational-state:entry -->

<!-- operational-state:entry
{"id":"INV-004","title":"Minimum forty disaster types","state":"requested","rule":"The product must expose at least 40 distinct disaster scenario types, each registered through the shared disaster schema and capable of producing a timed footprint plus primary, secondary, tertiary, and recovery consequence stages at an honestly declared fidelity.","scope":"Disaster engine","authority":"Explicit user requirement","evidence":"User request 2026-09-28","validation_method":"Automated catalog count and schema tests plus runnable scenario smoke tests.","last_checked":"revision 1","status":"active","recheck_trigger":"Hazard catalog or schema changes"}
-->
### INV-004 — Minimum forty disaster types
- **State:** `requested`
- **Rule:** At least 40 distinct scenario types must be runnable through the common engine.
- **Status:** active
<!-- /operational-state:entry -->

<!-- operational-state:entry
{"id":"INV-005","title":"Web and wrapper share one core","state":"requested","rule":"GitHub Pages and the native wrapper must execute the same production web bundle and scenario/data contracts; no forked simulation implementation is allowed.","scope":"Deployment and wrapper","authority":"Explicit user requirement","evidence":"User requested Pages plus wrapper","validation_method":"Build provenance and wrapper smoke test against the same dist artifact.","last_checked":"revision 1","status":"active","recheck_trigger":"Build, Pages, or wrapper changes"}
-->
### INV-005 — Web and wrapper share one core
- **State:** `requested`
- **Rule:** Pages and native wrapper consume one web core.
- **Status:** active
<!-- /operational-state:entry -->

<!-- operational-state:entry
{"id":"INV-006","title":"No offensive optimization surface","state":"requested","rule":"Nuclear and infrastructure disaster modules may visualize educational/civilian effects, but the product must not include a feature that optimizes real-world targets, maximizes casualties, recommends strike parameters, or ranks vulnerable military targets.","scope":"Nuclear and infrastructure scenarios","authority":"Safety/product-purpose boundary","evidence":"Planning decision 2026-09-28","validation_method":"UI and code review for optimization/ranking endpoints and objective functions.","last_checked":"revision 1","status":"active","recheck_trigger":"Nuclear, military, targeting, or optimization feature changes"}
-->
### INV-006 — No offensive optimization surface
- **State:** `requested`
- **Rule:** Consequence visualization is allowed; target/impact optimization is not.
- **Status:** active
<!-- /operational-state:entry -->

## 5. Verified Working Behavior

None yet.

## 6. Known Not Working

None observed yet. No runtime exists to test.

## 7. Implemented but Unverified

None yet.

## 8. Unknown or Evidence-Stale State

<!-- operational-state:entry
{"id":"UNK-001","title":"World_Set reference repository unavailable","state":"unknown","scope":"Prior-art inspection","evidence":"GitHub connector returned 404 for westkitty/World_Set README on 2026-09-28","validation_method":"Resolve repository visibility/name and inspect if it becomes accessible.","status":"active"}
-->
### UNK-001 — World_Set reference repository unavailable
- **State:** `unknown`
- **Evidence:** The named GitHub path could not be read during the planning pass.
<!-- /operational-state:entry -->

## 9. Pending Work

<!-- operational-state:entry
{"id":"PND-001","title":"Build and verify Phase 0-1 globe","state":"pending","task":"Implement the production scaffold, Three.js globe, WGS84 coordinate model, camera/input system, data-provider interfaces, and GitHub Pages deployment.","reason_pending":"Planning phase","dependency":"MASTER_BUILD_PLAN.md and BUILD_PROMPT.md","priority":"critical","validation_needed":"Typecheck, unit tests, production build, browser smoke, Pages smoke","blocks_completion":true}
-->
### PND-001 — Build and verify Phase 0-1 globe
- **State:** `pending`
- **Priority:** critical
<!-- /operational-state:entry -->

<!-- operational-state:entry
{"id":"PND-002","title":"Implement disaster and consequence engines","state":"pending","task":"Implement the shared disaster registry, timed propagation model, consequence graph, exposure queries, scenario persistence, comparison, and at least forty runnable hazard modules.","reason_pending":"Planning phase","dependency":"Globe/data foundation","priority":"critical","validation_needed":"Catalog/schema tests plus scenario smoke suite and model-specific checks","blocks_completion":true}
-->
### PND-002 — Implement disaster and consequence engines
- **State:** `pending`
- **Priority:** critical
<!-- /operational-state:entry -->

<!-- operational-state:entry
{"id":"PND-003","title":"Implement and validate native wrapper","state":"pending","task":"Wrap the same production web bundle using Tauri 2 unless a later evidence-backed wrapper decision supersedes it; validate desktop and Android targets separately.","reason_pending":"Planning phase","dependency":"Stable web build","priority":"high","validation_needed":"Wrapper build and launch smoke on supported targets","blocks_completion":true}
-->
### PND-003 — Implement and validate native wrapper
- **State:** `pending`
- **Priority:** high
<!-- /operational-state:entry -->

## 10. Active Decisions, Defaults, and Prohibitions

- Default renderer: Three.js WebGLRenderer. WebGPU may be an experimental tier later, never the only path without compatibility proof.
- Coordinate authority: WGS84 geodetic coordinates with ECEF/ENU conversions and camera-relative/floating-origin rendering for local high-detail scenes.
- Open building baseline: Overture Maps / OpenStreetMap-derived geometry where practical; optional provider adapters may supply higher-fidelity 3D Tiles.
- Static-delivery design: no required custom application server for core playback; remote data providers may require CORS-compatible endpoints, preprocessing, or optional proxy services.
- Native wrapper default: Tauri 2 because it can host the same HTML/JS/CSS core across desktop and mobile; final support claims require target-specific proof.
- Nuclear models are educational consequence models, not strike-planning systems.
- Do not treat map coverage, building footprint availability, or rendered 3D extrusion as proof of structural accuracy.

## 11. Validation and Evidence Matrix

| ID | Claim | State | Required proof | Recheck trigger |
|---|---|---|---|---|
| INV-001 | Three.js owns the primary 3D runtime | requested | Runtime renderer/scene inspection | renderer/framework change |
| INV-002 | Outputs disclose model fidelity/uncertainty | requested | schema + UI test | model/source change |
| INV-003 | Data is streamed with bounded LOD | requested | network/bundle/memory observation | data pipeline change |
| INV-004 | >=40 hazard types are runnable | requested | catalog count + smoke suite | hazard catalog change |
| INV-005 | Pages and wrapper share one core | requested | artifact identity + wrapper smoke | deployment change |
| INV-006 | No offensive optimizer exists | requested | code/UI audit | targeting/optimization change |
| UNK-001 | World_Set reference content | unknown | repository access | source access change |

## 12. Current Change Scope and Impact Radius

Current scope is planning, repository governance, precedent research, deployment scaffolding, and a minimal non-claiming web baseline. No disaster behavior may be promoted to verified until runnable evidence exists.

## 13. Compact Revision Log

- **r1 — 2026-09-28:** Bootstrapped project state from explicit request and the initialized repository. Locked renderer authority, fidelity rules, streaming/LOD requirement, >=40 hazard requirement, shared wrapper/web core, and no-offensive-optimizer boundary.
