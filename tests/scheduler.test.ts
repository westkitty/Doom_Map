import { expect, it, vi } from 'vitest'
import { TileScheduler } from '../src/data/TileScheduler'
import type { DataProvider, TileRequest, DecodedTile } from '../src/data/providers/types'
import providers from '../data/providers.json'
import { parseManifest } from '../src/data/provenance'

const request = (id: string, priority = 1): TileRequest => ({ id, priority, lod: 1, bounds: { west: 0, south: 0, east: 30, north: 30 } })
function setup(load: DataProvider<number>['load'], overrides = {}) {
  const onLoad = vi.fn(), onUnload = vi.fn(), onError = vi.fn()
  const scheduler = new TileScheduler<number>({ provenance: parseManifest(providers, 'provider')[0]!, kind: 'vectors', load },
    { concurrency: 2, maxTiles: 3, maxBytes: 30, retries: 1, retryDelayMs: 1, onLoad, onUnload, onError, ...overrides })
  return { scheduler, onLoad, onUnload, onError }
}
const flush = async () => { for (let i = 0; i < 10; i++) await Promise.resolve() }

it('bounds concurrency, cancels obsolete work and rejects late results from uncooperative providers', async () => {
  const pending = new Map<string, { resolve: (tile: DecodedTile<number>) => void; signal: AbortSignal }>()
  const load = vi.fn((r: TileRequest, signal: AbortSignal) => new Promise<DecodedTile<number>>(resolve => pending.set(r.id, { resolve, signal })))
  const { scheduler, onLoad } = setup(load)
  scheduler.update([request('a'), request('b', 2), request('c')])
  expect(load.mock.calls.map(c => c[0].id)).toEqual(['b', 'a'])
  scheduler.update([request('c')])
  expect(pending.get('a')!.signal.aborted).toBe(true)
  pending.get('a')!.resolve({ data: 1, bytes: 10 })
  pending.get('b')!.resolve({ data: 2, bytes: 10 })
  await flush()
  expect(onLoad).not.toHaveBeenCalled()
  expect(scheduler.snapshot().active).toBe(1)
  pending.get('c')!.resolve({ data: 3, bytes: 10 })
  await flush()
  expect(onLoad).toHaveBeenCalledExactlyOnceWith('c', { data: 3, bytes: 10 })
  scheduler.dispose()
})

it('evicts CPU cache, unloads GPU ownership and reuses retained LRU entries', async () => {
  const load = vi.fn(async () => ({ data: 1, bytes: 10 }))
  const { scheduler, onUnload } = setup(load)
  for (let i = 0; i < 20; i++) {
    scheduler.update([request(String(i))]); await flush()
    expect(scheduler.snapshot().cached).toBeLessThanOrEqual(3)
    expect(scheduler.snapshot().decodedBytes).toBeLessThanOrEqual(30)
    expect(scheduler.snapshot().resident).toBe(1)
  }
  scheduler.update([request('18')]); await flush()
  expect(load).toHaveBeenCalledTimes(20)
  expect(onUnload).toHaveBeenCalledTimes(20)
  scheduler.dispose()
  expect(scheduler.snapshot().decodedBytes).toBe(0)
  expect(scheduler.snapshot().resident).toBe(0)
})

it('retries once with backoff then reports explicit failure without infinite reload', async () => {
  const load = vi.fn(async () => { throw new Error('HTTP 503') })
  const { scheduler, onError } = setup(load)
  scheduler.update([request('a')])
  await vi.waitFor(() => expect(onError).toHaveBeenCalledTimes(1))
  expect(load).toHaveBeenCalledTimes(2)
  scheduler.update([request('a')]); await flush()
  expect(load).toHaveBeenCalledTimes(2)
  expect(scheduler.snapshot().health).toBe('degraded')
  scheduler.dispose()
})

it('rejects oversized data and cannot publish after disposal', async () => {
  const { scheduler, onLoad, onError } = setup(async () => ({ data: 0, bytes: 31 }))
  scheduler.update([request('a')]); await flush()
  expect(onError).toHaveBeenCalledTimes(1)
  expect(onLoad).not.toHaveBeenCalled()
  scheduler.update([request('b')]); scheduler.dispose(); await flush()
  expect(onLoad).not.toHaveBeenCalled()
  expect(scheduler.snapshot().active).toBe(0)
})
