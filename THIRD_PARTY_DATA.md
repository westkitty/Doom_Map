# Third-party data and model attribution

## Natural Earth 1:110m land

- Provider: Natural Earth; Tom Patterson, Nathaniel Vaughn Kelso and contributors.
- Attribution: **Made with Natural Earth.**
- Retrieved via GitHub API on 2026-09-28 from `nvkelso/natural-earth-vector`.
- Immutable upstream revision: `ca96624a56bd078437bca8184e78163e5039ad19`
  (commit timestamp 2022-06-02T07:25:00Z; not observation date).
- File: `geojson/ne_110m_land.geojson`, 138,160 bytes.
- SHA-256: `9e0729ee253ca7d7a5c4ae9395fb1902264c5377c52e224d13dd85010e2835d9`.
- Source/license URLs are in `data/providers.json`. Upstream LICENSE.md was read
  and copied to `public/data/NATURAL_EARTH_LICENSE.md`: public domain, redistribution
  and modification permitted. No access key or paid service.
- Delivery: bundled low-resolution fallback fetched from the same static origin;
  no external runtime hotlink/CORS dependency. Normal HTTP browser caching applies.
- Coverage: global generalized land polygons, outlines only. Fidelity C.
- Boundaries are **not** current survey-grade coastline, terrain, country borders,
  or building geometry. Small islands can be missing. Outline presentation is
  hidden below 200 km to avoid implying local precision.
- A failed request reports unavailable; the globe/grid is not a substitute dataset.

## Earth presentation

`data/models.json` records the illustrative Earth presentation (D). WGS84
dimensions are reference constants, not a bundled terrain dataset. The fixed sun
and atmosphere are artistic presentation, not calculated current illumination.

## Manifest contract

Manifests use schemaVersion 1; `src/data/provenance.ts` validates them in tests and
at startup. Every record requires ID, version, kind, title, fidelity A/B/C/D,
HTTPS sources, timestamp (explicit null if unknown), assumptions, uncertainty,
limitations, attribution, license notes and coverage. New providers must document
retrieval/cache/redistribution policy before activation.

### Regional derivative

`node scripts/tile-natural-earth.mjs` deterministically clips the same upstream
line segments into 72 static 30° cells under `public/data/ne-110m/` (about 350 kB
filesystem allocation). The derivative adds no source detail and retains fidelity
C and the same provenance/license/version. Dateline edges unwrap before clipping.
Regional loading is active at 200–3,000 km camera altitude, with a 3x3 neighborhood.
The global snapshot remains a labeled fallback until all requested regional cells
are ready; no simultaneous duplicate coastline presentation. These are **coarse
coastline tiles**, not a local terrain or building provider.
