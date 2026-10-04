# Doom Map — 20-Improvement Uplift Ledger (2026-10-04)

This ledger is the traceability surface for the fifth iterative uplift round. Each numbered item is a distinct requested project improvement. Source presence is necessary but not sufficient: repository CI must also typecheck, run the full Vitest suite, and build successfully before the round is marked verified.

| ID | Improvement | Primary implementation | Focused proof |
|---|---|---|---|
| U05-01 | Web Mercator lon/lat ↔ tile planning primitives | `src/geo/webMercator.ts` | `tests/geospatialPlanning.test.ts` |
| U05-02 | Antimeridian-safe viewport tile coverage | `src/geo/tileCoverage.ts` | `tests/geospatialPlanning.test.ts` |
| U05-03 | Wrapped tile prefetch-ring planning | `src/geo/prefetch.ts` | `tests/geospatialPlanning.test.ts` |
| U05-04 | Deterministic visible/prefetch tile priority scoring | `src/geo/tilePriority.ts` | `tests/geospatialPlanning.test.ts` |
| U05-05 | View-epoch cancellation for stale geodata work | `src/data/viewEpoch.ts` | `tests/geospatialPlanning.test.ts` |
| U05-06 | Explicit fresh/stale/expired data policy | `src/data/freshness.ts` | `tests/geospatialPlanning.test.ts` |
| U05-07 | Tile residency lifecycle and byte accounting | `src/data/tileResidency.ts` | `tests/geospatialPlanning.test.ts` |
| U05-08 | Composed geospatial tile store using cache, dedupe, scheduler, failover, attribution, and residency | `src/data/tileStore.ts` | `tests/tileStoreAndLayer.test.ts` |
| U05-09 | Ordered data-layer visibility/opacity state | `src/data/layerRegistry.ts` | `tests/geospatialPlanning.test.ts` |
| U05-10 | Validated GeoJSON Point extraction | `src/globe/geoJsonPointLayer.ts` | `tests/tileStoreAndLayer.test.ts` |
| U05-11 | Disposable Three.js GeoJSON point layer | `src/globe/geoJsonPointLayer.ts` | `tests/tileStoreAndLayer.test.ts` |
| U05-12 | Globe-owned add/replace/remove/dispose data-layer API | `src/globe/GlobeApp.ts` | strict TypeScript + production build |
| U05-13 | Reference provider now reaches the actual Three.js scene through the tile-store pipeline | `src/data/referenceDataController.ts`, `src/main.ts` | `tests/tileStoreAndLayer.test.ts` + build |
| U05-14 | Streaming and attribution telemetry included in copied diagnostics | `src/main.ts`, `src/data/referenceDataController.ts` | strict TypeScript + production build |
| U05-15 | Scenario runtime blocks model-version drift | `src/scenario/compatibility.ts`, `src/scenario/runtime.ts` | `tests/scenarioAdvanced.test.ts` |
| U05-16 | Provider snapshot compatibility validation | `src/scenario/compatibility.ts` | `tests/scenarioAdvanced.test.ts` |
| U05-17 | Deterministic runtime input journal | `src/scenario/inputJournal.ts`, `src/scenario/runtime.ts` | `tests/scenarioAdvanced.test.ts` |
| U05-18 | True checkpoint restoration of clock, RNG, hazard state, queued events, consequences, emissions, and journal | `src/scenario/runtime.ts`, `src/sim/clock.ts`, `src/sim/random.ts`, `src/sim/eventQueue.ts`, `src/consequences/graph.ts` | `tests/scenarioAdvanced.test.ts` |
| U05-19 | Deterministic scenario batch runner | `src/scenario/batch.ts` | `tests/scenarioAdvanced.test.ts` |
| U05-20 | Scenario outcome comparison utility | `src/scenario/compare.ts` | `tests/scenarioAdvanced.test.ts` |

## Protected behavior

- Three.js remains the render authority.
- The minimized progressive-disclosure UI remains the default.
- The reference geodata is still explicitly illustrative fidelity-D fixture data.
- The reference pulse remains a non-physical engineering fixture.
- No offensive targeting/casualty-optimization surface is introduced.
- CI and Pages continue to use the committed lockfile and `npm ci`.

## Completion rule

This round is complete only when:
1. all 20 implementation paths above exist on GitHub `main`;
2. all focused tests are present on GitHub `main`;
3. GitHub CI passes `npm ci`, strict TypeScript, the complete Vitest suite, and production build;
4. GitHub Pages build/deploy succeeds;
5. the final remote commit is re-read and the 20 mappings above are confirmed against the repository.
