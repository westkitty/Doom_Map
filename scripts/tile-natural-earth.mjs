// Reproducible low-LOD derivative. Never fabricates coastlines or adds detail.
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs'
const source = JSON.parse(readFileSync(new URL('../public/data/ne_110m_land.geojson', import.meta.url), 'utf8'))
const directory = new URL('../public/data/ne-110m/', import.meta.url)
mkdirSync(directory, { recursive: true })
const edges = []
for (const feature of source.features) {
  const polygons = feature.geometry.type === 'Polygon' ? [feature.geometry.coordinates] : feature.geometry.coordinates
  for (const polygon of polygons) for (const ring of polygon) for (let i = 1; i < ring.length; i++) {
    const a = ring[i - 1], b = ring[i]
    const longitude = a[0] + ((b[0] - a[0] + 540) % 360) - 180
    edges.push([a[0], a[1], longitude, b[1]])
  }
}
function clip(x0, y0, x1, y1, west, south, east, north) {
  const dx = x1 - x0, dy = y1 - y0
  let lo = 0, hi = 1
  const p = [-dx, dx, -dy, dy], q = [x0 - west, east - x0, y0 - south, north - y0]
  for (let i = 0; i < 4; i++) {
    if (p[i] === 0) { if (q[i] < 0) return null; continue }
    const t = q[i] / p[i]
    if (p[i] < 0) lo = Math.max(lo, t); else hi = Math.min(hi, t)
    if (lo >= hi) return null
  }
  return [x0 + lo * dx, y0 + lo * dy, x0 + hi * dx, y0 + hi * dy].map(n => Number(n.toFixed(6)))
}
for (let y = 0; y < 6; y++) for (let x = 0; x < 12; x++) {
  const west = -180 + x * 30, south = -90 + y * 30, segments = []
  for (const [x0, y0, x1, y1] of edges) for (const shift of [-360, 0, 360]) {
    const result = clip(x0 + shift, y0, x1 + shift, y1, west, south, west + 30, south + 30)
    if (result) segments.push(...result)
  }
  writeFileSync(new URL(`${x}-${y}.json`, directory), JSON.stringify({ schemaVersion: 1, segments }) + '\n')
}
console.log('Generated 72 bounded 30-degree low-LOD coastline tiles.')
