import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { expect, it } from 'vitest'
import { polygonRings } from '../src/data/geojson'

it('validates the pinned Natural Earth snapshot and bounds', () => {
  const bytes = readFileSync('public/data/ne_110m_land.geojson')
  expect(createHash('sha256').update(bytes).digest('hex')).toBe('9e0729ee253ca7d7a5c4ae9395fb1902264c5377c52e224d13dd85010e2835d9')
  const rings = polygonRings(JSON.parse(bytes.toString()))
  expect(rings.length).toBeGreaterThan(100)
  expect(rings.flat().length).toBeLessThan(100_000)
})

it.each([null, {}, { type: 'FeatureCollection', features: [{ geometry: { type: 'Point', coordinates: [0, 0] } }] },
  { type: 'FeatureCollection', features: [{ geometry: { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 100], [0, 0]]] } }] }])('rejects malformed or unsupported geography', input => {
  expect(() => polygonRings(input)).toThrow()
})
