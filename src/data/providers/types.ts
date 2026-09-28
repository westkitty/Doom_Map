import type { Provenance } from '../provenance'
export interface GeographicBounds { west: number; south: number; east: number; north: number }
export interface TileRequest { id: string; bounds: GeographicBounds; lod: number; priority: number }
export interface DecodedTile<T> { data: T; bytes: number }
export interface DataProvider<T> {
  readonly provenance: Provenance
  readonly kind: 'terrain' | 'imagery' | 'vectors' | 'buildings' | 'population' | 'infrastructure' | 'hazard' | 'weather'
  load(request: TileRequest, signal: AbortSignal): Promise<DecodedTile<T>>
}
