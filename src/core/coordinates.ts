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
  const lat = Math.atan2(
    point.z + ep2 * b * sinTheta * sinTheta * sinTheta,
    p - e2 * a * cosTheta * cosTheta * cosTheta
  )
  const lon = Math.atan2(point.y, point.x)
  const sinLat = Math.sin(lat)
  const n = a / Math.sqrt(1 - e2 * sinLat * sinLat)
  const height = p / Math.cos(lat) - n

  return {
    latitudeDeg: lat * RAD_TO_DEG,
    longitudeDeg: lon * RAD_TO_DEG,
    heightM: height
  }
}
