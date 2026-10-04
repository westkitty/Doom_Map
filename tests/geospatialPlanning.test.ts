import { describe, expect, it, vi } from 'vitest'
import { tilesForBounds } from '../src/geo/tileCoverage'
import { prefetchRing } from '../src/geo/prefetch'
import { tilePriority } from '../src/geo/tilePriority'
import { lonLatToTile, tileCenterLonLat } from '../src/geo/webMercator'
import { classifyFreshness } from '../src/data/freshness'
import { DataLayerRegistry } from '../src/data/layerRegistry'
import { TileResidencyTracker } from '../src/data/tileResidency'
import { ViewEpochController } from '../src/data/viewEpoch'

describe('geospatial planning and view lifecycle', () => {
  it('converts lon/lat to stable Web Mercator tiles', () => {
    expect(lonLatToTile(0, 0, 1)).toEqual({ z: 1, x: 1, y: 1 })
    const center = tileCenterLonLat({ z: 1, x: 1, y: 1 })
    expect(center.longitudeDeg).toBeCloseTo(90, 8)
    expect(center.latitudeDeg).toBeLessThan(0)
  })

  it('plans antimeridian-crossing viewport coverage without duplicate tiles', () => {
    const tiles = tilesForBounds({ westDeg: 170, southDeg: -10, eastDeg: -170, northDeg: 10 }, 2)
    const keys = tiles.map((tile) => `${tile.z}/${tile.x}/${tile.y}`)
    expect(new Set(keys).size).toBe(keys.length)
    expect(tiles.some((tile) => tile.x === 3)).toBe(true)
    expect(tiles.some((tile) => tile.x === 0)).toBe(true)
  })

  it('builds a wrapped prefetch ring around visible tiles', () => {
    const ring = prefetchRing([{ z: 2, x: 0, y: 1 }], 1)
    expect(ring.some((tile) => tile.x === 3 && tile.y === 1)).toBe(true)
    expect(ring.some((tile) => tile.x === 0 && tile.y === 1)).toBe(false)
  })

  it('prioritizes visible tiles above speculative prefetch work', () => {
    const center = { z: 3, x: 4, y: 4 }
    expect(tilePriority({ tile: center, center, visible: true, targetZoom: 3 }))
      .toBeGreaterThan(tilePriority({ tile: { z: 3, x: 5, y: 4 }, center, visible: false, prefetch: true, targetZoom: 3 }))
  })

  it('cancels releases associated with stale view generations', () => {
    const epochs = new ViewEpochController()
    const release = vi.fn()
    const first = epochs.begin()
    epochs.track(first, release)
    const second = epochs.begin()
    expect(second).toBe(first + 1)
    expect(release).toHaveBeenCalledTimes(1)
    expect(epochs.isCurrent(first)).toBe(false)
  })

  it('classifies data freshness into fresh, stale, and expired windows', () => {
    const policy = { maxAgeMs: 100, staleWhileRevalidateMs: 200 }
    expect(classifyFreshness('1970-01-01T00:00:00.000Z', policy, 50)).toBe('fresh')
    expect(classifyFreshness('1970-01-01T00:00:00.000Z', policy, 200)).toBe('stale')
    expect(classifyFreshness('1970-01-01T00:00:00.000Z', policy, 400)).toBe('expired')
  })

  it('keeps layer order, visibility, and opacity as explicit state', () => {
    const layers = new DataLayerRegistry()
    layers.register({ id: 'roads', visible: true, opacity: 0.8, order: 20 })
    layers.register({ id: 'buildings', visible: true, opacity: 1, order: 10 })
    layers.update('roads', { visible: false })
    expect(layers.orderedVisible().map((layer) => layer.id)).toEqual(['buildings'])
  })

  it('tracks tile residency and resident bytes separately from failures/evictions', () => {
    const residency = new TileResidencyTracker()
    residency.update({ key: '1/0/0', state: 'resident', bytes: 40, generation: 1, updatedAtMs: 1 })
    residency.update({ key: '1/1/0', state: 'failed', bytes: 0, generation: 1, updatedAtMs: 2, error: 'offline' })
    expect(residency.residentBytes()).toBe(40)
    expect(residency.counts()).toEqual({ requested: 0, resident: 1, failed: 1, evicted: 0 })
  })
})
