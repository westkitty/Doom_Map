export class SnapshotHistory<T> {
  private readonly entries: Array<{ key: string; value: T }> = []
  private index = -1
  constructor(private readonly maxEntries = 40) {}
  push(value: T, key: string): void {
    if (this.index >= 0 && this.entries[this.index]?.key === key) return
    if (this.index < this.entries.length - 1) this.entries.splice(this.index + 1)
    this.entries.push({ key, value })
    if (this.entries.length > this.maxEntries) this.entries.shift()
    this.index = this.entries.length - 1
  }
  back(): T | null { if (!this.canBack()) return null; this.index -= 1; return this.entries[this.index]?.value ?? null }
  forward(): T | null { if (!this.canForward()) return null; this.index += 1; return this.entries[this.index]?.value ?? null }
  canBack(): boolean { return this.index > 0 }
  canForward(): boolean { return this.index >= 0 && this.index < this.entries.length - 1 }
}
