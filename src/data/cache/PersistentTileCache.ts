export interface CacheIdentity { provider: string; version: string; codec: string; tile: string; lod: number }
export interface CacheRecord {
  key: string
  text: string
  bytes: number
  storedAt: number
  accessedAt: number
}
export interface TileCache {
  get(identity: CacheIdentity, signal: AbortSignal): Promise<CacheRecord | undefined>
  put(identity: CacheIdentity, text: string, signal: AbortSignal): Promise<void>
  remove(identity: CacheIdentity): Promise<void>
}
export const CACHE_DATABASE = 'doom-map-provider-cache'
export const CACHE_LIMITS = { maxEntries: 128, maxBytes: 8 * 1024 * 1024 }
export const cacheKey = (id: CacheIdentity): string => JSON.stringify([id.provider, id.version, id.codec, id.lod, id.tile])

/** Separate DB from bookmarks: upgrades/clearing tile data cannot erase saved cameras. */
export class PersistentTileCache implements TileCache {
  constructor(private readonly limits = CACHE_LIMITS) {
    if (!Number.isInteger(limits.maxEntries) || limits.maxEntries < 1 || !Number.isFinite(limits.maxBytes) || limits.maxBytes < 1) throw new Error('Invalid persistent cache limits')
  }

  private open(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(CACHE_DATABASE, 1)
      let settled = false
      const timer = setTimeout(() => { settled = true; reject(new Error('Persistent cache open timed out')) }, 2000)
      request.onupgradeneeded = () => request.result.createObjectStore('tiles', { keyPath: 'key' })
      request.onerror = () => { clearTimeout(timer); settled = true; reject(request.error) }
      request.onblocked = () => { clearTimeout(timer); settled = true; reject(new Error('Persistent cache upgrade blocked')) }
      request.onsuccess = () => {
        clearTimeout(timer)
        if (settled) { request.result.close(); return }
        request.result.onversionchange = () => request.result.close()
        resolve(request.result)
      }
    })
  }

  private async transaction<T>(operation: (store: IDBObjectStore, result: (value: T) => void) => void, signal?: AbortSignal): Promise<T> {
    signal?.throwIfAborted()
    const db = await this.open()
    try {
      signal?.throwIfAborted()
      return await new Promise<T>((resolve, reject) => {
        const tx = db.transaction('tiles', 'readwrite')
        let result: T
        const abort = (): void => { try { tx.abort() } catch { /* already completed */ } }
        const timer = setTimeout(abort, 2000)
        const cleanup = (): void => { clearTimeout(timer); signal?.removeEventListener('abort', abort) }
        signal?.addEventListener('abort', abort, { once: true })
        tx.oncomplete = () => { cleanup(); resolve(result) }
        tx.onabort = () => { cleanup(); reject(tx.error ?? new Error('Persistent cache transaction aborted')) }
        tx.onerror = () => { /* abort handler owns rejection */ }
        try { operation(tx.objectStore('tiles'), value => { result = value }) }
        catch (error) { abort(); cleanup(); reject(error) }
      })
    } finally { db.close() }
  }

  get(identity: CacheIdentity, signal: AbortSignal): Promise<CacheRecord | undefined> {
    return this.transaction((store, result) => {
      const request = store.get(cacheKey(identity))
      request.onsuccess = () => {
        const value = request.result as CacheRecord | undefined
        if (!value) { result(undefined); return }
        if (typeof value.text !== 'string' || !Number.isFinite(value.storedAt) ||
            !Number.isFinite(value.accessedAt) || value.bytes !== new TextEncoder().encode(value.text).byteLength || value.bytes > this.limits.maxBytes) {
          store.delete(cacheKey(identity)); result(undefined); return
        }
        value.accessedAt = Date.now()
        store.put(value)
        result(value)
      }
    }, signal)
  }

  put(identity: CacheIdentity, text: string, signal: AbortSignal): Promise<void> {
    const bytes = new TextEncoder().encode(text).byteLength
    if (bytes > this.limits.maxBytes) return Promise.reject(new Error('Tile exceeds persistent cache budget'))
    return this.transaction((store, result) => {
      const key = cacheKey(identity), now = Date.now()
      // All tabs serialize this transaction; replacing + eviction commits atomically.
      const request = store.getAll()
      request.onsuccess = () => {
        const records = (request.result as CacheRecord[]).filter(r => r.key !== key)
          .sort((a, b) => a.accessedAt - b.accessedAt || a.key.localeCompare(b.key))
        let total = records.reduce((sum, r) => sum + (Number.isFinite(r.bytes) ? r.bytes : this.limits.maxBytes), bytes)
        while (records.length >= this.limits.maxEntries || total > this.limits.maxBytes) {
          const oldest = records.shift()
          if (!oldest) break
          store.delete(oldest.key)
          total -= Number.isFinite(oldest.bytes) ? oldest.bytes : this.limits.maxBytes
        }
        store.put({ key, text, bytes, storedAt: now, accessedAt: now } satisfies CacheRecord)
        result(undefined)
      }
    }, signal)
  }

  remove(identity: CacheIdentity): Promise<void> {
    return this.transaction((store, result) => { store.delete(cacheKey(identity)); result(undefined) })
  }
}
