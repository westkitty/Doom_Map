# Doom Map — Deployment

## GitHub Pages

The repository contains .github/workflows/deploy-pages.yml.

The production build is already verified to succeed with Vite base /Doom_Map/.

### One-time repository enablement

GitHub currently reports no Pages site for this repository. A repository administrator must set:

Settings -> Pages -> Build and deployment -> Source -> GitHub Actions

This is a one-time repository setting, not an application-code change.

After enabling it:
1. Open Actions.
2. Run "Deploy GitHub Pages" manually, or push a new commit to main.
3. Confirm the build job passes.
4. Confirm the deploy job passes.
5. Load https://westkitty.github.io/Doom_Map/
6. Verify the Three.js globe renders, drag rotates, modified/middle/right drag pans, wheel/pinch zooms, telemetry updates, resize works, and the console has no serious errors.
7. Only then promote Pages delivery to verified in OPERATIONAL_STATE.md.

## Current build evidence

GitHub Actions CI run 36447608037 passed:
- TypeScript typecheck
- 3/3 WGS84 coordinate tests
- Vite production build

A Pages build also reached a successful production build before failing at the repository-level Configure Pages step.

## Native wrapper

The planned wrapper is Tauri 2 using the same built dist artifact.

Do not create a parallel wrapper-specific simulation implementation.

Wrapper validation order:
1. macOS desktop build and launch
2. Android build and launch
3. offline shell
4. network/provider failure states
5. shared scenario import/export parity
6. only then additional platforms if explicitly required
