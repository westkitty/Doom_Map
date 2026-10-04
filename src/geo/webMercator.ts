import type { TileKey } from './tileKey'

export const WEB_MERCATOR_MAX_LATITUDE = 85.0511287798066

function validateZoom(z: number): void {
  if (!Number.isSafeInteger(z) || z < 0 || z > 30) throw new RangeError('Zoom must be an integer from 0 to 30.')
}

export function normalizeLongitude(longitudeDeg: number): number {
  if (!Number.isFinite(longitudeDeg)) throw new RangeError('Longitude must be finite.')
  return ((longitudeDeg + 180) % 360 + 360) % 360 - 180
}

export function clampMercatorLatitude(latitudeDeg: number): number {
  if (!Number.isFinite(latitudeDeg)) throw new RangeError('Latitude must be finite.')
  return Math.max(-WEB_MERCATOR_MAX_LATITUDE, Math.min(WEB_MERCATOR_MAX_LATITUDE, latitudeDeg))
}

export function lonLatToTileFraction(longitudeDeg: number, latitudeDeg: number, z: number): { x: number; y: number; z: number } {
  validateZoom(z)
  const n = 2 ** z
  const lon = normalizeLongitude(longitudeDeg)
  const lat = clampMercatorLatitude(latitudeDeg) * Math.PI / 180
  const x = (lon + 180) / 360 * n
  const y = (1 - Math.asinh(Math.tan(lat)) / Math.PI) / 2 * n
  return { x, y, z }
}

export function lonLatToTile(longitudeDeg: number, latitudeDeg: number, z: number): TileKey {
  const fraction = lonLatToTileFraction(longitudeDeg, latitudeDeg, z)
  const n = 2 ** z
  return {
    z,
    x: Math.min(n - 1, Math.max(0, Math.floor(fraction.x))),
    y: Math.min(n - 1, Math.max(0, Math.floor(fraction.y)))
  }
}

export function tileCenterLonLat(tile: TileKey): { longitudeDeg: number; latitudeDeg: number } {
  validateZoom(tile.z)
  const n = 2 ** tile.z
  if (!Number.isSafeInteger(tile.x) || !Number.isSafeInteger(tile.y) || tile.x < 0 || tile.x >= n || tile.y < 0 || tile.y >= n) {
    throw new RangeError('Tile x/y are outside the zoom range.')
  }
  const x = (tile.x + 0.5) / n
  const y = (tile.y + 0.5) / n
  const longitudeDeg = x * 360 - 180
  const latitudeDeg = 180 / Math.PI * Math.atan(Math.sinh(Math.PI * (1 - 2 * y)))
  return { longitudeDeg, latitudeDeg }
}
