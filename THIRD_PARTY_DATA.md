# Third-party data and model attribution

`data/providers.json` is intentionally empty: no geographic data provider is
currently active. Do not imply a planned source has been downloaded or verified.
`data/models.json` records the current illustrative Earth presentation (D).
WGS84 dimensions are reference constants, not a bundled geographic dataset.
Its source URL is a reference, not a live data hotlink.

Manifests use schemaVersion 1 and `src/data/provenance.ts` validates them in tests
and at application startup. Every record requires ID, version, kind, title,
fidelity A/B/C/D, HTTPS sources, timestamp (explicit null if unknown), assumptions,
uncertainty, limitations, attribution, license notes and coverage.

Future provider entries must additionally document retrieval/caching/redistribution
policy before any runtime source is enabled. An empty provider list is an explicit
unavailable state, not a fabricated fallback.
