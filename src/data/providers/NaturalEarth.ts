import providers from '../../../data/providers.json'
import { parseManifest } from '../provenance'
import type { DataProvider, TileRequest } from './types'

export function regionalRequests(latitude: number, longitude: number): TileRequest[] {
  const cx = Math.min(11, Math.max(0, Math.floor((longitude + 180) / 30)))
  const cy = Math.min(5, Math.max(0, Math.floor((latitude + 90) / 30)))
  const requests: TileRequest[] = []
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    const x = (cx + dx + 12) % 12, y = cy + dy
    if (y < 0 || y > 5) continue
    requests.push({ id: `${x}-${y}`, lod: 1, priority: 10 - Math.abs(dx) - Math.abs(dy),
      bounds: { west: x * 30 - 180, south: y * 30 - 90, east: x * 30 - 150, north: y * 30 - 60 } })
  }
  return requests
}

export function parseSegments(value: unknown): Float64Array {
  const tile = value as { schemaVersion?: unknown; segments?: unknown }
  if (!tile || tile.schemaVersion !== 1 || !Array.isArray(tile.segments) || tile.segments.length % 4 !== 0 || tile.segments.length > 100_000) throw new Error('Malformed coastline tile')
  if (!tile.segments.every((n, i) => typeof n === 'number' && Number.isFinite(n) && Math.abs(n) <= (i % 2 ? 90 : 180))) throw new Error('Invalid tile coordinates')
  return new Float64Array(tile.segments)
}

export class NaturalEarthProvider implements DataProvider<Float64Array> {
  readonly provenance = parseManifest(providers, 'provider')[0]!
  readonly kind = 'vectors' as const
  async load(request: TileRequest, signal: AbortSignal) {
    if (!/^(?:[0-9]|1[01])-[0-5]$/.test(request.id) || request.lod !== 1) throw new Error('Unsupported Natural Earth tile')
    const response = await fetch(`${import.meta.env.BASE_URL}data/ne-110m/${request.id}.json`, {
      signal: AbortSignal.any([signal, AbortSignal.timeout(10_000)])
    })
    if (!response.ok) throw new Error(`Natural Earth tile HTTP ${response.status}`)
    const text = await response.text()
    if (text.length > 1_000_000) throw new Error('Encoded tile exceeds byte budget')
    const data = parseSegments(JSON.parse(text))
    return { data, bytes: data.byteLength }
  }
}
