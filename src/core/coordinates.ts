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

const DEG_TO_RAD = Math.PI / 180
const RAD_TO_DEG = 180 / Math.PI

export function geodeticToEcef(point: GeodeticPoint): Cartesian3 {
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
  const a = WGS84.semiMajorAxis
  const b = WGS84.semiMinorAxis
  const e2 = 1 - (b * b) / (a * a)
  const ep2 = (a * a - b * b) / (b * b)
  const p = Math.hypot(point.x, point.y)

  if (p < 1e-9) {
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
  // Refine Bowring's initial estimate for orbital as well as surface positions.
  for (let i = 0; i < 6; i++) {
    const n = a / Math.sqrt(1 - e2 * Math.sin(lat) ** 2)
    lat = Math.atan2(point.z + e2 * n * Math.sin(lat), p)
  }
  const lon = Math.atan2(point.y, point.x)
  const sinLat = Math.sin(lat)
  const n = a / Math.sqrt(1 - e2 * sinLat * sinLat)
  const height = p * Math.cos(lat) + point.z * sinLat - n * (1 - e2 * sinLat * sinLat)

  return {
    latitudeDeg: lat * RAD_TO_DEG,
    longitudeDeg: lon * RAD_TO_DEG,
    heightM: height
  }
}

export interface EnuPoint { eastM: number; northM: number; upM: number }
export interface EnuFrame {
  origin: Cartesian3
  east: Cartesian3
  north: Cartesian3
  up: Cartesian3
}

/** Float64 JS numbers remain authoritative; renderer vectors are only copies. */
export function enuFrame(anchor: GeodeticPoint): EnuFrame {
  const lat = anchor.latitudeDeg * DEG_TO_RAD
  const lon = anchor.longitudeDeg * DEG_TO_RAD
  const s = Math.sin(lat), c = Math.cos(lat), sl = Math.sin(lon), cl = Math.cos(lon)
  return { origin: geodeticToEcef(anchor), east: { x: -sl, y: cl, z: 0 },
    north: { x: -s * cl, y: -s * sl, z: c }, up: { x: c * cl, y: c * sl, z: s } }
}

export function ecefToEnu(point: Cartesian3, frame: EnuFrame): EnuPoint {
  const d = toRenderRelative(point, frame.origin)
  const dot = (v: Cartesian3): number => d.x * v.x + d.y * v.y + d.z * v.z
  return { eastM: dot(frame.east), northM: dot(frame.north), upM: dot(frame.up) }
}

export function enuToEcef(point: EnuPoint, frame: EnuFrame): Cartesian3 {
  const component = (key: keyof Cartesian3): number => frame.origin[key] +
    point.eastM * frame.east[key] + point.northM * frame.north[key] + point.upM * frame.up[key]
  return { x: component('x'), y: component('y'), z: component('z') }
}

export function toRenderRelative(point: Cartesian3, origin: Cartesian3): Cartesian3 {
  return { x: point.x - origin.x, y: point.y - origin.y, z: point.z - origin.z }
}

/** Exact reference-ellipsoid intersection, independent of presentation mesh LOD. */
export function intersectEllipsoid(origin: Cartesian3, direction: Cartesian3): Cartesian3 | null {
  const a = WGS84.semiMajorAxis, b = WGS84.semiMinorAxis
  const o = { x: origin.x / a, y: origin.y / a, z: origin.z / b }
  const d = { x: direction.x / a, y: direction.y / a, z: direction.z / b }
  const aa = d.x * d.x + d.y * d.y + d.z * d.z
  if (aa === 0) return null
  const bb = 2 * (o.x * d.x + o.y * d.y + o.z * d.z)
  const cc = o.x * o.x + o.y * o.y + o.z * o.z - 1
  const discriminant = bb * bb - 4 * aa * cc
  if (discriminant < 0) return null
  const root = Math.sqrt(discriminant)
  const near = (-bb - root) / (2 * aa), far = (-bb + root) / (2 * aa)
  const t = near >= 0 ? near : far >= 0 ? far : null
  return t === null ? null : { x: origin.x + direction.x * t,
    y: origin.y + direction.y * t, z: origin.z + direction.z * t }
}
