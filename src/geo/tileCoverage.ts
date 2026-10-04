import type { GeoBounds } from './tileKey'
import type { TileKey } from './tileKey'
import { lonLatToTile } from './webMercator'

function xRanges(bounds: GeoBounds, z: number): Array<[number, number]> {
  const n = 2 ** z
  const west = lonLatToTile(bounds.westDeg, 0, z).x
  const east = lonLatToTile(bounds.eastDeg === 180 ? 179.999999999 : bounds.eastDeg, 0, z).x
  return bounds.westDeg <= bounds.eastDeg ? [[west, east]] : [[west, n - 1], [0, east]]
}

export function tilesForBounds(bounds: GeoBounds, z: number, maxTiles = 4096): TileKey[] {
  if (![bounds.westDeg, bounds.southDeg, bounds.eastDeg, bounds.northDeg].every(Number.isFinite)) throw new RangeError('Bounds must be finite.')
  if (bounds.southDeg > bounds.northDeg) throw new RangeError('South must not exceed north.')
  if (!Number.isSafeInteger(maxTiles) || maxTiles < 1) throw new RangeError('maxTiles must be a positive integer.')

  const northY = lonLatToTile(0, bounds.northDeg, z).y
  const southY = lonLatToTile(0, bounds.southDeg, z).y
  const result: TileKey[] = []

  for (const [startX, endX] of xRanges(bounds, z)) {
    for (let y = northY; y <= southY; y += 1) {
      for (let x = startX; x <= endX; x += 1) {
        result.push({ z, x, y })
        if (result.length > maxTiles) throw new Error(`Tile coverage exceeds maxTiles=${maxTiles}.`)
      }
    }
  }

  return result
}
