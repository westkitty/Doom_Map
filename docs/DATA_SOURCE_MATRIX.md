# Doom Map — Data Source Matrix

This document defines source roles, not permanent provider lock-in. Every runtime provider must expose attribution, coverage, timestamp/version, license/terms notes, and fidelity metadata.

## Global base geography

| Need | Preferred baseline | Role | Notes |
|---|---|---|---|
| Coastlines/countries | Natural Earth | global low-LOD context | Public-domain-friendly cartographic base |
| Administrative/vector detail | Overture Maps / OSM-derived vector tiles | streets, places, boundaries, infrastructure | Respect source licensing and attribution |
| Building footprints | Overture Buildings and OSM-derived footprints | best-available open baseline | Coverage and attribute completeness vary |
| Higher-fidelity 3D buildings | 3D Tiles provider adapter | optional city/local LOD | Never required for core app; provider terms vary |
| Terrain | NASA/Copernicus DEM-family adapters | elevation | Resolution/coverage vary by product |
| Bathymetry | GEBCO | global ocean floor | Good global bathymetric baseline |
| Land cover | Copernicus/ESA-class land-cover adapters | fire/ecology/exposure context | Versioned raster source |
| Population | WorldPop / GHSL | exposure estimates | Never treat grid counts as exact occupancy |
| Night lights | VIIRS-derived data | visualization/exposure context | Date/version required |

## Live and recent hazard feeds

| Hazard | Baseline source | Runtime use |
|---|---|---|
| Earthquakes | USGS GeoJSON feeds | live/recent events and reference fixtures |
| Wildfire/hotspots | NASA FIRMS | active-fire observations |
| Natural events | NASA EONET | discovery/aggregation, not sole physics authority |
| Tropical cyclones | NOAA/NHC and equivalent basin authorities | tracks/advisories |
| Weather | NOAA/NWS and other authoritative providers | contextual inputs where CORS/terms permit |
| Volcanoes | Smithsonian GVP / authoritative observatories | event context and historical reference |
| Tsunami alerts | NOAA/NWS PTWC/NTWC or regional authorities | event context, not solver replacement |
| Floods | national/regional gauges and remote-sensing adapters | event context |
| Air quality/smoke | authoritative air-quality feeds / satellite products | plume validation/context |
| Space weather | NOAA SWPC | geomagnetic/solar event context |

## Delivery formats

Prefer formats that allow bounded spatial access:
- PMTiles for static vector/raster tile archives
- MVT for tiled vectors
- 3D Tiles for massive 3D datasets
- Cloud Optimized GeoTIFF for windowed raster reads
- GeoJSON for bounded event sets
- TopoJSON for compact static boundaries
- glTF/GLB for discrete authored models

Avoid shipping giant monolithic global GeoJSON, raw OSM planet extracts, or global building datasets inside the Pages bundle.

## Building-level truth contract

"Building level" means the simulator can descend to individual building footprints or 3D building objects where source coverage permits.

It does not mean:
- every building exists in the source
- geometry is survey-grade
- height/material/occupancy is known
- structural resistance is known
- a rendered extrusion is an engineering model

Every building adapter must expose:
- provider
- source timestamp/version where available
- geometry type
- height source or extrusion assumption
- confidence/coverage notes
- whether attributes are observed, inferred, or absent

## Population/exposure truth contract

Exposure outputs should prefer ranges and confidence bands. A population raster is not a live head count. Time-of-day occupancy, evacuation, mobility, sheltering, and building occupancy are separate uncertainties.

## Provider fallback chain

1. authoritative live/regional source when explicitly enabled and available
2. maintained open global source
3. cached source snapshot
4. bundled low-resolution fallback
5. explicit unavailable state

Never silently invent data when a provider fails.

## Licensing and provenance

Maintain data/providers.json and THIRD_PARTY_DATA.md.

For every source record:
- canonical provider name
- URL
- license/terms
- attribution string
- redistribution constraints
- cache policy
- access key requirement
- geographic coverage
- temporal coverage
- update cadence
- known limitations

No runtime hotlink is considered permanent architecture until CORS, terms, reliability, and cost are documented.
