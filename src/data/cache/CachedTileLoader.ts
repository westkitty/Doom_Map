import type { CacheIdentity, TileCache } from './PersistentTileCache'
import type { DecodedTile } from '../providers/types'

export interface CachePolicy { freshMs: number; maxStaleMs: number }
export interface CacheStatus { hits: number; network: number; stale: number; warning: string }

/** Persistent payloads are untrusted: decode and validate on every read. */
export class CachedTileLoader<T> {
  readonly status: CacheStatus = { hits: 0, network: 0, stale: 0, warning: '' }
  constructor(private readonly cache: TileCache, private readonly policy: CachePolicy,
    private readonly decode: (text: string) => DecodedTile<T>, private readonly now = Date.now) {
    if (!Number.isFinite(policy.freshMs) || !Number.isFinite(policy.maxStaleMs) || policy.freshMs < 0 || policy.maxStaleMs < policy.freshMs) throw new Error('Invalid freshness policy')
  }

  async load(identity: CacheIdentity, fetchText: () => Promise<string>, signal: AbortSignal): Promise<DecodedTile<T>> {
    signal.throwIfAborted()
    let cached: { tile: DecodedTile<T>; storedAt: number; age: number } | undefined
    try {
      const record = await this.cache.get(identity, signal)
      signal.throwIfAborted()
      if (record) {
        try {
          const age = this.now() - record.storedAt
          if (age >= 0 && age <= this.policy.maxStaleMs) cached = { tile: this.decode(record.text), storedAt: record.storedAt, age }
          else await this.cache.remove(identity)
        } catch { await this.cache.remove(identity) }
      }
    } catch (error) {
      signal.throwIfAborted()
      this.status.warning = `Persistent cache unavailable: ${String(error)}`
    }
    signal.throwIfAborted()
    if (cached && cached.age <= this.policy.freshMs) {
      this.status.hits++
      return { ...cached.tile, delivery: { source: 'persistent-cache', storedAt: cached.storedAt } }
    }
    try {
      const text = await fetchText()
      signal.throwIfAborted()
      const tile = this.decode(text)
      const storedAt = this.now()
      this.status.network++
      try { await this.cache.put(identity, text, signal) }
      catch (error) {
        signal.throwIfAborted()
        this.status.warning = `Persistent cache write failed: ${String(error)}`
      }
      signal.throwIfAborted()
      return { ...tile, delivery: { source: 'network', storedAt } }
    } catch (error) {
      signal.throwIfAborted()
      if (!cached) throw error
      this.status.stale++
      return { ...cached.tile, delivery: { source: 'stale-cache', storedAt: cached.storedAt, reason: String(error) } }
    }
  }
}
