import type { TileKey } from './tileKey'
import { tileKeyToString } from './tileKey'

export function prefetchRing(visible: readonly TileKey[], radius = 1): TileKey[] {
  if (!Number.isSafeInteger(radius) || radius < 0 || radius > 8) throw new RangeError('Prefetch radius must be an integer from 0 to 8.')
  if (visible.length === 0 || radius === 0) return []

  const visibleKeys = new Set(visible.map(tileKeyToString))
  const output = new Map<string, TileKey>()

  for (const tile of visible) {
    const n = 2 ** tile.z
    for (let dy = -radius; dy <= radius; dy += 1) {
      for (let dx = -radius; dx <= radius; dx += 1) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) > radius) continue
        const y = tile.y + dy
        if (y < 0 || y >= n) continue
        const x = ((tile.x + dx) % n + n) % n
        const candidate = { z: tile.z, x, y }
        const key = tileKeyToString(candidate)
        if (!visibleKeys.has(key)) output.set(key, candidate)
      }
    }
  }

  return [...output.values()]
}
