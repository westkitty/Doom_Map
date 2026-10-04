interface Entry<V> { value: V; bytes: number; touched: number }

export class ByteBudgetLru<K, V> {
  private readonly entries = new Map<K, Entry<V>>()
  private usedBytes = 0
  private clock = 0

  constructor(private readonly budgetBytes: number) {
    if (!Number.isSafeInteger(budgetBytes) || budgetBytes < 0) throw new RangeError('LRU budget must be a non-negative integer.')
  }

  set(key: K, value: V, bytes: number): K[] {
    if (!Number.isSafeInteger(bytes) || bytes < 0) throw new RangeError('Entry size must be a non-negative integer.')
    const previous = this.entries.get(key)
    if (previous) this.usedBytes -= previous.bytes
    this.entries.set(key, { value, bytes, touched: ++this.clock })
    this.usedBytes += bytes
    const evicted: K[] = []
    while (this.usedBytes > this.budgetBytes && this.entries.size > 0) {
      let oldestKey: K | undefined
      let oldestTouch = Number.POSITIVE_INFINITY
      for (const [candidateKey, entry] of this.entries) {
        if (entry.touched < oldestTouch) { oldestTouch = entry.touched; oldestKey = candidateKey }
      }
      if (oldestKey === undefined) break
      this.delete(oldestKey)
      evicted.push(oldestKey)
    }
    return evicted
  }

  get(key: K): V | null {
    const entry = this.entries.get(key)
    if (!entry) return null
    entry.touched = ++this.clock
    return entry.value
  }

  delete(key: K): boolean {
    const entry = this.entries.get(key)
    if (!entry) return false
    this.usedBytes -= entry.bytes
    this.entries.delete(key)
    return true
  }

  clear(): void { this.entries.clear(); this.usedBytes = 0 }
  size(): number { return this.entries.size }
  bytes(): number { return this.usedBytes }
  keys(): K[] { return [...this.entries.keys()] }
}
