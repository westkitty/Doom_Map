import { describe, expect, it } from 'vitest'
import { parseBuildingTile, localBuildingRequests, BuildingProvider } from '../src/data/providers/buildings'

describe('Building tile parser and spatial bounds', () => {
  it('parses valid building tile schema', () => {
    const sample = {
      schemaVersion: 1,
      tileId: '1874-2636',
      bounds: { west: -86.3, south: 41.8, east: -86.25, north: 41.85 },
      buildings: [
        {
          id: 'test-1',
          name: 'City Hall',
          use: 'civic',
          footprint: [[-86.26, 41.82], [-86.25, 41.82], [-86.25, 41.83], [-86.26, 41.83]],
          heightM: 25.0,
          heightSource: 'observed',
          storeys: 6,
          confidence: 0.95
        }
      ]
    }
    const tile = parseBuildingTile(sample)
    expect(tile.buildings).toHaveLength(1)
    expect(tile.buildings[0]!.heightSource).toBe('observed')
  })

  it('rejects invalid height, negative altitude, or malformed polygons', () => {
    expect(() => parseBuildingTile({ schemaVersion: 1, tileId: '1', bounds: { west: 0, south: 0, east: 1, north: 1 }, buildings: [{ id: 'b', use: 'civic', footprint: [[0, 0]], heightM: -5, heightSource: 'observed', storeys: 1, confidence: 1 }] })).toThrow()
    expect(() => parseBuildingTile({ schemaVersion: 1, tileId: '1', bounds: { west: 0, south: 0, east: 1, north: 1 }, buildings: [{ id: 'b', use: 'invalid_use', footprint: [[0, 0], [1, 0], [1, 1]], heightM: 10, heightSource: 'observed', storeys: 1, confidence: 1 }] })).toThrow()
  })

  it('generates 3x3 neighborhood requests around coordinate', () => {
    const requests = localBuildingRequests(41.8298, -86.2542)
    expect(requests).toHaveLength(9)
    expect(requests.every(r => r.lod === 2 && r.priority >= 18)).toBe(true)
  })

  it('BuildingProvider provenance is validated and kind is buildings', () => {
    const provider = new BuildingProvider()
    expect(provider.kind).toBe('buildings')
    expect(provider.provenance.id).toBe('local-building-footprints')
    expect(provider.provenance.fidelity).toBe('C')
  })
})
