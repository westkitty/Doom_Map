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

## Spatial/navigation slice

19 unit tests pass, including 175 geodetic round trips (poles, antimeridian,
negative/surface/orbital heights), ENU orientation/inverse fixtures, submeter
render-relative offsets and analytic ellipsoid intersection. Six browser tests
passed together, plus a focused seventh lifecycle test after correcting its
resource assertion. New paths: keyboard orbit/pan/zoom/reset/select; reduced-motion
100 m coordinate fly-to; persisted IndexedDB camera restore after reload; Safe
mode draw-call reduction; double-click fly-to and keyboard interruption.

The local screenshot was inspected: the scene remains rendered and camera
telemetry is finite at 100 m. It is **not local terrain or building evidence**.
Global mesh tessellation is still coarse. Orbit camera stays in Float64 ECEF;
render camera is at zero and a common world group is rebased each frame. Future
local tiles must use local anchors, not Earth-sized Float32 vertex attributes.

Three synthetic pagehide/pageshow cycles dispose all tracked geometries and
restore identical geometry/texture counts. Three.js reports one texture even
after renderer disposal; this test therefore does not assert all GPU allocations
are zero or claim a complete leak proof. Physical bfcache/device tests remain.

## Low-LOD geography slice

24 unit tests and all 8 browser tests pass together. Natural Earth snapshot
SHA-256, polygon validity and decode bounds are tested. The new globe screenshot
was inspected: Europe, Africa, Mediterranean and surrounding coastline context
are visibly rendered, with source/date/fidelity shown. Production geography is
loaded through a separate dynamic-import chunk and a same-origin cancellable
fetch. A forced HTTP 503 produces an explicit unavailable message without losing
the globe. Lifecycle tests now wait for the first rendered geography frame, not
just completion of its asynchronous download. Three remounts retain equal counts.

Geography is a 138 kB low-LOD fallback, not worldwide high-detail data or a tile
streaming system. Phase 2 must introduce bounded regional providers/eviction.

## Phase 2 first bounded-provider slice

30 unit tests and 10 browser tests pass. Scheduler fixtures cover priority,
concurrency, cancellation, stale responses even when a provider ignores abort,
retry/backoff, decoded-byte budget, LRU eviction, cache reuse and disposal.
All 72 generated cells have coordinate/bounds validation. Four browser regional
moves retain <=9 GPU tiles, <=12 cached tiles, <=2 MB decoded data and bounded
geometry counts; returning to orbit unloads all regional GPU tiles. HTTP 503 tests
prove explicit degraded state and retained global fallback. Regional screenshot
was inspected: source outlines render and remain visibly coarse (no local-detail
claim). Requests time out after 10 seconds. CPU cache is memory-only; persistent
cache, terrain, buildings, workers, geographic frustum prioritization and smooth
fade transitions remain unimplemented.

## Touch hardening

30 unit tests and 11 browser tests pass on the patched toolchain. Portrait
390x844 CDP-emulated touch drag and double-tap fly-to now pass. Pinch acceptance
also asserts that a two-finger gesture does not accidentally select/place a
location. Multi-pointer/cancel tracking prevents that false click path. This
remains emulation, not physical phone proof. Preview host allowance is limited to
Arena's `.e2b.app` suffix; development hosting is not broadened.

Final implementation CI run **36467794054** passed on **5dbe6a1**, including
30 unit tests and all 11 browser tests using the standard Playwright Chromium.
Local Chromium fallback and CI's standard installation therefore have separate
positive evidence. This does not imply physical-device performance or Pages
publication. Public Pages remains on main behind its main-only environment rule.

## Phase 2 bounded persistent caching and 3D buildings slice

42 unit tests and 20 browser tests pass together.
- Persistent IndexedDB cache (`doom-map-provider-cache`) is isolated with `[provider, version, codec, lod, tile]` compound keys, freshness bounds, LRU eviction (128 entries, 8 MB), stale network fallback, and storage-denial resilience.
- Local 3D building extrusions stream at local camera altitudes below 15,000 m. Footprints are triangulated into roofs with wall quads in local ENU floating origin.
- Building truth contract inspector exposes observed vs inferred height, storeys, usage, confidence, attribution, and structural limitations upon selection.
- Zooming back to orbital altitudes unloads all building GPU meshes and geometries.
- Inspected screenshot `local-buildings-3d.png` verifies crisp 3D extruded geometry, categorized materials, and truth contract HUD.
