import type { TileKey } from './tileKey'

export interface TilePriorityInput {
  tile: TileKey
  center: TileKey
  visible: boolean
  targetZoom: number
  prefetch?: boolean
}

export function tilePriority(input: TilePriorityInput): number {
  if (input.tile.z !== input.center.z) throw new Error('Tile priority requires tiles at the same zoom.')
  const n = 2 ** input.tile.z
  const rawDx = Math.abs(input.tile.x - input.center.x)
  const dx = Math.min(rawDx, n - rawDx)
  const dy = Math.abs(input.tile.y - input.center.y)
  const distancePenalty = (dx + dy) * 100
  const zoomPenalty = Math.abs(input.tile.z - input.targetZoom) * 10_000
  const visibilityBonus = input.visible ? 1_000_000 : 0
  const prefetchPenalty = input.prefetch ? 250_000 : 0
  return visibilityBonus - prefetchPenalty - zoomPenalty - distancePenalty
}
