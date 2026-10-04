import { ByteBudgetLru } from './byteLru'
import { RequestDeduplicator, type SharedRequest } from './deduplicator'
import type { GeoDataPayload } from './geoProvider'
import { AttributionLedger } from './attributionLedger'
import { ProviderFailoverChain } from './providerChain'
import { RequestScheduler } from './requestScheduler'
import { classifyFreshness, type FreshnessPolicy } from './freshness'
import { TileResidencyTracker } from './tileResidency'
import { tileBounds, tileKeyToString, type TileKey } from '../geo/tileKey'

export interface GeoTileStoreStats {
  cacheHits: number
  cacheMisses: number
  networkLoads: number
  failures: number
  residentTiles: number
  residentBytes: number
  activeSharedRequests: number
  queuedRequests: number
  activeRequests: number
  residency: ReturnType<TileResidencyTracker['counts']>
}

export class GeoTileStore<T> {
  private readonly cache: ByteBudgetLru<string, GeoDataPayload<T>>
  private readonly dedupe = new RequestDeduplicator()
  private readonly scheduler: RequestScheduler
  private readonly attribution = new AttributionLedger()
  private readonly residency = new TileResidencyTracker()
  private sequence = 0
  private hits = 0
  private misses = 0
  private loads = 0
  private failures = 0

  constructor(
    private readonly providers: ProviderFailoverChain<T>,
    cacheBudgetBytes: number,
    maxConcurrent: number,
    private readonly freshness: FreshnessPolicy = { maxAgeMs: 5 * 60_000, staleWhileRevalidateMs: 30 * 60_000 }
  ) {
    this.cache = new ByteBudgetLru(cacheBudgetBytes)
    this.scheduler = new RequestScheduler(maxConcurrent)
  }

  acquire(tile: TileKey, priority: number, generation = 0, nowMs = Date.now()): SharedRequest<GeoDataPayload<T>> {
    const key = tileKeyToString(tile)
    const cached = this.cache.get(key)
    if (cached) {
      const freshness = classifyFreshness(cached.fetchedAt, this.freshness, nowMs)
      if (freshness === 'fresh' || freshness === 'stale') {
        this.hits += 1
        this.residency.update({ key, state: 'resident', bytes: cached.bytes, generation, updatedAtMs: nowMs })
        return { promise: Promise.resolve(cached), release: () => {} }
      }
    }

    this.misses += 1
    return this.dedupe.acquire(key, (sharedSignal) => {
      const requestId = `tile:${key}:${generation}:${this.sequence++}`
      this.residency.update({ key, state: 'requested', bytes: 0, generation, updatedAtMs: nowMs })
      const onSharedAbort = (): void => { this.scheduler.cancel(requestId) }
      sharedSignal.addEventListener('abort', onSharedAbort, { once: true })

      return this.scheduler.enqueue({
        id: requestId,
        priority,
        run: (signal) => this.providers.fetch({ bounds: tileBounds(tile), lod: tile.z }, signal, nowMs)
      }).then((payload) => {
        this.loads += 1
        const evicted = this.cache.set(key, payload, payload.bytes)
        for (const evictedKey of evicted) {
          const previous = this.residency.get(evictedKey)
          this.residency.update({
            key: evictedKey,
            state: 'evicted',
            bytes: 0,
            generation: previous?.generation ?? generation,
            updatedAtMs: nowMs
          })
        }
        this.attribution.observe({
          providerId: payload.providerId,
          attribution: payload.attribution,
          ...(payload.datasetVersion ? { datasetVersion: payload.datasetVersion } : {})
        })
        this.residency.update({ key, state: 'resident', bytes: payload.bytes, generation, updatedAtMs: nowMs })
        return payload
      }).catch((error: unknown) => {
        this.failures += 1
        this.residency.update({
          key,
          state: 'failed',
          bytes: 0,
          generation,
          updatedAtMs: nowMs,
          error: error instanceof Error ? error.message : String(error)
        })
        throw error
      }).finally(() => {
        sharedSignal.removeEventListener('abort', onSharedAbort)
      })
    })
  }

  attributionText(): string { return this.attribution.renderText() }

  stats(): GeoTileStoreStats {
    return {
      cacheHits: this.hits,
      cacheMisses: this.misses,
      networkLoads: this.loads,
      failures: this.failures,
      residentTiles: this.cache.size(),
      residentBytes: this.cache.bytes(),
      activeSharedRequests: this.dedupe.activeCount(),
      queuedRequests: this.scheduler.queuedCount(),
      activeRequests: this.scheduler.activeCount(),
      residency: this.residency.counts()
    }
  }
}
