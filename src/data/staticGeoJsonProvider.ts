import { HttpJsonProvider, type FetchLike } from './httpJsonProvider'
import type { GeoDataQuery } from './geoProvider'

export interface GeoJsonFeatureCollection {
  type: 'FeatureCollection'
  features: unknown[]
}

function validateFeatureCollection(value: unknown): GeoJsonFeatureCollection {
  if (!value || typeof value !== 'object') throw new Error('GeoJSON payload must be an object.')
  const candidate = value as Partial<GeoJsonFeatureCollection>
  if (candidate.type !== 'FeatureCollection' || !Array.isArray(candidate.features)) {
    throw new Error('GeoJSON payload must be a FeatureCollection.')
  }
  return { type: 'FeatureCollection', features: candidate.features }
}

export function createStaticReferenceProvider(baseUrl: string, fetchImpl?: FetchLike): HttpJsonProvider<GeoJsonFeatureCollection> {
  const prefix = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`
  return new HttpJsonProvider<GeoJsonFeatureCollection>({
    id: 'doom-map-reference-regions',
    attribution: 'Doom Map illustrative reference fixture',
    datasetVersion: '1',
    urlForQuery: (_query: GeoDataQuery) => `${prefix}data/reference-regions.geojson`,
    validate: validateFeatureCollection,
    ...(fetchImpl ? { fetchImpl } : {})
  })
}
