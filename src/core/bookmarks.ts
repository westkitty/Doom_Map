export interface CameraBookmark { position: [number, number, number]; target: [number, number, number] }

export function validBookmark(value: unknown): value is CameraBookmark {
  if (!value || typeof value !== 'object') return false
  const b = value as CameraBookmark
  return [b.position, b.target].every(a => Array.isArray(a) && a.length === 3 && a.every(n => typeof n === 'number' && Number.isFinite(n) && Math.abs(n) < 1e9)) &&
    Math.hypot(...b.position) > 6_350_000
}

/** A single named camera bookmark; IndexedDB is the persistence owner. */
export async function cameraBookmark(action: 'save' | 'load', value?: CameraBookmark): Promise<CameraBookmark | undefined> {
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open('doom-map', 1)
    request.onupgradeneeded = () => request.result.createObjectStore('bookmarks')
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction('bookmarks', action === 'save' ? 'readwrite' : 'readonly')
      const store = tx.objectStore('bookmarks')
      const request = action === 'save' ? store.put(value, 'camera') : store.get('camera')
      tx.oncomplete = () => resolve(validBookmark(request.result) ? request.result : undefined)
      tx.onerror = () => reject(tx.error)
      tx.onabort = () => reject(tx.error ?? new Error('Bookmark transaction aborted'))
    })
  } finally { db.close() }
}
