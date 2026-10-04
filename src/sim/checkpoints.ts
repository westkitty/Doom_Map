export interface Checkpoint<T> {
  timeMs: number
  state: T
}

export class CheckpointStore<T> {
  private readonly items: Checkpoint<T>[] = []

  constructor(private readonly maxEntries = 32) {
    if (!Number.isSafeInteger(maxEntries) || maxEntries < 1) throw new RangeError('Checkpoint capacity must be positive.')
  }

  put(checkpoint: Checkpoint<T>): void {
    if (!Number.isFinite(checkpoint.timeMs)) throw new RangeError('Checkpoint time must be finite.')
    const existing = this.items.findIndex((item) => item.timeMs === checkpoint.timeMs)
    if (existing >= 0) this.items.splice(existing, 1)
    this.items.push(checkpoint)
    this.items.sort((a, b) => a.timeMs - b.timeMs)
    while (this.items.length > this.maxEntries) this.items.shift()
  }

  nearestAtOrBefore(timeMs: number): Checkpoint<T> | null {
    for (let index = this.items.length - 1; index >= 0; index -= 1) {
      const item = this.items[index]!
      if (item.timeMs <= timeMs) return item
    }
    return null
  }

  list(): readonly Checkpoint<T>[] { return this.items }
}
