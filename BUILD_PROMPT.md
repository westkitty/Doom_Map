# Doom Map — Full Build Prompt

You are the implementation agent for the repository:

https://github.com/westkitty/Doom_Map

Your job is to build Doom Map from the repository's governing documents, not from memory or improvisation.

## Read first, in order

1. OPERATIONAL_STATE.md
2. AGENTS.md
3. docs/MASTER_BUILD_PLAN.md
4. docs/PRECEDENT_RESEARCH.md
5. docs/DATA_SOURCE_MATRIX.md
6. docs/DISASTER_CATALOG.md
7. README.md

Treat those files as the controlling project contract. If they conflict, apply this authority order:
1. newest explicit user instruction
2. OPERATIONAL_STATE.md active invariant/decision
3. MASTER_BUILD_PLAN.md
4. AGENTS.md
5. other project docs
6. implementation inference

Do not ask the user to repeat information already available in the repository.

## Mission

Build a production-quality Three.js-first interactive global disaster and consequence simulator that:

- renders a panable, zoomable, spinnable WGS84 Earth;
- can transition from planetary scale to best-available building-scale detail;
- streams terrain, imagery, vectors, population, infrastructure, and buildings by LOD rather than bundling global detail;
- supports at least 40 runnable disaster types through one data-driven hazard registry;
- animates primary, secondary, tertiary, and recovery consequences over time;
- supports pause, play, scrub, seek, replay, branching, comparison, import/export, and shareable state;
- exposes provenance, timestamp, model class, uncertainty, and limitations for every model/data source;
- deploys to GitHub Pages under /Doom_Map/;
- runs the exact same built web core inside a native wrapper;
- does not become a casualty-maximization, military-target-ranking, or strike-optimization tool.

The target catalog in docs/DISASTER_CATALOG.md is larger than 40. Implement in phases rather than trying to fake 100 deep scientific solvers at once.

## Repository handling

The remote repository already exists and is initialized.

If no local clone exists:
- clone https://github.com/westkitty/Doom_Map.git
- enter the repository

If already inside a valid clone:
- do not run git init again
- confirm remote origin
- confirm active branch
- fetch current remote state
- ensure work begins from current main unless the user explicitly chose another branch

Never force-push unless explicitly authorized.

Before each substantive phase:
- inspect git status
- read OPERATIONAL_STATE.md
- inspect only files relevant to the active phase first
- expand the search only when evidence shows cross-cutting impact

## Protected architecture

These are invariants.

### Renderer
Three.js owns the primary visible 3D runtime, globe, scene, camera, materials, shaders, VFX, and picking.

You may use geospatial libraries or packages for:
- data formats
- tile scheduling
- projections
- 3D Tiles
- raster/vector decoding
- geodesy
- spatial indexing

Do not silently replace the app with Cesium Viewer, MapLibre, or another renderer.

### Coordinate authority
Implement:
- WGS84 geodetic coordinates
- ECEF conversion
- local ENU frames
- camera-relative/floating-origin rendering

Authoritative positions must not live only as Three.js Float32 vectors.

### Ownership
Keep these authorities distinct:
- scenario/time engine owns temporal state
- hazard modules own hazard state
- consequence graph owns causal propagation
- data providers own source retrieval/normalization
- Three.js owns presentation
- DOM UI owns ordinary controls and accessibility
- IndexedDB owns local persistent caches/scenarios
- wrapper owns only native integration surfaces

No second simulation authority.

## Required base stack

Default unless project evidence proves a better compatible choice:
- TypeScript strict mode
- Vite
- Three.js WebGLRenderer
- Vitest
- Playwright
- Web Workers
- IndexedDB
- Service Worker/PWA shell
- Tauri 2 wrapper

Pin production runtime dependencies deliberately. Do not add packages just because they are convenient.

Before adding a dependency:
1. prove the existing stack does not already solve the need cleanly;
2. verify maintenance/license/current compatibility;
3. document why it is needed;
4. keep a rollback path.

## Phase plan

Execute in this order. Do not jump ahead merely to make screenshots look impressive.

### Phase 0 — Project spine

Create or complete:
- package.json
- package lockfile
- strict tsconfig
- Vite config with correct GitHub Pages base behavior
- source/test directory structure
- lint/typecheck/test/build scripts
- Playwright setup
- GitHub Actions CI
- GitHub Pages deployment workflow
- source/data/model manifest schemas
- attribution/provenance plumbing
- baseline performance instrumentation
- error boundary / unsupported-browser state

Acceptance:
- npm ci works
- typecheck passes
- unit tests pass
- production build succeeds
- output uses /Doom_Map/ correctly
- CI runs the same checks
- Pages workflow produces the expected artifact

### Phase 1 — Globe foundation

Implement:
- WGS84 ellipsoid
- geodetic <-> ECEF
- local ENU transform
- floating origin / camera-relative rendering
- orbit/spin
- local pan
- continuous wheel/pinch zoom
- double-click/tap fly-to
- keyboard-accessible camera equivalents
- sun/terminator
- atmosphere
- low-LOD coast/country layer
- selection raycasting
- camera bookmarks
- quality tiers and safe mode
- resize/context-loss handling

Acceptance:
- whole-Earth to local zoom remains numerically stable
- camera controls work by mouse, touch, and keyboard
- resize does not corrupt projection
- context loss reports recoverable state
- no unbounded renderer resources during repeated camera movement

### Phase 2 — Geospatial streaming

Implement common DataProvider and tile lifecycle contracts.

Support, where justified:
- GeoJSON
- MVT
- PMTiles
- GeoTIFF/COG
- 3D Tiles

Implement:
- tile priority queue
- bounded concurrency
- cancellation
- CPU/decoded/GPU caches
- LRU eviction
- provider health
- attribution
- coverage
- source timestamp/version
- LOD transitions
- best-available building provider selection

Use open/global baselines from docs/DATA_SOURCE_MATRIX.md and make paid/keyed providers optional adapters only.

Acceptance:
- moving across regions loads and unloads data cleanly
- global buildings are never loaded at once
- a local region can reach building-footprint or 3D-building detail where source coverage permits
- UI identifies provider and fidelity
- provider failure produces an explicit fallback/unavailable state
- memory/GPU counts stop growing after repeated region changes

### Phase 3 — Scenario and time core

Implement:
- versioned scenario schema
- seeded PRNG
- deterministic scenario clock
- play/pause
- time multiplier
- exact seek
- scrub
- replay
- chapter/event markers
- bookmarks
- import/export
- URL state for compact scenarios
- IndexedDB scenario vault
- schema migration
- provider/model version snapshots

Acceptance:
- same fixture + seed + model versions reproduce the same deterministic outputs in the tested runtime
- export/import preserves the scenario
- seek reconstructs state rather than reversing visual frames
- stale worker results are rejected

### Phase 4 — Hazard framework

Implement HazardModule and HazardManifest contracts.

Each hazard must expose:
- ID/category
- validated parameters
- source/model references
- fidelity class
- uncertainty
- init
- deterministic advance where applicable
- sample query
- footprint geometry
- consequence emissions
- visual hints only, not visual authority

Build the registry and catalog browser before filling the catalog.

Acceptance:
- schema rejects invalid hazard definitions
- modules can be activated/deactivated without leaking state
- every registered module has a deterministic smoke fixture

### Phase 5 — Flagship scientific models

Implement and validate first:
1. nuclear airburst/surface burst
2. asteroid/comet impact
3. earthquake finite fault
4. tsunami
5. tropical cyclone
6. river flood
7. storm surge
8. wildfire
9. explosive volcano
10. tornado/severe convective event
11. extreme heat
12. regional blackout/infrastructure cascade

For each:
- research current authoritative/open references before encoding formulas
- document assumptions
- create reference fixtures
- label outputs calculated, reduced-order, data-driven, or illustrative
- use ranges where precision is not justified
- keep VFX separate

Nuclear-specific safety boundary:
- consequence visualization is allowed
- do not add target recommendation
- do not rank targets
- do not optimize yield/location for casualties or military effect
- do not provide an objective function whose purpose is maximizing harm

### Phase 6 — Consequence graph

Implement reusable consequence systems:
- physical exposure
- building/asset exposure
- population exposure ranges
- roads/bridges
- power
- telecom/fiber
- water/wastewater
- ports/airports
- fuel/logistics
- hospitals/emergency access
- ecological residue
- displacement
- restoration/recovery

Every consequence event records parent links so users can inspect why it happened.

Acceptance:
- one primary hazard can create a multi-stage causal chain
- removing/rewinding the cause reconstructs downstream state correctly
- consequence UI exposes causal parentage and confidence

### Phase 7 — VFX and cinematic communication

Build reusable data-driven sequences:
- warning
- onset
- peak
- propagation
- residue
- recovery

Support effects such as:
- shock fronts
- thermal bloom
- radiation/fallout visualization
- seismic waves
- tsunami bands
- smoke/ash
- wildfire front
- cyclone wind field
- storm surge
- debris/ejecta
- blackout
- long-lived scars

Rules:
- no VFX object becomes simulation authority
- reduced-motion mode must exist
- quality tiers reduce visual cost before reducing simulation correctness
- cinematic camera yields immediately to user input

### Phase 8 — Expand to >=40 runnable hazards

Use docs/DISASTER_CATALOG.md.

Do not implement forty copy-pasted modules. Reuse mechanism families:
- plume/advection
- moving swath
- radial field
- raster field
- network cascade
- inundation
- slope/runout
- long-duration stress
- compound composition

Each registered hazard still needs:
- unique manifest
- valid parameter schema
- honest fidelity
- runnable footprint/time behavior
- consequence hooks
- smoke fixture

Acceptance:
- automated catalog test confirms >=40 runnable hazard IDs
- every ID can initialize, advance or resolve its static state, sample, and emit a result without crashing

### Phase 9 — Comparison, branching, and recovery

Implement:
- A/B synchronized comparison
- swipe/split mode
- delta layers
- branch tree
- scenario fork
- exposure delta
- infrastructure delta
- timeline delta
- recovery-time delta
- source/model mismatch warning

### Phase 10 — Native wrapper

Use Tauri 2 unless current implementation evidence justifies switching.

The wrapper must:
- package/load the same dist artifact used for Pages
- expose only thin native adapters
- not fork simulation/model code
- work offline for bundled app shell and cached data
- expose clear network/data-source states

Validate desktop first, Android second.

Do not claim iOS/Windows/Linux support merely because Tauri supports those platforms; claim only tested targets.

### Phase 11 — Release hardening

Run:
- typecheck
- focused unit tests
- complete unit suite
- production build
- Playwright browser acceptance
- visual fixtures where deterministic
- repeated region streaming/unloading
- renderer.info / memory-resource checks
- scenario load/unload loops
- context-loss/recovery
- reduced-motion path
- keyboard path
- touch emulation path
- offline shell
- Pages deployment smoke
- wrapper launch smoke
- dependency/license/data-attribution audit
- public-copy/autonomous-artifact scrub

## UI contract

The globe is the product surface, not a dashboard with a globe trapped in a card.

Default UI stays restrained:
- disaster selector
- search
- time
- scenario status
- fidelity/source status
- current selection

Deeper panels are summonable:
- Hazard
- Consequences
- Layers
- Population
- Infrastructure
- Science
- Compare
- Export
- Performance

Do not flood the screen with permanent telemetry.

Use semantic DOM for ordinary UI. Keep focus visible. Respect reduced motion. Keep practical touch targets around 44 CSS px or larger.

## Scientific truth contract

Every visible model result must be traceable to:
- model ID/version
- source/reference
- data timestamp/version when applicable
- fidelity class
- assumptions
- uncertainty/limitations

Forbidden:
- invented precision
- unlabeled interpolation
- treating a data feed as a physical solver
- treating visual particles as measurements
- claiming structure-level damage precision without structure-level inputs
- claiming exact current population occupancy from static population rasters

## Building-level contract

"Building level" means best-available individual footprints/3D objects where source coverage allows.

Never imply:
- universal completeness
- survey-grade geometry
- known occupancy
- known materials
- known structural resistance

If a height is inferred or default-extruded, mark it as inferred.

## Performance contract

Use adaptive quality tiers:
- Ultra
- High
- Balanced
- Low
- Safe

The simulation remains authoritative at every tier.

Implement:
- capped DPR
- bounded tile residency
- bounded particle budgets
- bounded labels
- dynamic post-processing
- renderer-resource counters
- frame-time rolling statistics

Never publish hardware performance claims without representative hardware evidence.

## Data/network contract

Core playback must not require a custom backend.

Remote providers must go through adapters with:
- CORS/availability handling
- timeout
- retry/backoff
- cache policy
- attribution
- failure state

Do not hotlink assets or data without documented terms.

If a source requires a secret:
- do not embed the secret in Pages
- make the provider optional or design a separately approved proxy path
- preserve a keyless baseline

## Validation strategy

Use this escalation:
1. static/schema/type checks for affected code
2. focused unit tests
3. relevant integration/browser tests
4. production build
5. broader suite when the change is cross-cutting or release-bound
6. deployment/wrapper checks when those surfaces changed

Allow one bounded repair pass if validation fails. If still failing, stop and report the earliest unresolved failure and evidence.

Do not burn quota by repeatedly running the same failing command without new evidence.

## Git and delivery contract

For every meaningful completed phase:
1. inspect git status
2. run required validation
3. inspect the diff/changed files
4. update OPERATIONAL_STATE.md only for material verified/unverified state changes
5. git add only intended files
6. git commit with a descriptive phase-scoped message
7. git push the active branch
8. verify remote branch SHA equals local HEAD
9. if main is deployed by Pages workflow, inspect workflow/deployment result
10. never claim deployed until the live Pages URL is actually reachable and the relevant smoke path succeeds

The repository already exists. Do not create a second unrelated repository.

## Completion report after each phase

Return only:
- phase completed
- important behavior added
- files changed
- validation commands and results
- Pages/wrapper evidence if applicable
- known unverified items
- commit SHA and remote parity

Do not dump hidden reasoning or giant raw logs.

## Stop condition

Stop when the active phase acceptance criteria pass and the changes are committed/pushed. Then proceed to the next phase only if the current task authorizes the full beginning-to-end build. If the environment, credentials, data terms, device access, or a failed gate prevents honest continuation, preserve the strongest verified state and report the exact blocker rather than pretending completion.
