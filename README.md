# Doom Map

**Doom Map** is a Three.js-first global disaster and consequence simulator: a fully interactive, panable, zoomable, spinnable Earth that can move from planetary scale to best-available building-scale geometry, run disaster scenarios through time, and visualize not only the initiating event but the physical, infrastructure, population, ecological, and recovery consequences that follow.

This repository is intentionally starting with a governed architecture instead of a giant pile of effects.

## Product contract

Doom Map must eventually provide:

- a high-precision WGS84 globe rendered by Three.js;
- globe orbit/spin, pan, zoom, search, target placement, bookmarks, fly-to, and cinematic camera paths;
- progressive terrain, imagery, vector, infrastructure, population, and building loading by camera region and level of detail;
- building-scale geometry using the best available data for the selected location, with source/coverage/fidelity shown honestly;
- at least **40 distinct disaster scenario types**;
- animated primary, secondary, tertiary, and recovery phases;
- a shared consequence graph so one event can trigger other events and infrastructure failures;
- time scrub, pause, replay, rewind, branch, compare, export, and shareable scenario state;
- model provenance, uncertainty, data timestamps, and explicit fidelity classes;
- GitHub Pages deployment for the web build;
- a native wrapper that runs the same compiled web core.

## What "accurate" means here

Doom Map will not claim that every building, terrain cell, casualty estimate, or hazard footprint on Earth is equally accurate.

The project uses a **fidelity ladder**:

- **A — calculated/validated:** equations or algorithms with explicit verification against published references or trusted benchmark data.
- **B — reduced-order/empirical:** physically meaningful but simplified models with documented assumptions and error limits.
- **C — data-driven:** visualized from authoritative or reputable external datasets; validity depends on source coverage and timestamp.
- **D — illustrative:** communication-only visuals that are never presented as scientific output.

Every visible consequence must be able to answer: **where did this number/shape come from, when was the source current, and how much should the user trust it?**

## Current state

The repository is in **active phased implementation**. The Phase 1 foundation now includes validated WGS84/ENU helpers, ellipsoid target selection, coordinate navigation and fly-to, north-up orientation, view history and shareable state, adaptive quality and diagnostics, explicit provider/provenance/scenario contracts, and a minimized command-driven interface that keeps the globe visually primary. CI and GitHub Pages deployment pass for the current implementation; direct browser interaction proof and deterministic package-lock installation remain pending.

Read these first:

1. [OPERATIONAL_STATE.md](OPERATIONAL_STATE.md) — current authority, invariants, verified/unverified state.
2. [docs/MASTER_BUILD_PLAN.md](docs/MASTER_BUILD_PLAN.md) — beginning-to-end implementation plan.
3. [docs/PRECEDENT_RESEARCH.md](docs/PRECEDENT_RESEARCH.md) — internal projects plus 50+ external analogues.
4. [docs/DATA_SOURCE_MATRIX.md](docs/DATA_SOURCE_MATRIX.md) — geospatial and hazard-data strategy.
5. [docs/DISASTER_CATALOG.md](docs/DISASTER_CATALOG.md) — the initial 50+ disaster registry.
6. [BUILD_PROMPT.md](BUILD_PROMPT.md) — full execution prompt for a repository-aware coding agent.
7. [AGENTS.md](AGENTS.md) — concise agent entry point and protected rules.

## High-level architecture

```text
                        Doom Map
                           |
        +------------------+------------------+
        |                                     |
   Scenario/Time Core                    Presentation Core
        |                                     |
  Hazard Registry                         Three.js Scene
        |                                     |
  Propagation Models                   WGS84 / ECEF / ENU
        |                                     |
 Consequence Graph                    Tile + LOD Manager
        |                                     |
 Exposure Queries                     Terrain / Buildings
        |                                     |
 Recovery Models                      VFX / Labels / HUD
        |                                     |
        +------------------+------------------+
                           |
                    Data Provider Layer
        +------------------+------------------+
        |                  |                  |
   Static bundles     Open web data      Optional keyed
   + PMTiles/COG       + APIs/feeds        3D providers
                           |
                      Local cache
                           |
         +-----------------+------------------+
         |                                    |
   GitHub Pages                          Native Wrapper
  static web build                     same web artifact
```

## Safety and purpose boundary

Doom Map is an educational, exploratory, and civil-consequence simulator. Nuclear and infrastructure scenarios may display documented effects, uncertainty, and population/infrastructure exposure, but the product must not include an optimizer that recommends real targets, maximizes casualties, ranks military vulnerability, or turns the simulator into strike-planning software.

## Deployment target

The web application is designed for static hosting at:

`https://westkitty.github.io/Doom_Map/`

The native wrapper is planned around Tauri 2 unless later evidence justifies another wrapper. The wrapper must consume the same production web bundle rather than creating a second simulation implementation.

## Repository rule

Do not call a feature complete because source files exist or a build passes. Runtime behavior, model fidelity, Pages deployment, and wrapper behavior each require their own evidence.
