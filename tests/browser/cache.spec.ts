import { test, expect, type Page } from '@playwright/test'

async function open(page: Page) {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('./')
  await expect(page.locator('#globe')).toHaveAttribute('data-geography', 'ready')
  await page.getByText('Navigate Earth', { exact: true }).click()
  await page.getByLabel('Altitude (m)').fill('500000')
}
async function fly(page: Page) {
  await page.getByRole('button', { name: 'Fly to coordinates' }).click()
}
async function stats(page: Page) {
  return page.locator('#globe').evaluate(el => JSON.parse((el as HTMLElement).dataset.runtime!).streaming)
}
async function mutate(page: Page, mode: 'stale' | 'expired' | 'version' | 'corrupt' | 'overfull') {
  await page.evaluate(async mode => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const r = indexedDB.open('doom-map-provider-cache', 1)
      r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error)
    })
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('tiles', 'readwrite'), store = tx.objectStore('tiles')
      const r = store.getAll()
      r.onsuccess = () => {
        for (const entry of r.result) {
          if (mode === 'version') { store.delete(entry.key); const key = JSON.parse(entry.key); key[1] = 'wrong-version'; entry.key = JSON.stringify(key) }
          if (mode === 'stale' || mode === 'expired') entry.storedAt -= (mode === 'stale' ? 31 : 366) * 86400_000
          if (mode === 'corrupt') { entry.text = '{"bad":true}'; entry.bytes = new TextEncoder().encode(entry.text).byteLength }
          store.put(entry)
        }
        if (mode === 'overfull') {
          store.clear()
          for (let i = 0; i < 140; i++) store.put({ key: `old-${i}`, text: 'x'.repeat(65536), bytes: 65536, storedAt: 1, accessedAt: 1 })
        }
      }
      tx.oncomplete = () => resolve(); tx.onabort = () => reject(tx.error)
    })
    db.close()
  }, mode)
}

test('cached regional tiles survive reload and work with browser networking offline', async ({ page, context }) => {
  await open(page); await fly(page)
  await expect.poll(async () => (await stats(page)).visible).toBe(true)
  await open(page)
  await context.setOffline(true)
  await fly(page)
  await expect.poll(async () => (await stats(page)).cachedTiles).toBe(9)
  await expect(page.locator('#streaming-status')).toContainText('9 persistent-cache tiles')
  expect((await stats(page)).persistent.network).toBe(0)
})

test('stale cached tiles are labeled when refresh fails', async ({ page }) => {
  await open(page); await fly(page)
  await expect.poll(async () => (await stats(page)).visible).toBe(true)
  await mutate(page, 'stale')
  await page.route('**/data/ne-110m/*.json', r => r.fulfill({ status: 503, body: 'Unavailable' }))
  await open(page); await fly(page)
  await expect.poll(async () => (await stats(page)).staleTiles).toBe(9)
  await expect(page.locator('#streaming-status')).toContainText('9 stale-cache fallback tiles')
})

for (const mode of ['expired', 'version', 'corrupt'] as const) {
  test(`${mode} entries cannot silently replace unavailable source data`, async ({ page }) => {
    await open(page); await fly(page)
    await expect.poll(async () => (await stats(page)).visible).toBe(true)
    await mutate(page, mode)
    await page.route('**/data/ne-110m/*.json', r => r.fulfill({ status: 503, body: 'Unavailable' }))
    await open(page); await fly(page)
    await expect(page.locator('#streaming-status')).toContainText('Regional provider degraded')
    expect((await stats(page)).staleTiles).toBe(0)
  })
}

test('atomic cache insertion evicts to entry and byte bounds', async ({ page }) => {
  await open(page); await fly(page)
  await expect.poll(async () => (await stats(page)).visible).toBe(true)
  await mutate(page, 'overfull')
  await open(page); await fly(page)
  await expect.poll(async () => (await stats(page)).visible).toBe(true)
  const records = await page.evaluate(async () => {
    return new Promise<{ count: number; bytes: number }>((resolve, reject) => {
      const r = indexedDB.open('doom-map-provider-cache', 1)
      r.onerror = () => reject(r.error)
      r.onsuccess = () => {
        const db = r.result, tx = db.transaction('tiles'), get = tx.objectStore('tiles').getAll()
        tx.oncomplete = () => { db.close(); resolve({ count: get.result.length, bytes: get.result.reduce((sum, entry) => sum + entry.bytes, 0) }) }
        tx.onabort = () => { db.close(); reject(tx.error) }
      }
    })
  })
  expect(records.count).toBeLessThanOrEqual(128)
  expect(records.bytes).toBeLessThanOrEqual(8 * 1024 * 1024)
})

test('storage denial is visible while network geography stays usable', async ({ page }) => {
  await page.addInitScript(() => {
    const original = IDBFactory.prototype.open
    IDBFactory.prototype.open = function (name, version) {
      if (name === 'doom-map-provider-cache') throw new DOMException('Storage denied', 'SecurityError')
      return original.call(this, name, version)
    }
  })
  await open(page); await fly(page)
  await expect.poll(async () => (await stats(page)).visible).toBe(true)
  await expect(page.locator('#streaming-status')).toContainText('Persistent cache write failed')
})
