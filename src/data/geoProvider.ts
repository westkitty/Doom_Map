import type { GeoBounds } from '../geo/tileKey'

export interface GeoDataQuery {
  bounds: GeoBounds
  lod: number
}

export interface GeoDataPayload<T = unknown> {
  providerId: string
  data: T
  bytes: number
  contentHash: string
  fetchedAt: string
  attribution: string
  datasetVersion?: string
}

export interface GeoDataProvider<T = unknown> {
  readonly id: string
  readonly attribution: string
  fetch(query: GeoDataQuery, signal: AbortSignal): Promise<GeoDataPayload<T>>
}
