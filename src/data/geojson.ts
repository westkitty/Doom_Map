export type LonLat = [number, number]
/** Bounded low-LOD polygon decoder. Unsupported/malformed geometry fails explicitly. */
export function polygonRings(value: unknown): LonLat[][] {
  if (!value || typeof value !== 'object') throw new Error('Invalid GeoJSON')
  const collection = value as { type?: unknown; features?: unknown }
  if (collection.type !== 'FeatureCollection' || !Array.isArray(collection.features) || collection.features.length > 10_000) throw new Error('Expected bounded FeatureCollection')
  let vertices = 0
  const rings: LonLat[][] = []
  const ring = (input: unknown): void => {
    if (!Array.isArray(input) || input.length < 4) throw new Error('Invalid polygon ring')
    const points: LonLat[] = input.map(p => {
      if (!Array.isArray(p) || p.length < 2 || !Number.isFinite(p[0]) || !Number.isFinite(p[1]) || Math.abs(p[0]) > 180 || Math.abs(p[1]) > 90) throw new Error('Invalid longitude/latitude')
      if (++vertices > 100_000) throw new Error('Low-LOD vertex budget exceeded')
      return [p[0] as number, p[1] as number]
    })
    const first = points[0]!, last = points[points.length - 1]!
    if (first[0] !== last[0] || first[1] !== last[1]) throw new Error('Unclosed ring')
    rings.push(points)
  }
  const polygon = (input: unknown): void => {
    if (!Array.isArray(input)) throw new Error('Invalid polygon')
    input.forEach(ring)
  }
  for (const feature of collection.features) {
    const geometry = feature?.geometry
    if (geometry?.type === 'Polygon') polygon(geometry.coordinates)
    else if (geometry?.type === 'MultiPolygon') {
      if (!Array.isArray(geometry.coordinates)) throw new Error('Invalid multipolygon')
      geometry.coordinates.forEach(polygon)
    } else throw new Error('Unsupported geometry')
  }
  return rings
}
