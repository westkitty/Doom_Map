export const WGS84 = Object.freeze({
  semiMajorAxis: 6_378_137,
  flattening: 1 / 298.257223563,
  semiMinorAxis: 6_356_752.314245179
})

export interface GeodeticPoint {
  latitudeDeg: number
  longitudeDeg: number
  heightM: number
}

export interface Cartesian3 {
  x: number
  y: number
  z: number
}

export interface EnuPoint {
  eastM: number
  northM: number
  upM: number
}

export interface EnuFrame {
  origin: Cartesian3
  east: Cartesian3
  north: Cartesian3
  up: Cartesian3
}

const DEG_TO_RAD = Math.PI / 180
const RAD_TO_DEG = 180 / Math.PI
const ORIGIN_EPSILON_M = 1e-9

function assertFinite(value: number, label: string): void {
  if (!Number.isFinite(value)) {
    throw new RangeError(`${label} must be finite.`)
  }
}

function assertGeodeticPoint(point: GeodeticPoint): void {
  assertFinite(point.latitudeDeg, 'Latitude')
  assertFinite(point.longitudeDeg, 'Longitude')
  assertFinite(point.heightM, 'Height')

  if (point.latitudeDeg < -90 || point.latitudeDeg > 90) {
    throw new RangeError('Latitude must be between -90 and 90 degrees.')
  }
}

function assertCartesian(point: Cartesian3): void {
  assertFinite(point.x, 'ECEF x')
  assertFinite(point.y, 'ECEF y')
  assertFinite(point.z, 'ECEF z')
}

export function normalizeLongitudeDeg(longitudeDeg: number): number {
  assertFinite(longitudeDeg, 'Longitude')
  if (longitudeDeg >= -180 && longitudeDeg < 180) {
    return Object.is(longitudeDeg, -0) ? 0 : longitudeDeg
  }
  const normalized = ((longitudeDeg + 180) % 360 + 360) % 360 - 180
  return Object.is(normalized, -0) ? 0 : normalized
}

export function geodeticToEcef(point: GeodeticPoint): Cartesian3 {
  assertGeodeticPoint(point)

  const lat = point.latitudeDeg * DEG_TO_RAD
  const lon = point.longitudeDeg * DEG_TO_RAD
  const a = WGS84.semiMajorAxis
  const f = WGS84.flattening
  const e2 = f * (2 - f)
  const sinLat = Math.sin(lat)
  const cosLat = Math.cos(lat)
  const n = a / Math.sqrt(1 - e2 * sinLat * sinLat)

  return {
    x: (n + point.heightM) * cosLat * Math.cos(lon),
    y: (n + point.heightM) * cosLat * Math.sin(lon),
    z: (n * (1 - e2) + point.heightM) * sinLat
  }
}

export function ecefToGeodetic(point: Cartesian3): GeodeticPoint {
  assertCartesian(point)

  const a = WGS84.semiMajorAxis
  const b = WGS84.semiMinorAxis
  const radius = Math.hypot(point.x, point.y, point.z)

  if (radius < ORIGIN_EPSILON_M) {
    throw new RangeError('The Earth center has no unique geodetic coordinate.')
  }

  const e2 = 1 - (b * b) / (a * a)
  const ep2 = (a * a - b * b) / (b * b)
  const p = Math.hypot(point.x, point.y)

  if (p < ORIGIN_EPSILON_M) {
    return {
      latitudeDeg: point.z >= 0 ? 90 : -90,
      longitudeDeg: 0,
      heightM: Math.abs(point.z) - b
    }
  }

  const theta = Math.atan2(point.z * a, p * b)
  const sinTheta = Math.sin(theta)
  const cosTheta = Math.cos(theta)
  let lat = Math.atan2(
    point.z + ep2 * b * sinTheta * sinTheta * sinTheta,
    p - e2 * a * cosTheta * cosTheta * cosTheta
  )
  for (let index = 0; index < 6; index += 1) {
    const nEstimate = a / Math.sqrt(1 - e2 * Math.sin(lat) ** 2)
    lat = Math.atan2(point.z + e2 * nEstimate * Math.sin(lat), p)
  }
  const lon = Math.atan2(point.y, point.x)
  const sinLat = Math.sin(lat)
  const cosLat = Math.cos(lat)
  const n = a / Math.sqrt(1 - e2 * sinLat * sinLat)
  const height = p * cosLat + point.z * sinLat - n * (1 - e2 * sinLat * sinLat)

  return {
    latitudeDeg: lat * RAD_TO_DEG,
    longitudeDeg: Math.abs(Math.abs(lon * RAD_TO_DEG) - 180) < 1e-10
      ? (point.y >= 0 ? 180 : -180)
      : normalizeLongitudeDeg(lon * RAD_TO_DEG),
    heightM: height
  }
}

export function ecefToEnu(point: Cartesian3, origin: GeodeticPoint | EnuFrame): EnuPoint {
  assertCartesian(point)
  if ('origin' in origin) {
    const delta = toRenderRelative(point, origin.origin)
    const dot = (axis: Cartesian3): number => delta.x * axis.x + delta.y * axis.y + delta.z * axis.z
    return { eastM: dot(origin.east), northM: dot(origin.north), upM: dot(origin.up) }
  }
  assertGeodeticPoint(origin)

  const originEcef = geodeticToEcef(origin)
  const dx = point.x - originEcef.x
  const dy = point.y - originEcef.y
  const dz = point.z - originEcef.z
  const lat = origin.latitudeDeg * DEG_TO_RAD
  const lon = normalizeLongitudeDeg(origin.longitudeDeg) * DEG_TO_RAD
  const sinLat = Math.sin(lat)
  const cosLat = Math.cos(lat)
  const sinLon = Math.sin(lon)
  const cosLon = Math.cos(lon)

  return {
    eastM: -sinLon * dx + cosLon * dy,
    northM: -sinLat * cosLon * dx - sinLat * sinLon * dy + cosLat * dz,
    upM: cosLat * cosLon * dx + cosLat * sinLon * dy + sinLat * dz
  }
}

export function enuToEcef(point: EnuPoint, origin: GeodeticPoint | EnuFrame): Cartesian3 {
  assertFinite(point.eastM, 'ENU east')
  assertFinite(point.northM, 'ENU north')
  assertFinite(point.upM, 'ENU up')
  if ('origin' in origin) {
    return {
      x: origin.origin.x + point.eastM * origin.east.x + point.northM * origin.north.x + point.upM * origin.up.x,
      y: origin.origin.y + point.eastM * origin.east.y + point.northM * origin.north.y + point.upM * origin.up.y,
      z: origin.origin.z + point.eastM * origin.east.z + point.northM * origin.north.z + point.upM * origin.up.z
    }
  }
  assertGeodeticPoint(origin)

  const originEcef = geodeticToEcef(origin)
  const lat = origin.latitudeDeg * DEG_TO_RAD
  const lon = normalizeLongitudeDeg(origin.longitudeDeg) * DEG_TO_RAD
  const sinLat = Math.sin(lat)
  const cosLat = Math.cos(lat)
  const sinLon = Math.sin(lon)
  const cosLon = Math.cos(lon)

  return {
    x: originEcef.x - sinLon * point.eastM - sinLat * cosLon * point.northM + cosLat * cosLon * point.upM,
    y: originEcef.y + cosLon * point.eastM - sinLat * sinLon * point.northM + cosLat * sinLon * point.upM,
    z: originEcef.z + cosLat * point.northM + sinLat * point.upM
  }
}


/** Compatibility frame used by the merged Phase 0-11 spatial modules. */
export function enuFrame(anchor: GeodeticPoint): EnuFrame {
  assertGeodeticPoint(anchor)
  const lat = anchor.latitudeDeg * DEG_TO_RAD
  const lon = anchor.longitudeDeg * DEG_TO_RAD
  const sinLat = Math.sin(lat)
  const cosLat = Math.cos(lat)
  const sinLon = Math.sin(lon)
  const cosLon = Math.cos(lon)
  return {
    origin: geodeticToEcef(anchor),
    east: { x: -sinLon, y: cosLon, z: 0 },
    north: { x: -sinLat * cosLon, y: -sinLat * sinLon, z: cosLat },
    up: { x: cosLat * cosLon, y: cosLat * sinLon, z: sinLat }
  }
}

export function toRenderRelative(point: Cartesian3, origin: Cartesian3): Cartesian3 {
  assertCartesian(point)
  assertCartesian(origin)
  return { x: point.x - origin.x, y: point.y - origin.y, z: point.z - origin.z }
}

/** Exact WGS84 reference-ellipsoid ray intersection. */
export function intersectEllipsoid(origin: Cartesian3, direction: Cartesian3): Cartesian3 | null {
  assertCartesian(origin)
  assertCartesian(direction)
  const a = WGS84.semiMajorAxis
  const b = WGS84.semiMinorAxis
  const o = { x: origin.x / a, y: origin.y / a, z: origin.z / b }
  const d = { x: direction.x / a, y: direction.y / a, z: direction.z / b }
  const aa = d.x * d.x + d.y * d.y + d.z * d.z
  if (aa === 0) return null
  const bb = 2 * (o.x * d.x + o.y * d.y + o.z * d.z)
  const cc = o.x * o.x + o.y * o.y + o.z * o.z - 1
  const discriminant = bb * bb - 4 * aa * cc
  if (discriminant < 0) return null
  const root = Math.sqrt(discriminant)
  const near = (-bb - root) / (2 * aa)
  const far = (-bb + root) / (2 * aa)
  const t = near >= 0 ? near : far >= 0 ? far : null
  return t === null ? null : {
    x: origin.x + direction.x * t,
    y: origin.y + direction.y * t,
    z: origin.z + direction.z * t
  }
}
