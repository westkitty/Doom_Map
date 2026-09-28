# Browser acceptance

## Reproduction

Node >=20; `npm ci`, `npx playwright install --with-deps chromium`,
`npm run check`, `npm run test:browser`.
Tests serve the **production artifact at /Doom_Map/**, not the Vite dev entry.
`PLAYWRIGHT_BASE_URL` optionally targets another deployment of the same revision.
`CHROMIUM_PATH` optionally selects an already installed Chromium executable.
CI uploads screenshots and failure traces from `test-results/`.

## Evidence — 2026-09-28

Local clean npm ci, strict typecheck, 3 coordinate fixtures, production build,
and 3 Playwright tests passed. Screenshot `earth.png` was inspected: lit blue
ellipsoid, atmosphere and latitude/longitude grid visibly render. No real
coastlines are implemented yet. Browser tests verify nonzero Three.js draw
statistics, rotation, right-drag pan, wheel zoom, changing telemetry, resize,
constant geometry/texture counts during 12 zoom inputs, context loss/restore,
and CDP-emulated two-finger pinch. These are bounded smoke checks, not long-session
leak proofs. No physical touch-device or representative GPU performance claim.

The environment could access npm but not Debian, Playwright CDN or Google
browser downloads. Local fallback: external tooling directory (not a repository
dependency) with `@sparticuz/chromium@143.0.4`; its Chromium 143 binary and bundled
AL2023 shared libraries were extracted. Tests used:
`LD_LIBRARY_PATH=/tmp/chromium-libs/lib CHROMIUM_PATH=/tmp/chromium npm run test:browser`.
CI uses standard Playwright Chromium; that distinct environment needs its own result.

Playwright 1.63.0 (Apache-2.0, Node >=20) was selected after npm metadata checks.
It supplies the absent real-browser interaction framework; Vitest cannot prove
WebGL or pointer behavior. It is dev-only; removing config/tests and the pinned
dependency is the rollback path. Core package versions were not changed.

A production-preview base-path defect was discovered by these tests and fixed.
The Vite preview server now uses the build's repository base, while dev stays `/`.

## Follow-up spine evidence

CI run 36465030525 passed on df36fcd using standard Playwright Chromium.
Follow-up local validation: 15 unit tests and 4 browser tests pass, adding the
unsupported-WebGL accessible error and source-panel path. Manifest validation is
now active at startup and under unit tests; providers remain explicitly empty.

Dependency audit found 3 dev-tool findings in the inherited pins (Vite high,
Vitest critical, @vitest/mocker moderate). No runtime dependency finding was
reported. These need a deliberate security update; do not expose the Vite dev
server or Vitest UI publicly in the meantime. Production static files do not
run those development servers. Core versions were intentionally not silently
changed during browser/provenance work.
