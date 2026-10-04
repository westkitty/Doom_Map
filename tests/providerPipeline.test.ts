import { describe, expect, it, vi } from 'vitest'
import { AttributionLedger } from '../src/data/attributionLedger'
import { CircuitBreaker } from '../src/data/circuitBreaker'
import { RequestDeduplicator } from '../src/data/deduplicator'
import type { GeoDataProvider, GeoDataQuery } from '../src/data/geoProvider'
import { HttpJsonProvider } from '../src/data/httpJsonProvider'
import { NetworkState } from '../src/data/networkState'
import { measureJsonPayload } from '../src/data/payloadMetadata'
import { ProviderFailoverChain } from '../src/data/providerChain'
import { RetryPolicy } from '../src/data/retryPolicy'
import { createStaticReferenceProvider } from '../src/data/staticGeoJsonProvider'

const query: GeoDataQuery = {
  bounds: { westDeg: -90, southDeg: 40, eastDeg: -80, northDeg: 45 },
  lod: 3
}

describe('provider composition and resilience', () => {
  it('does not retry permanent HTTP errors', async () => {
    const fetchImpl = vi.fn(async () => new Response('{}', { status: 404 }))
    const provider = new HttpJsonProvider({
      id: 'permanent-failure',
      attribution: 'fixture',
      urlForQuery: () => '/missing',
      fetchImpl,
      retryPolicy: new RetryPolicy({ maxAttempts: 4, baseDelayMs: 0 })
    })
    await expect(provider.fetch(query, new AbortController().signal)).rejects.toThrow(/404/)
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })

  it('falls through to a healthy provider when the first provider fails', async () => {
    const failing: GeoDataProvider<{ ok: boolean }> = {
      id: 'failing', attribution: 'bad',
      fetch: async () => { throw new Error('offline') }
    }
    const healthy: GeoDataProvider<{ ok: boolean }> = {
      id: 'healthy', attribution: 'good',
      fetch: async () => ({ providerId: 'healthy', data: { ok: true }, bytes: 2, contentHash: 'x', fetchedAt: '2026-10-04T00:00:00Z', attribution: 'good' })
    }
    const chain = new ProviderFailoverChain([failing, healthy])
    expect((await chain.fetch(query, new AbortController().signal, 0)).providerId).toBe('healthy')
  })

  it('opens and later half-opens a failing provider circuit', () => {
    const breaker = new CircuitBreaker(2, 100)
    breaker.recordFailure(0); breaker.recordFailure(1)
    expect(breaker.state(50)).toBe('open')
    expect(breaker.canRequest(50)).toBe(false)
    expect(breaker.state(101)).toBe('half-open')
    expect(breaker.canRequest(101)).toBe(true)
    breaker.recordCancellation()
    expect(breaker.canRequest(101)).toBe(true)
  })

  it('deduplicates concurrent consumers and releases settled requests', async () => {
    const dedupe = new RequestDeduplicator()
    let resolve!: (value: string) => void
    const run = vi.fn(() => new Promise<string>((done) => { resolve = done }))
    const a = dedupe.acquire('same', run)
    const b = dedupe.acquire('same', run)
    expect(run).toHaveBeenCalledTimes(1)
    resolve('ok')
    await expect(a.promise).resolves.toBe('ok')
    await expect(b.promise).resolves.toBe('ok')
    a.release(); b.release()
    expect(dedupe.activeCount()).toBe(0)
  })

  it('hashes and byte-counts provider payloads', () => {
    const a = measureJsonPayload({ b: 2, a: 1 })
    const b = measureJsonPayload({ a: 1, b: 2 })
    expect(a.contentHash).toBe(b.contentHash)
    expect(a.bytes).toBeGreaterThan(0)
  })

  it('aggregates active attribution deterministically', () => {
    const ledger = new AttributionLedger()
    ledger.observe({ providerId: 'b', attribution: 'Provider B' })
    ledger.observe({ providerId: 'a', attribution: 'Provider A', datasetVersion: '2026' })
    expect(ledger.renderText()).toBe('Provider A (2026) · Provider B')
  })

  it('exercises the same-origin static GeoJSON provider with validation', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ type: 'FeatureCollection', features: [] }), { status: 200 }))
    const provider = createStaticReferenceProvider('/Doom_Map/', fetchImpl)
    const payload = await provider.fetch(query, new AbortController().signal)
    expect(payload.providerId).toBe('doom-map-reference-regions')
    expect(payload.data.type).toBe('FeatureCollection')
    expect(fetchImpl).toHaveBeenCalledWith('/Doom_Map/data/reference-regions.geojson', expect.any(Object))
  })

  it('tracks network state transitions without inflating duplicate events', () => {
    const state = new NetworkState(true, 0)
    state.observe(true, 1)
    expect(state.snapshot().transitions).toBe(0)
    state.observe(false, 2)
    expect(state.snapshot()).toEqual({ state: 'offline', changedAtMs: 2, transitions: 1 })
  })
})
