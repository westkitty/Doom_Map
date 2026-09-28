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

import { readdirSync } from 'node:fs'
import { parseSegments, regionalRequests } from '../src/data/providers/NaturalEarth'

it('all derived tiles remain bounded, valid and in declared geographic cells', () => {
  const files = readdirSync('public/data/ne-110m')
  expect(files).toHaveLength(72)
  for (const file of files) {
    const [x, y] = file.replace('.json', '').split('-').map(Number) as [number, number]
    const data = parseSegments(JSON.parse(readFileSync(`public/data/ne-110m/${file}`, 'utf8')))
    for (let i = 0; i < data.length; i += 2) {
      expect(data[i]!).toBeGreaterThanOrEqual(x * 30 - 180 - 1e-6)
      expect(data[i]!).toBeLessThanOrEqual(x * 30 - 150 + 1e-6)
      expect(data[i + 1]!).toBeGreaterThanOrEqual(y * 30 - 90 - 1e-6)
      expect(data[i + 1]!).toBeLessThanOrEqual(y * 30 - 60 + 1e-6)
    }
  }
})

it('region requests wrap the antimeridian and clamp at poles', () => {
  const requests = regionalRequests(89, 179)
  expect(requests).toHaveLength(6)
  expect(requests.some(r => r.id.startsWith('0-'))).toBe(true)
  expect(new Set(requests.map(r => r.id)).size).toBe(requests.length)
})
