import { CachedTileLoader } from '../cache/CachedTileLoader'
import { PersistentTileCache } from '../cache/PersistentTileCache'
import providers from '../../../data/providers.json'
import { parseManifest } from '../provenance'
import type { DataProvider, TileRequest } from './types'

export type BuildingUse = 'residential' | 'commercial' | 'industrial' | 'civic' | 'infrastructure' | 'unknown'
export type HeightSource = 'observed' | 'inferred'

export interface BuildingFeature {
  id: string
  name?: string
  use: BuildingUse
  footprint: [number, number][]
  heightM: number
  heightSource: HeightSource
  storeys: number
  confidence: number
  timestamp?: string
}

export interface BuildingTile {
  schemaVersion: 1
  tileId: string
  bounds: { west: number; south: number; east: number; north: number }
  buildings: BuildingFeature[]
}

export function localBuildingRequests(latitude: number, longitude: number): TileRequest[] {
  const cx = Math.min(7199, Math.max(0, Math.floor((longitude + 180) / 0.05)))
  const cy = Math.min(3599, Math.max(0, Math.floor((latitude + 90) / 0.05)))
  const requests: TileRequest[] = []
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const x = (cx + dx + 7200) % 7200
      const y = cy + dy
      if (y < 0 || y > 3599) continue
      const west = Number((x * 0.05 - 180).toFixed(4))
      const south = Number((y * 0.05 - 90).toFixed(4))
      const east = Number(((x + 1) * 0.05 - 180).toFixed(4))
      const north = Number(((y + 1) * 0.05 - 90).toFixed(4))
      requests.push({
        id: `${x}-${y}`,
        lod: 2,
        priority: 20 - Math.abs(dx) - Math.abs(dy),
        bounds: { west, south, east, north }
      })
    }
  }
  return requests
}

export function parseBuildingTile(value: unknown): BuildingTile {
  if (!value || typeof value !== 'object') throw new Error('Malformed building tile')
  const tile = value as Partial<BuildingTile>
  if (tile.schemaVersion !== 1 || typeof tile.tileId !== 'string' || !Array.isArray(tile.buildings)) {
    throw new Error('Unsupported building tile schema')
  }
  if (!tile.bounds || typeof tile.bounds.west !== 'number' || typeof tile.bounds.south !== 'number' ||
      typeof tile.bounds.east !== 'number' || typeof tile.bounds.north !== 'number') {
    throw new Error('Invalid tile bounds')
  }
  const validUses = new Set(['residential', 'commercial', 'industrial', 'civic', 'infrastructure', 'unknown'])
  for (const b of tile.buildings) {
    if (!b || typeof b.id !== 'string' || !Array.isArray(b.footprint) || b.footprint.length < 3) {
      throw new Error(`Malformed building in tile ${tile.tileId}`)
    }
    if (!validUses.has(b.use)) throw new Error(`Invalid building use in ${b.id}`)
    if (!Number.isFinite(b.heightM) || b.heightM <= 0 || b.heightM > 2000) {
      throw new Error(`Invalid building height in ${b.id}`)
    }
    if (b.heightSource !== 'observed' && b.heightSource !== 'inferred') {
      throw new Error(`Invalid height source in ${b.id}`)
    }
    for (const [lon, lat] of b.footprint) {
      if (typeof lon !== 'number' || typeof lat !== 'number' || Math.abs(lon) > 180 || Math.abs(lat) > 90) {
        throw new Error(`Invalid coordinates in building ${b.id}`)
      }
    }
  }
  return tile as BuildingTile
}

export class BuildingProvider implements DataProvider<BuildingTile> {
  readonly provenance = parseManifest(providers, 'provider').find(p => p.id === 'local-building-footprints')!
  readonly kind = 'buildings' as const

  private readonly loader = new CachedTileLoader<BuildingTile>(new PersistentTileCache(), {
    freshMs: 7 * 86400_000,
    maxStaleMs: 90 * 86400_000
  }, text => {
    const tile = parseBuildingTile(JSON.parse(text))
    return { data: tile, bytes: text.length }
  })

  cacheStatus() {
    return { ...this.loader.status }
  }

  async load(request: TileRequest, signal: AbortSignal) {
    if (!/^\d{1,4}-\d{1,4}$/.test(request.id) || request.lod !== 2) throw new Error('Unsupported building tile request')
    return this.loader.load(
      {
        provider: this.provenance.id,
        version: this.provenance.version,
        codec: 'building-tile-v1',
        tile: request.id,
        lod: request.lod
      },
      async () => {
        const response = await fetch(`${import.meta.env.BASE_URL}data/buildings/${request.id}.json`, {
          signal: AbortSignal.any([signal, AbortSignal.timeout(10_000)])
        })
        if (!response.ok) {
          // Missing regional tile is an empty tile, not a fatal failure
          if (response.status === 404) {
            return JSON.stringify({
              schemaVersion: 1,
              tileId: request.id,
              bounds: request.bounds,
              buildings: []
            })
          }
          throw new Error(`Building tile HTTP ${response.status}`)
        }
        const text = await response.text()
        if (text.length > 2_000_000) throw new Error('Building tile exceeds byte budget')
        return text
      },
      signal
    )
  }
}
