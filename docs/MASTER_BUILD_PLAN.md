# Doom Map — Master Build Plan

## 0. Mission

Build a Three.js-first global disaster and consequence simulator that moves smoothly from whole-Earth scale to best-available local building scale, animates disasters through time, shows secondary and tertiary consequences, compares alternate scenarios, and runs from one static web artifact on GitHub Pages and inside a native wrapper.

The engine must feel cinematic without disguising uncertainty. It must be interactive enough to explore like a globe, analytical enough to interrogate like a GIS, and deterministic enough to replay and compare scenarios.

## 1. Non-negotiable product laws

1. Three.js owns the primary 3D canvas, camera, scene graph, shaders, VFX, and visible globe.
2. WGS84 is the geographic authority. Use geodetic latitude/longitude/height, ECEF, and local ENU frames.
3. Global detail is progressive. Terrain, imagery, vectors, buildings, infrastructure, and population are streamed by region and LOD.
4. The renderer never becomes simulation authority.
5. The simulation never becomes the UI state store.
6. Every disaster type implements one shared schema and lifecycle.
7. Every effect reports provenance, model class, timestamp, assumptions, and uncertainty.
8. Scenario state must be serializable and seekable.
9. Pages and the native wrapper execute the same production web bundle.
10. No feature may optimize real-world casualties or military target selection.

## 2. Recommended technology baseline

### Runtime
- TypeScript strict mode
- Vite
- Three.js WebGLRenderer
- Web Workers for propagation, exposure, raster/vector decoding, and expensive consequence calculations
- IndexedDB for caches, scenarios, bookmarks, offline metadata, and replay checkpoints
- Service Worker for app-shell/offline fallback
- Vitest for deterministic unit tests
- Playwright for browser acceptance and runtime checks

### Geospatial
Use Three.js as renderer and selectively borrow proven geospatial mechanisms:
- 3d-tiles-renderer for streamed 3D Tiles
- PMTiles for static-host-friendly vector/raster archives
- GeoTIFF/COG readers for remote raster windows
- MVT for streets, boundaries, buildings, infrastructure
- GeoJSON for bounded event feeds and fixtures
- Turf or project-owned geodesy helpers for bounded spatial operations
- custom WGS84/ECEF/ENU conversion and floating-origin layer

Do not replace the project with a Cesium Viewer. Cesium, iTowns, Giro3D, deck.gl, MMGIS, Terria, and MapLibre are precedent and algorithm/data-format references.

### Wrapper
Default: Tauri 2.

Reason: it can package the same web frontend for macOS, Windows, Linux, Android, and iOS without requiring a second rendering implementation. Wrapper-specific capabilities remain adapters around the web core.

## 3. Spatial architecture

### 3.1 Coordinate stack

Keep four explicit spaces:
1. Geodetic: latitude, longitude, ellipsoid height.
2. ECEF: Earth-centered, Earth-fixed Cartesian coordinates in meters.
3. ENU/local tangent frame: high-detail local calculations around a focus point.
4. Render-relative coordinates: camera-relative/floating-origin coordinates safe for GPU Float32 precision.

Never store authoritative feature positions only as Three.js vectors.

### 3.2 Globe LOD ladder

- L0 orbital: Earth ellipsoid, day/night, clouds, atmosphere, country outlines.
- L1 continental: coastlines, admin boundaries, global hazard fields.
- L2 regional: terrain, hydrography, roads, population grids, major infrastructure.
- L3 metro: high-resolution terrain, detailed vectors, building footprints.
- L4 local: extruded/building 3D Tiles, roads, detailed context where sources allow.
- L5 inspection: selected structures and local consequence probes.

Transitions must replace/fade cleanly rather than create overlapping duplicate worlds.

### 3.3 Tile manager

Every tile/data request tracks provider ID, dataset version, bounds, LOD, content hash when available, priority, memory estimate, GPU estimate, last-used time, abort controller, and lifecycle state.

Required behavior:
- frustum/geographic priority queue
- bounded concurrent downloads
- cancellation when camera exits
- CPU/decoded/GPU caches
- least-recently-used eviction
- tile replacement fades
- retry/backoff
- offline fallback
- provider health state

## 4. Data provider architecture

Every source implements a common provider contract with ID, kind, coverage, attribution, fidelity metadata, and cancellable spatial fetch.

Provider selection is policy-driven. The UI must be able to explain why a source is active.

Core baseline:
- Natural Earth for low-resolution political/coastline context
- Overture Maps and/or OpenStreetMap derivatives for roads, places, buildings, and infrastructure where licensing/delivery allow
- NASA/Copernicus elevation products for terrain
- GEBCO for global bathymetry
- WorldPop and/or GHSL for population/exposure
- USGS for earthquakes
- NASA FIRMS for active fires
- NASA EONET for event aggregation
- NOAA/NHC for tropical cyclones
- additional authoritative national/regional feeds through adapters

## 5. Simulation architecture

### 5.1 Authoritative scenario

A scenario stores schema version, ID, seed, hazard type, origin geometry, start time, validated parameters, provider snapshots, and model versions.

### 5.2 Time

Use a deterministic scenario clock with pause, play, speed scale, scrub, chapter jump, exact seek, and replay from scenario + seed + model versions.

Checkpoint only when expensive reconstruction justifies it.

### 5.3 Hazard module contract

Every hazard module provides:
- manifest and model metadata
- parameter validation
- initialization
- deterministic advance
- point/area sampling
- footprint generation
- consequence event emission

No hazard module directly manipulates Three.js objects.

### 5.4 Consequence graph

Hazard -> physical footprint -> exposed assets/population/ecosystem -> direct failures -> network degradation -> cascading failures -> displacement/economic/ecological effects -> recovery -> changed future vulnerability.

Every consequence node records parent IDs, time range, geometry, severity, confidence, provenance/model, affected systems, recovery state, and display hints.

## 6. Disaster catalog

The initial implementation target is 50+ modules grouped by mechanism. See docs/DISASTER_CATALOG.md.

The first production milestone does not require 50 research-grade solvers. It requires 50 schema-valid runnable modules with honest fidelity classes, plus a smaller deeply validated flagship set.

Flagship models:
1. Nuclear detonation effects
2. Asteroid/comet impact
3. Earthquake
4. Tsunami
5. Tropical cyclone
6. River flood
7. Coastal storm surge
8. Wildfire
9. Volcanic eruption
10. Tornado/severe convective outbreak
11. Extreme heat
12. Infrastructure cascade

## 7. Nuclear module

Replicate the interaction philosophy of NUKEMAP, not its exact UI.

Support:
- geographic placement
- yield presets/custom yield
- burst mode/height
- fireball
- multiple blast overpressure contours
- thermal contours
- prompt-radiation contours
- fallout plume as a separate model
- population/infrastructure exposure
- uncertainty and model citations
- time animation from detonation through delayed effects
- A/B comparison

Do not implement target optimization, casualty maximization, military-target ranking, or automatic weapon-selection recommendations.

## 8. Reusable consequence systems

### Physical
Pressure/impulse, thermal flux, radiation dose, ground acceleration, inundation depth/velocity, wind field, heat index, ash/debris loading, ejecta, fire spread, plume/advection, landslide susceptibility, structural-damage proxy.

### Infrastructure
Graph-backed electric power, roads, rail, bridges, ports, airports, telecom/fiber, water, wastewater, fuel, hospitals, and emergency services.

Nodes and edges may be degraded, disabled, restored, or capacity-limited.

### Population
Population is exposure, not a bag of simulated individuals. Track exposed population ranges, displacement estimates, access loss, evacuation-zone overlap, service isolation, hospital accessibility, confidence, and source timestamp.

### Ecological
Burn scars, vegetation loss, water-contamination proxy, habitat disturbance, coastal erosion, ash/debris deposition, and long-lived contamination where applicable.

### Recovery
Emergency response, route reopening, utility restoration, temporary shelter, reconstruction, ecological recovery, persistent scars, and alternate recovery policies.

## 9. Visual system

World rendering:
- WGS84 ellipsoid
- atmosphere
- sun and terminator
- night-light layer
- cloud/weather overlays when sources permit
- terrain-aware horizon
- restrained star field

Disaster VFX use a data-driven sequence: warning -> onset -> peak -> propagation -> residue -> recovery.

Examples include expanding shock shells, heat bloom, seismic wavefronts, tsunami bands, cyclone wind fields, smoke/ash plumes, wildfire fronts, storm surge, debris/ejecta, infrastructure blackout, and persistent scars.

VFX is downstream of authoritative state.

## 10. Interface

The Earth is the primary interface.

Default chrome:
- disaster picker
- search
- time controls
- scenario status
- fidelity/source indicator
- selected-location inspector

Expandable workspaces:
- Hazard
- Consequences
- Layers
- Population
- Infrastructure
- Science
- Compare
- Export
- Performance

Interaction:
- drag/touch drag: orbit
- modified/middle/right drag: pan/local frame movement
- wheel/pinch: continuous zoom
- double click/tap: fly-to
- search: place/country/address provider
- click/tap: select
- long press or explicit tool: place scenario origin
- keyboard-accessible equivalents for essential controls

Cinematic camera automation immediately yields to user input.

## 11. Scenario persistence

Portable JSON export/import contains scenario, provider/model versions, camera/bookmarks, overlays, branch graph, notes, and checksums.

Small scenarios may serialize to shareable URL state.

## 12. Comparison

A/B synchronized time, split screen/swipe divider, delta heat maps, exposure-range deltas, infrastructure-capacity deltas, timeline differences, recovery deltas, and model/source parity warnings.

## 13. Performance and quality

Use budgets rather than assuming 60 FPS.

Desktop starting target:
- <=2.5 s app-shell interactive on warm broadband
- <=300 ms camera response after input
- no unbounded tile growth
- no unbounded GPU-resource growth after repeated region changes
- 30 FPS minimum Balanced tier on representative mid-range desktop hardware during typical scenes

Quality tiers:
- Ultra
- High
- Balanced
- Low
- Safe

Degrade particles, shadows, label density, building detail, and post-processing before degrading simulation correctness.

Mobile/tablet uses a capped DPR, smaller tile residency, fewer particles, reduced post-processing, and practical 44 CSS px controls.

Do not claim device performance without device evidence.

## 14. Project structure

src/app
src/core/clock
src/core/coordinates
src/core/workers
src/core/events
src/core/quality
src/globe/renderer
src/globe/camera
src/globe/terrain
src/globe/imagery
src/globe/atmosphere
src/globe/labels
src/globe/buildings
src/globe/tiles
src/data/providers
src/data/cache
src/data/schemas
src/data/provenance
src/hazards/registry
src/hazards/nuclear
src/hazards/impact
src/hazards/seismic
src/hazards/tsunami
src/hazards/weather
src/hazards/fire
src/hazards/volcanic
src/hazards/climate
src/hazards/infrastructure
src/hazards/space
src/consequences/graph
src/consequences/exposure
src/consequences/population
src/consequences/infrastructure
src/consequences/ecology
src/consequences/recovery
src/vfx
src/scenario
src/ui
src/wrapper
tests/unit
tests/browser
tests/fixtures
docs

## 15. Implementation phases

### Phase 0 — Repository and evidence spine
Create TypeScript/Vite project, strict config, CI, tests, Pages workflow, model/data manifests, and source-attribution machinery.
Exit: typecheck/test/build pass; Pages artifact builds under /Doom_Map/.

### Phase 1 — Earth
Implement WGS84 ellipsoid, ECEF/ENU, floating origin, Three.js lifecycle, orbit/pan/zoom, search/provider interface, labels, terminator, quality tiers.
Exit: browser can navigate whole Earth to local coordinates without precision failure.

### Phase 2 — Geospatial streaming
Implement terrain/vector/building provider interfaces, tile scheduler, abort/eviction, PMTiles/MVT/GeoJSON/3D Tiles adapters, provenance UI.
Exit: regional detail appears/disappears correctly; no unbounded cache growth.

### Phase 3 — Scenario/time core
Implement scenario schema, seeded runtime, clock, seek/replay, bookmarks, import/export, URL state.
Exit: deterministic fixture survives reload/export/import.

### Phase 4 — Nuclear + impact flagship
Implement nuclear and asteroid/comet models using separate physical/presentation layers.
Exit: documented reference fixtures pass; UI exposes fidelity and assumptions.

### Phase 5 — Earth systems
Earthquake, tsunami, landslide, volcano, flood, storm surge.

### Phase 6 — Atmosphere/fire
Cyclone, tornado, severe storm, hail, lightning, blizzard, wildfire, smoke, heat/cold/drought.

### Phase 7 — Consequence engine
Population exposure, infrastructure graph degradation, hospitals/access, cascading utilities, ecological residue, recovery.

### Phase 8 — Expand catalog to >=40
Add remaining registry modules. Every module gets at least one deterministic smoke fixture.

### Phase 9 — Comparison and cinematic mode
A/B comparison, branch tree, camera director, animated consequences, timeline chapters.

### Phase 10 — Wrapper
Tauri 2 integration using the same dist artifact. Desktop first, Android second.

### Phase 11 — Release hardening
Long-session lifecycle, context loss, offline fallback, accessibility, performance baselines, source/license audit, Pages smoke, wrapper smoke.

## 16. GitHub Pages

GitHub Actions workflow:
1. checkout
2. setup Node
3. npm ci
4. typecheck
5. unit tests
6. build with Vite base /Doom_Map/
7. upload Pages artifact
8. deploy Pages

Do not make dev mode depend on Pages-specific absolute paths.

## 17. Wrapper contract

The wrapper loads the same built frontend, exposes optional filesystem/share/open-external/native-status APIs through a thin bridge, never owns simulation state, never forks model logic, and never requires cloud credentials for core functionality.

## 18. Verification ladder

For every phase:
1. schema/static checks
2. focused unit tests
3. production build
4. real-browser smoke
5. lifecycle/memory check when resources changed
6. Pages deployment smoke when deployment changed
7. wrapper smoke when wrapper changed

Allow one bounded repair pass after a failed gate. Do not loop blindly.

## 19. Definition of done

Complete means:
- Earth is interactively navigable across scales
- data streams by LOD with visible provenance
- >=40 disaster modules are runnable
- flagship models have reference tests
- consequence graphs animate through recovery
- seek/replay/import/export work
- comparison works
- Pages serves the production build
- wrapper launches the same artifact
- tested scenarios show no unbounded lifecycle growth
- source/license/fidelity/uncertainty documentation is complete
- OPERATIONAL_STATE.md reflects verified rather than merely planned state
