import type { DataProvider, DecodedTile, TileRequest } from './providers/types'

interface Options<T> {
  concurrency: number
  maxTiles: number
  maxBytes: number
  retries: number
  retryDelayMs: number
  onLoad: (id: string, tile: DecodedTile<T>) => void
  onUnload: (id: string) => void
  onError: (id: string, error: unknown) => void
}

/** Provider-scoped bounded CPU cache and request lifecycle. GPU owner is onLoad/onUnload. */
export class TileScheduler<T> {
  private desired = new Map<string, TileRequest>()
  private readonly active = new Map<string, AbortController>()
  private readonly cache = new Map<string, DecodedTile<T>>()
  private readonly resident = new Set<string>()
  private readonly failed = new Set<string>()
  private disposed = false
  private bytes = 0

  constructor(private readonly provider: DataProvider<T>, private readonly options: Options<T>) {
    if (!Number.isInteger(options.concurrency) || options.concurrency < 1 || !Number.isInteger(options.maxTiles) || options.maxTiles < 1 || options.maxBytes < 1 || options.retries < 0) throw new Error('Invalid scheduler limits')
  }

  update(requests: TileRequest[]): void {
    if (this.disposed) return
    // The residency budget also bounds the desired queue, independently of caller input.
    this.desired = new Map([...requests].sort((a, b) => b.priority - a.priority)
      .slice(0, this.options.maxTiles).map(r => [r.id, r]))
    for (const [id, controller] of this.active) if (!this.desired.has(id)) controller.abort()
    for (const id of this.resident) if (!this.desired.has(id)) {
      this.options.onUnload(id)
      this.resident.delete(id)
    }
    for (const id of this.failed) if (!this.desired.has(id)) this.failed.delete(id)
    for (const id of this.desired.keys()) {
      const cached = this.cache.get(id)
      if (cached) {
        this.cache.delete(id)
        this.cache.set(id, cached)
        this.publish(id, cached)
      }
    }
    this.pump()
  }

  snapshot() {
    return { queued: [...this.desired.keys()].filter(id => !this.active.has(id) && !this.cache.has(id) && !this.failed.has(id)).length,
      active: this.active.size, cached: this.cache.size, decodedBytes: this.bytes,
      resident: this.resident.size, failed: this.failed.size,
      health: this.failed.size ? 'degraded' : this.active.size ? 'loading' : 'ready' }
  }

  dispose(): void {
    if (this.disposed) return
    this.disposed = true
    for (const controller of this.active.values()) controller.abort()
    for (const id of this.resident) this.options.onUnload(id)
    this.resident.clear()
    this.desired.clear()
    this.cache.clear()
    this.failed.clear()
    this.bytes = 0
  }

  private publish(id: string, tile: DecodedTile<T>): void {
    if (!this.resident.has(id)) {
      this.options.onLoad(id, tile)
      this.resident.add(id)
    }
  }

  private pump(): void {
    if (this.disposed) return
    for (const request of this.desired.values()) {
      if (this.active.size >= this.options.concurrency) break
      if (this.active.has(request.id) || this.cache.has(request.id) || this.failed.has(request.id)) continue
      const controller = new AbortController()
      this.active.set(request.id, controller)
      void this.run(request, controller)
    }
  }

  private async run(request: TileRequest, controller: AbortController): Promise<void> {
    const { id } = request, { signal } = controller
    try {
      let tile: DecodedTile<T> | undefined
      for (let attempt = 0; attempt <= this.options.retries; attempt++) {
        try { tile = await this.provider.load(request, signal); break }
        catch (error) {
          if (signal.aborted || attempt === this.options.retries) throw error
          await delay(this.options.retryDelayMs * 2 ** attempt, signal)
        }
      }
      // Providers may ignore AbortSignal; obsolete results still cannot mutate state.
      if (this.disposed || signal.aborted || !this.desired.has(id) || !tile) return
      if (!Number.isFinite(tile.bytes) || tile.bytes < 0 || tile.bytes > this.options.maxBytes) throw new Error('Decoded tile exceeds memory budget')
      while (this.cache.size >= this.options.maxTiles || this.bytes + tile.bytes > this.options.maxBytes) {
        const oldest = [...this.cache.keys()].find(key => !this.desired.has(key)) ?? this.cache.keys().next().value
        if (oldest === undefined) break
        const evicted = this.cache.get(oldest)!
        this.cache.delete(oldest)
        this.bytes -= evicted.bytes
        if (this.resident.delete(oldest)) this.options.onUnload(oldest)
        // Avoid reload thrash if current desired set cannot fit its byte budget.
        if (this.desired.has(oldest)) {
          this.failed.add(oldest)
          this.options.onError(oldest, new Error('Tile evicted: active region exceeds memory budget'))
        }
      }
      this.cache.set(id, tile)
      this.bytes += tile.bytes
      this.publish(id, tile)
    } catch (error) {
      if (!this.disposed && !signal.aborted && this.desired.has(id)) {
        this.failed.add(id)
        this.options.onError(id, error)
      }
    } finally {
      this.active.delete(id)
      this.pump()
    }
  }
}

function delay(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const abort = (): void => { clearTimeout(timer); signal.removeEventListener('abort', abort); reject(new Error('Aborted')) }
    const timer = setTimeout(() => { signal.removeEventListener('abort', abort); resolve() }, ms)
    signal.addEventListener('abort', abort, { once: true })
    if (signal.aborted) abort()
  })
}
