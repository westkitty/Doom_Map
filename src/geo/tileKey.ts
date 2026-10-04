export interface TileKey { z: number; x: number; y: number }
export interface GeoBounds { westDeg: number; southDeg: number; eastDeg: number; northDeg: number }

function validateZoom(z: number): void {
  if (!Number.isSafeInteger(z) || z < 0 || z > 30) throw new RangeError('Tile zoom must be an integer from 0 to 30.')
}

export function normalizeTileKey(tile: TileKey): TileKey {
  validateZoom(tile.z)
  const count = 2 ** tile.z
  if (!Number.isSafeInteger(tile.x) || !Number.isSafeInteger(tile.y)) throw new RangeError('Tile x/y must be integers.')
  if (tile.y < 0 || tile.y >= count) throw new RangeError('Tile y is outside the zoom range.')
  const x = ((tile.x % count) + count) % count
  return { z: tile.z, x, y: tile.y }
}

export function tileKeyToString(tile: TileKey): string {
  const value = normalizeTileKey(tile)
  return `${value.z}/${value.x}/${value.y}`
}

function mercatorYToLatitudeDeg(y: number): number {
  const n = Math.PI - 2 * Math.PI * y
  return 180 / Math.PI * Math.atan(Math.sinh(n))
}

export function tileBounds(tile: TileKey): GeoBounds {
  const value = normalizeTileKey(tile)
  const count = 2 ** value.z
  return {
    westDeg: value.x / count * 360 - 180,
    eastDeg: (value.x + 1) / count * 360 - 180,
    northDeg: mercatorYToLatitudeDeg(value.y / count),
    southDeg: mercatorYToLatitudeDeg((value.y + 1) / count)
  }
}
