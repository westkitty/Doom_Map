import { WGS84, type Cartesian3, type GeodeticPoint } from './coordinates'

const EPSILON = 1e-12

function assertFiniteCartesian(point: Cartesian3, label: string): void {
  if (![point.x, point.y, point.z].every(Number.isFinite)) {
    throw new RangeError(`${label} must contain finite coordinates.`)
  }
}

function normalizeVector(vector: Cartesian3): Cartesian3 {
  assertFiniteCartesian(vector, 'Vector')
  const length = Math.hypot(vector.x, vector.y, vector.z)
  if (length < EPSILON) throw new RangeError('Vector length must be greater than zero.')
  return { x: vector.x / length, y: vector.y / length, z: vector.z / length }
}

export function intersectWgs84Ellipsoid(origin: Cartesian3, direction: Cartesian3): Cartesian3 | null {
  assertFiniteCartesian(origin, 'Ray origin')
  const unitDirection = normalizeVector(direction)
  const a2 = WGS84.semiMajorAxis * WGS84.semiMajorAxis
  const b2 = WGS84.semiMinorAxis * WGS84.semiMinorAxis

  const qa = ((unitDirection.x * unitDirection.x + unitDirection.y * unitDirection.y) / a2 + (unitDirection.z * unitDirection.z) / b2)
  const qb = 2 * ((origin.x * unitDirection.x + origin.y * unitDirection.y) / a2 + (origin.z * unitDirection.z) / b2)
  const qc = (origin.x * origin.x + origin.y * origin.y) / a2 + (origin.z * origin.z) / b2 - 1
  const discriminant = qb * qb - 4 * qa * qc
  if (discriminant < 0) return null
  const root = Math.sqrt(Math.max(0, discriminant))
  const t0 = (-qb - root) / (2 * qa)
  const t1 = (-qb + root) / (2 * qa)
  const candidates = [t0, t1].filter((value) => value >= 0)
  if (candidates.length === 0) return null
  const t = Math.min(...candidates)
  return { x: origin.x + unitDirection.x * t, y: origin.y + unitDirection.y * t, z: origin.z + unitDirection.z * t }
}

export function wgs84SurfaceNormal(point: Cartesian3): Cartesian3 {
  assertFiniteCartesian(point, 'Surface point')
  const a2 = WGS84.semiMajorAxis * WGS84.semiMajorAxis
  const b2 = WGS84.semiMinorAxis * WGS84.semiMinorAxis
  return normalizeVector({ x: point.x / a2, y: point.y / a2, z: point.z / b2 })
}

export interface LocalBasis { east: Cartesian3; north: Cartesian3; up: Cartesian3 }

export function localBasisAtGeodetic(origin: GeodeticPoint): LocalBasis {
  const lat = origin.latitudeDeg * Math.PI / 180
  const lon = origin.longitudeDeg * Math.PI / 180
  const sinLat = Math.sin(lat); const cosLat = Math.cos(lat); const sinLon = Math.sin(lon); const cosLon = Math.cos(lon)
  return {
    east: { x: -sinLon, y: cosLon, z: 0 },
    north: { x: -sinLat * cosLon, y: -sinLat * sinLon, z: cosLat },
    up: { x: cosLat * cosLon, y: cosLat * sinLon, z: sinLat }
  }
}
