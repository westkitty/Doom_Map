export type TileResidencyState = 'requested' | 'resident' | 'failed' | 'evicted'

export interface TileResidencyRecord {
  key: string
  state: TileResidencyState
  bytes: number
  generation: number
  updatedAtMs: number
  error?: string
}

export class TileResidencyTracker {
  private readonly records = new Map<string, TileResidencyRecord>()

  update(record: TileResidencyRecord): void {
    if (!record.key.trim()) throw new Error('Tile residency key is required.')
    if (!Number.isSafeInteger(record.bytes) || record.bytes < 0) throw new RangeError('Tile bytes must be a non-negative integer.')
    if (!Number.isSafeInteger(record.generation) || record.generation < 0) throw new RangeError('Tile generation must be non-negative.')
    if (!Number.isFinite(record.updatedAtMs)) throw new RangeError('Tile timestamp must be finite.')
    this.records.set(record.key, { ...record })
  }

  get(key: string): TileResidencyRecord | null { return this.records.get(key) ?? null }
  list(): TileResidencyRecord[] { return [...this.records.values()].map((record) => ({ ...record })) }

  residentBytes(): number {
    return this.list().filter((record) => record.state === 'resident').reduce((sum, record) => sum + record.bytes, 0)
  }

  counts(): Record<TileResidencyState, number> {
    const counts: Record<TileResidencyState, number> = { requested: 0, resident: 0, failed: 0, evicted: 0 }
    for (const record of this.records.values()) counts[record.state] += 1
    return counts
  }
}
