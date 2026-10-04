import { describe, expect, it, vi } from 'vitest'
import type { GeoDataProvider } from '../src/data/geoProvider'
import { ProviderFailoverChain } from '../src/data/providerChain'
import { ReferenceDataController } from '../src/data/referenceDataController'
import { resourceBudgetFor } from '../src/data/resourceBudget'
import { GeoTileStore } from '../src/data/tileStore'
import { extractGeoJsonPoints, GeoJsonPointLayer } from '../src/globe/geoJsonPointLayer'

describe('tile store and Three.js geodata layer', () => {
  it('composes provider failover, dedupe, cache, attribution, and residency', async () => {
    const fetch = vi.fn(async () => ({
      providerId: 'fixture',
      data: { value: 7 },
      bytes: 32,
      contentHash: 'abc',
      fetchedAt: '1970-01-01T00:00:00.000Z',
      attribution: 'Fixture provider',
      datasetVersion: 'v1'
    }))
    const provider: GeoDataProvider<{ value: number }> = { id: 'fixture', attribution: 'Fixture provider', fetch }
    const store = new GeoTileStore(new ProviderFailoverChain([provider]), 1024, 2, { maxAgeMs: 1000, staleWhileRevalidateMs: 1000 })

    const first = store.acquire({ z: 0, x: 0, y: 0 }, 100, 1, 0)
    await expect(first.promise).resolves.toMatchObject({ providerId: 'fixture' })
    first.release()

    const second = store.acquire({ z: 0, x: 0, y: 0 }, 100, 2, 500)
    await expect(second.promise).resolves.toMatchObject({ providerId: 'fixture' })
    second.release()

    expect(fetch).toHaveBeenCalledTimes(1)
    expect(store.attributionText()).toContain('Fixture provider')
    expect(store.stats()).toMatchObject({ cacheHits: 1, cacheMisses: 1, networkLoads: 1, failures: 0, residentTiles: 1 })
  })

  it('parses valid GeoJSON points and ignores unsupported or invalid features', () => {
    const points = extractGeoJsonPoints({
      type: 'FeatureCollection',
      features: [
        { type: 'Feature', properties: { id: 'a' }, geometry: { type: 'Point', coordinates: [-86.2, 41.8] } },
        { type: 'Feature', geometry: { type: 'LineString', coordinates: [] } },
        { type: 'Feature', geometry: { type: 'Point', coordinates: [999, 0] } }
      ]
    })
    expect(points).toHaveLength(1)
    expect(points[0]?.properties.id).toBe('a')
  })

  it('builds a disposable Three.js point layer with explicit opacity control', () => {
    const layer = new GeoJsonPointLayer({
      type: 'FeatureCollection',
      features: [{ type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [0, 0] } }]
    })
    expect(layer.object3d.geometry.getAttribute('position').count).toBe(1)
    expect(() => layer.setOpacity(0.5)).not.toThrow()
    expect(() => layer.dispose()).not.toThrow()
  })

  it('loads the same-origin reference fixture through the complete streaming stack', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({
      type: 'FeatureCollection',
      features: [
        { type: 'Feature', properties: { id: 'one' }, geometry: { type: 'Point', coordinates: [0, 0] } },
        { type: 'Feature', properties: { id: 'two' }, geometry: { type: 'Point', coordinates: [-86.2542, 41.8298] } }
      ]
    }), { status: 200 }))

    const controller = new ReferenceDataController('/Doom_Map/', resourceBudgetFor('safe'), fetchImpl)
    const layer = await controller.load()
    expect(layer.object3d.geometry.getAttribute('position').count).toBe(2)
    expect(controller.diagnostics().attribution).toContain('Doom Map illustrative reference fixture')
    expect(fetchImpl).toHaveBeenCalledWith('/Doom_Map/data/reference-regions.geojson', expect.any(Object))
    layer.dispose()
    controller.dispose()
  })
})
