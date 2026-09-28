# Doom Map — Precedent Research

## Research rule

This is a contrastive precedent corpus, not a dependency shopping list. The project borrows mechanisms, standards, test patterns, and UX ideas. Every external dependency still requires compatibility, maintenance, license, performance, and rollback review before adoption.

The corpus intentionally exceeds the requested minimum of 50 external projects.

## Internal westkitty projects reviewed

1. https://github.com/westkitty/DexEarth
   - Steal: geospatial layer lifecycle, time controller, IndexedDB cache, threat/correlation concepts, LOD labels, safe mode, cinematic tours.
   - Adapt: DexEarth uses Cesium as renderer; Doom Map keeps Three.js as renderer authority.

2. https://github.com/westkitty/Planet_Killer
   - Steal: deterministic seekable catastrophe timeline, consequence probes, honest reduced-order science labels, camera ownership, scenario export.
   - Adapt: expand from one impact domain to a common hazard registry.

3. https://github.com/westkitty/3js-VFX-platform
   - Steal: deterministic VFX sequences, residue lifecycle, world mutation transactions, performance/leak gates, visual fixtures.
   - Adapt: VFX remains subordinate to geospatial hazard state.

4. https://github.com/westkitty/modern_3d_browser_game_toolkit
   - Steal: explicit runtime ownership, fixed-step examples, lifecycle teardown, IndexedDB streaming/save references, performance instrumentation.
   - Adapt: globe navigation replaces character/gameplay movement.

5. https://github.com/westkitty/Causal-Civilization-Engine
   - Steal: Worker simulation, causal graphs, branch comparison, stale-response rejection, evidence discipline.
   - Adapt: causal state models infrastructure/recovery rather than centuries of civilization.

6. https://github.com/westkitty/Star_System_Planner
   - Steal: floating origin, worker forecasts, branch/event ledger, quality-gated tablet interaction.
   - Adapt: WGS84/ECEF/ENU replaces astronomical coordinate authority.

7. https://github.com/westkitty/Event-Horizon-Forge
   - Steal: capability tiers, universe-as-interface principle, fidelity classifications, strict distinction between calculated/surrogate/illustrative output.
   - Avoid: requiring WebGPU for the main path.

8. https://github.com/westkitty/century_engine
   - Steal: deterministic replay, timeline scrubbing, permanent scars, simulation/render separation, static hosting/offline design.
   - Adapt: spatial state is planetary and tile-streamed.

9. https://github.com/westkitty/orbital_scrapper
   - Steal: explicit subsystem authority, complete-loop validation, Pages subpath discipline, wrapper-ready static runtime patterns.
   - Adapt: no rigid-body physics authority is needed globally.

10. https://github.com/westkitty/World_Set
   - Evidence state: unavailable to the connector during this pass. Do not claim lessons until access is resolved.

## Deep external precedents

11. https://github.com/CesiumGS/cesium
   - Demonstrates high-precision WGS84 globe rendering, massive streamed datasets, 3D Tiles, imagery, terrain, and dynamic data.
   - Adopt concept: geospatial precision and streaming.
   - Do not adopt as primary renderer because Three.js ownership is a project invariant.

12. https://github.com/iTowns/itowns
   - Three.js-based geospatial framework supporting WMS/WMTS/TMS/MVT/3D Tiles/GeoJSON and terrain.
   - Strong proof that Three.js can remain the rendering foundation while handling serious GIS formats.

13. https://github.com/giro3d-org/Giro3D
   - Three.js geospatial scenes, terrain, GeoTIFF, vector tiles, point clouds, 3D Tiles.
   - Strong reference for modular geospatial source adapters and high-resolution terrain.

14. https://github.com/NASA-AMMOS/3DTilesRendererJS
   - Three.js 3D Tiles renderer with region loading, LOD, metadata, PMTiles/vector overlays, terrain and provider examples.
   - High-transfer candidate for Doom Map's optional massive-3D adapter.

15. https://github.com/NASA-AMMOS/MMGIS
   - NASA multi-mission geospatial system.
   - Steal: disciplined layer/config architecture, mission-style inspection, scientific-map interaction patterns.

16. https://github.com/maplibre/maplibre-gl-js
   - Open vector-tile map renderer.
   - Steal: MVT styling, tile lifecycle, labeling, source/layer separation. Use as reference or auxiliary 2D logic, not primary 3D canvas.

17. https://github.com/visgl/deck.gl
   - High-performance large-dataset visualization and picking.
   - Steal: layer abstraction, GPU aggregation ideas, data-driven visual layers.

18. https://github.com/protomaps/PMTiles
   - Serverless single-file tiled archives with HTTP range access.
   - Adopt strongly for static-host-friendly data bundles and cached regional datasets.

19. https://github.com/TerriaJS/terriajs
   - Rich static-deployable geospatial data explorer with huge layer catalogs and time-enabled sources.
   - Steal: catalog/source semantics, sharing, data-source diversity, graceful fallbacks.

20. https://github.com/tauri-apps/tauri
   - Shared HTML/JS/CSS frontend packaged for desktop/mobile native shells.
   - Adopt as wrapper baseline unless implementation evidence later disqualifies it.

## External corpus — geospatial rendering and globe interaction

21. https://github.com/lume/harp.gl — vector-tile 3D map/globe architecture; useful for tile/label ideas.
22. https://github.com/VCityTeam/UD-Viz — urban 3D visualization; useful for city/building inspection patterns.
23. https://github.com/openlayers/openlayers — mature source/layer/projection model; reference for GIS semantics.
24. https://github.com/mapbox/mapbox-gl-js — mature vector-tile rendering; reference for style/source separation.
25. https://github.com/keplergl/kepler.gl — large geospatial dataset exploration; reference for layer UX and filtering.
26. https://github.com/visgl/loaders.gl — streaming loaders; reference for worker-friendly decoders and format boundaries.
27. https://github.com/visgl/react-map-gl — UI integration patterns around map renderers.
28. https://github.com/protomaps/basemaps — open vector basemap pipeline reference.
29. https://github.com/mapbox/tippecanoe — vector-tile generation; offline preprocessing reference.
30. https://github.com/Turfjs/turf — geospatial operations; candidate for bounded CPU geometry helpers.
31. https://github.com/mapbox/earcut — polygon triangulation; useful for footprints/filled polygons.
32. https://github.com/mapbox/supercluster — point clustering; useful for event/marker LOD.
33. https://github.com/mapbox/vector-tile-js — MVT decoding reference.
34. https://github.com/mapbox/pbf — Protocol Buffer parsing foundation used in vector-tile stacks.
35. https://github.com/geotiffjs/geotiff.js — browser GeoTIFF/COG reading; useful for elevation/hazard rasters.
36. https://github.com/vasturiano/three-globe — Three.js globe primitives and interaction reference.
37. https://github.com/vasturiano/globe.gl — globe data-layer API reference.
38. https://github.com/vasturiano/react-globe.gl — React integration precedent.
39. https://github.com/vasturiano/three-slippy-map-globe — tiled map imagery on Three.js globe; directly relevant LOD reference.
40. https://github.com/syt123450/giojs — Three.js globe data visualization; useful interaction/arc reference.
41. https://github.com/chrisrzhou/react-globe — older React globe patterns; reference only.
42. https://github.com/earthjs/earthjs — composable globe plugin architecture; reference for modular layers.
43. https://github.com/cyanfish-x/tellux — modern 3D tiles/geospatial globe candidate; inspect before adoption.
44. https://github.com/origo-map/globe-plugin — globe integration into mapping UI; reference for mode transition concepts.
45. https://github.com/gkjohnson/three-geojson — lightweight GeoJSON-to-Three patterns.
46. https://github.com/flywave/flywave.gl — broad WebGL geospatial stack; reference candidate.
47. https://github.com/playcanvas/earthatile — tiled Earth rendering example; reference for terrain/tile ideas.
48. https://github.com/nytimes/three-loader-3dtiles — earlier Three.js 3D Tiles implementation; migration/history reference.
49. https://github.com/pixelx-jp/plateau-r3f — Japanese PLATEAU city data with R3F; useful building-scale example.
50. https://github.com/virtualcitySYSTEMS/cesium3DObjectStreaming — object-streaming precedent; reference for massive city content.
51. https://github.com/davenquinn/cesium-martini — terrain mesh generation/streaming reference.
52. https://github.com/davenquinn/cesium-vector-provider — vector-on-globe provider reference.
53. https://github.com/CesiumGS/3d-tiles-tools — 3D Tiles processing/validation reference.
54. https://github.com/gkjohnson/babylon-3dtiles-demo — cross-engine 3D Tiles behavior comparison.

## External corpus — scientific/disaster visualization

55. https://github.com/nasa-gibs/worldview
   - NASA Earth-observation imagery exploration.
   - Steal: time-aware Earth-data browsing and source transparency.

56. https://github.com/goldEli/earthquakeMap
   - Earthquake map example; useful as a small contrast to avoid overengineering event visualization.

57. https://github.com/timfuhrmann/global-disasters
   - Disaster visualization reference candidate; useful for catalog/category comparison.

58. https://github.com/ParthPan7/DisasterVisualization
   - Disaster visualization reference candidate; inspect UX/data choices before implementation.

59. https://github.com/OpenISDM/DiReCT
   - Disaster-risk context reference candidate; useful for risk communication patterns.

60. https://github.com/KnowWhereGraph/GeoGraphVis
   - Geospatial graph visualization.
   - Useful for infrastructure/cause-network overlays.

61. https://github.com/htcvszrf/cesium-wind-1
   - Wind-field visualization.
   - Useful for particle/advection presentation techniques.

62. https://github.com/HuYuxin/CIS565FinalProjectCesiumSnow
   - Large atmospheric/snow rendering experiment; visual reference, not core architecture.

63. https://github.com/bilawalsidhu/gods-eye-view
   - High-detail geospatial visualization reference; inspect streaming and presentation ideas cautiously.

64. https://github.com/cifertech/Terra-Watch
   - Earth monitoring dashboard reference candidate.

65. https://github.com/satellogic/grafana-3d-globe-panel
   - Compact telemetry-on-globe precedent.

66. https://github.com/Flowm/satvis
   - Satellite visualization precedent; useful for orbital/space-weather layers.

67. https://github.com/CesiumGS/OpenPhillyGlobe
   - Archived city-scale Cesium precedent.
   - Valuable as historical evidence for urban globe approaches; do not adopt obsolete architecture.

68. https://github.com/NICTA/cesium-simple-photogrammetry
   - Archived photogrammetry example.
   - Useful historical 3D-city loading reference only.

69. https://github.com/virtualcitySYSTEMS/cesium3DObjectStreaming
   - Repeated here intentionally as both geospatial and city-streaming evidence.

70. https://github.com/giro3d-org/Giro3D
   - Repeated category relevance: terrain, point clouds, 3D buildings, and raster sources in Three.js.

## External corpus — core rendering/runtime patterns

71. https://github.com/mrdoob/three.js
   - Primary renderer upstream; version pinning and migration source of truth.

72. https://github.com/pmndrs/react-three-fiber
   - Reference for React/Three lifecycle boundaries.
   - Doom Map should avoid high-frequency simulation state in React.

73. https://github.com/pmndrs/drei
   - Reference library of helpers; adopt only narrowly.

74. https://github.com/pmndrs/postprocessing
   - Reference for post effects; quality-tier them aggressively.

75. https://github.com/ionic-team/capacitor
   - Wrapper alternative to Tauri.
   - Keep as fallback comparator if Tauri mobile constraints become material.

## Cross-project patterns worth adopting

### 1. Progressive spatial loading is mandatory
Cesium, iTowns, Giro3D, 3D Tiles Renderer, MapLibre, deck.gl, and PMTiles all point to the same conclusion: the browser must request bounded spatial chunks, not ingest the planet.

### 2. Geospatial formats should be adapters, not architecture
MVT, GeoJSON, 3D Tiles, COG/GeoTIFF, PMTiles, and provider APIs enter through source adapters. The rest of Doom Map works against normalized internal contracts.

### 3. Time belongs in the core model
TerriaJS, NASA Worldview, DexEarth, Planet Killer, Century Engine, and Causal Civilization Engine all reinforce that time-aware data is far easier when time is a first-class system instead of an animation afterthought.

### 4. Buildings are an LOD, not the globe
Building geometry becomes valuable only after the camera reaches metro/local scales. It should never dominate global memory or network budgets.

### 5. Consequences need a graph
The project should not render a disaster as a single footprint. A causal graph allows earthquake -> bridge failure -> route isolation -> hospital access loss -> delayed recovery without hardcoding every combination.

### 6. Static hosting is compatible with rich geospatial clients
PMTiles, Terria static deployment, Century Engine, and the existing westkitty Pages projects show that a large amount of functionality can live in a static client if remote datasets are range-addressable/CORS-compatible and optional proxy needs are isolated.

### 7. Fidelity metadata is a feature
Planet Killer and Event Horizon Forge demonstrate the value of explicitly labeling calculated, reduced-order, and illustrative behavior. Doom Map should make this visible to users, not bury it in documentation.

## Patterns to avoid

- one giant scene with every building loaded
- globe coordinates stored directly as Float32 world positions
- React state updates every frame
- visual particles used as simulation state
- custom per-hazard UI/state architecture
- a single generic "accuracy" label
- silent provider fallback
- hard dependency on paid/keyed providers
- runtime hotlinks with undocumented licenses
- WebGPU-only launch requirement
- server requirement for core playback
- permanent cinematic camera control
- exact-looking casualty numbers unsupported by the model
- offensive target optimization disguised as consequence analysis

## Research saturation verdict

The external corpus now covers:
- Three.js-native geospatial frameworks
- Cesium-class globe architecture
- 3D Tiles
- vector tiles and PMTiles
- raster/COG handling
- building/city visualization
- large-data GPU layers
- time-aware Earth observation
- disaster visualization
- native wrappers
- the project's own deterministic simulation/VFX/causal systems

Additional random globe demos are unlikely to change the core architectural decision. Future research should be question-driven: a specific data provider, hazard model, performance problem, or wrapper constraint.
