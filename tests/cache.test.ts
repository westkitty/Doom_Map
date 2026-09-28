import { expect, it } from 'vitest'
import { CachedTileLoader } from '../src/data/cache/CachedTileLoader'
import { cacheKey, type CacheRecord, type TileCache, type CacheIdentity } from '../src/data/cache/PersistentTileCache'
const identity: CacheIdentity = { provider: 'p', version: 'v1', codec: 'c1', tile: '1', lod: 1 }
const controller = new AbortController()
const decode = (text: string) => { if (text !== 'valid') throw new Error('Bad tile'); return { data: 42, bytes: 8 } }
function setup(age = 0, text = 'valid', policy = { freshMs: 10, maxStaleMs: 100 }) {
  let record: CacheRecord | undefined = { key: cacheKey(identity), text, bytes: text.length, storedAt: 1000 - age, accessedAt: 1000 }
  const cache: TileCache = {
    get: async () => record,
    put: async () => {},
    remove: async () => { record = undefined }
  }
  return { cache, loader: new CachedTileLoader(cache, policy, decode, () => 1000), record: () => record }
}
it('separates provider, version, codec, LOD and tile without delimiter collisions', () => {
  const keys = [identity, { ...identity, version: 'v2' }, { ...identity, codec: 'c2' }, { ...identity, lod: 2 }, { ...identity, tile: '2' }, { ...identity, provider: 'q' }].map(cacheKey)
  expect(new Set(keys).size).toBe(6)
  expect(cacheKey({ ...identity, provider: 'a:b', version: 'c' })).not.toBe(cacheKey({ ...identity, provider: 'a', version: 'b:c' }))
})
it('uses a fresh cache without fetching and marks its delivery', async () => {
  const { loader } = setup()
  expect((await loader.load(identity, async () => { throw new Error('must not fetch') }, controller.signal)).delivery?.source).toBe('persistent-cache')
})
it('refreshes stale entries online; explicitly labels stale fallback on network failure', async () => {
  const { loader } = setup(20)
  expect((await loader.load(identity, async () => 'valid', controller.signal)).delivery?.source).toBe('network')
  const stale = await loader.load(identity, async () => { throw new Error('Offline') }, controller.signal)
  expect(stale.delivery).toEqual({ source: 'stale-cache', storedAt: 980, reason: 'Error: Offline' })
})
it.each([101, -1])('removes too-old/future-dated entries (%i) and never silently serves them', async age => {
  const { loader, record } = setup(age)
  await expect(loader.load(identity, async () => { throw new Error('Offline') }, controller.signal)).rejects.toThrow('Offline')
  expect(record()).toBeUndefined()
})
it('rejects corrupt cached payloads before publishing', async () => {
  const { loader, record } = setup(0, 'corrupt')
  expect((await loader.load(identity, async () => 'valid', controller.signal)).delivery?.source).toBe('network')
  expect(record()).toBeUndefined()
})
it('storage denial/quota errors do not disable successful online retrieval', async () => {
  const { loader, cache } = setup()
  cache.get = async () => { throw new Error('SecurityError') }
  cache.put = async () => { throw new Error('QuotaExceededError') }
  expect((await loader.load(identity, async () => 'valid', controller.signal)).data).toBe(42)
  expect(loader.status.warning).toContain('QuotaExceededError')
})
it('cancellation cannot become stale fallback or publish a cache hit', async () => {
  const { loader, cache } = setup(20)
  const abort = new AbortController()
  await expect(loader.load(identity, async () => { abort.abort(); throw new Error('Offline') }, abort.signal)).rejects.toThrow()
  const second = new AbortController()
  cache.get = async () => { second.abort(); return undefined }
  await expect(loader.load(identity, async () => 'valid', second.signal)).rejects.toThrow()
})
