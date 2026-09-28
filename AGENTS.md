# AGENTS.md — Doom Map

Read in this order:
1. OPERATIONAL_STATE.md
2. docs/MASTER_BUILD_PLAN.md
3. docs/PRECEDENT_RESEARCH.md
4. docs/DATA_SOURCE_MATRIX.md
5. docs/DISASTER_CATALOG.md
6. BUILD_PROMPT.md when executing the full build

## Protected invariants

- Three.js owns the primary visible 3D runtime.
- Use WGS84 geodetic/ECEF/ENU authority plus camera-relative rendering.
- Stream global detail by LOD; do not bundle worldwide building/terrain data.
- Models and VFX are separate.
- Every model exposes provenance, fidelity, timestamp, uncertainty, and limitations.
- Maintain at least 40 runnable disaster types; target catalog is larger.
- Pages and wrapper run the same built web core.
- Do not add casualty-maximizing, military-target-ranking, or strike-optimization features.
- Never promote a claim to verified without evidence appropriate to the real user path.

## Git discipline

For substantive completed work:
- inspect current branch and state first
- keep changes scoped to the active phase
- run affected validation
- inspect changed files/diff
- stage intended changes
- commit descriptively
- push the active branch when authorized
- verify local HEAD equals remote branch HEAD when working in a local clone

Do not use force push unless explicitly authorized.

## Completion report

Report only:
- what changed
- files changed
- validation and results
- deployment/wrapper evidence when applicable
- unresolved or unverified items
- commit SHA
