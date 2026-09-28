import { test, expect, type Page } from '@playwright/test'

async function runtime(page: Page) {
  return page.locator('#globe').evaluate(el => JSON.parse((el as HTMLElement).dataset.runtime ?? '{}') as {
    calls: number; triangles: number; geometries: number; textures: number; frame: number;
    camera: number[]; target: number[]; aspect: number
  })
}

test('production WebGL render, mouse navigation, resize and bounded resources', async ({ page }, testInfo) => {
  const errors: string[] = []
  page.on('pageerror', e => errors.push(e.message))
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()) })
  await page.goto('./')
  await expect(page).toHaveTitle('Doom Map')
  await expect(page.locator('#globe')).toHaveAttribute('data-geography', 'ready')
  await expect.poll(async () => (await runtime(page)).triangles).toBeGreaterThan(1000)
  const canvas = page.locator('#globe')
  expect(await canvas.boundingBox()).toMatchObject({ width: 1200, height: 800 })
  await page.screenshot({ path: testInfo.outputPath('earth.png') })
  const initial = await runtime(page)
  await page.mouse.move(600, 400)
  await page.mouse.down()
  await page.mouse.move(760, 460, { steps: 12 })
  await page.mouse.up()
  await expect.poll(async () => (await runtime(page)).camera).not.toEqual(initial.camera)
  const rotated = await page.locator('#lon').textContent()
  expect(rotated).not.toBe('LON 0.000°')
  const beforePan = await runtime(page)
  await page.mouse.down({ button: 'right' })
  await page.mouse.move(680, 430, { steps: 12 })
  await page.mouse.up({ button: 'right' })
  await expect.poll(async () => (await runtime(page)).target).not.toEqual(beforePan.target)
  const altitude = await page.locator('#alt').textContent()
  await page.mouse.wheel(0, -400)
  await expect(page.locator('#alt')).not.toHaveText(altitude!)
  for (let i = 0; i < 12; i++) await page.mouse.wheel(0, i % 2 ? 150 : -150)
  expect((await runtime(page)).geometries).toBe(initial.geometries)
  expect((await runtime(page)).textures).toBe(initial.textures)
  await page.setViewportSize({ width: 800, height: 600 })
  await expect.poll(async () => (await runtime(page)).aspect).toBeCloseTo(800 / 600)
  await expect(canvas).toHaveJSProperty('width', 800)
  expect(errors).toEqual([])
})

test('context loss is reported and rendering resumes after restore', async ({ page }) => {
  await page.goto('./')
  await expect.poll(async () => (await runtime(page)).frame).toBeGreaterThan(2)
  await page.evaluate(() => {
    const canvas = document.querySelector<HTMLCanvasElement>('#globe')!
    const ext = canvas.getContext('webgl2')!.getExtension('WEBGL_lose_context')!
    ext.loseContext()
    setTimeout(() => ext.restoreContext(), 800)
  })
  await expect(page.locator('body')).toHaveAttribute('data-webgl', 'lost')
  await expect(page.locator('#status')).toContainText('context lost')
  await expect(page.locator('body')).not.toHaveAttribute('data-webgl', 'lost')
  await expect.poll(async () => (await runtime(page)).triangles).toBeGreaterThan(1000)
})

test('emulated two-finger pinch changes camera distance', async ({ browser }) => {
  const context = await browser.newContext({ hasTouch: true, viewport: { width: 1000, height: 800 } })
  const page = await context.newPage()
  await page.goto(process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:4173/Doom_Map/')
  await expect.poll(async () => (await runtime(page)).frame).toBeGreaterThan(2)
  const before = await page.locator('#alt').textContent()
  const session = await context.newCDPSession(page)
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 420, y: 450, id: 0 }, { x: 580, y: 450, id: 1 }] })
  for (let i = 1; i <= 8; i++) {
    await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 420 - i * 10, y: 450, id: 0 }, { x: 580 + i * 10, y: 450, id: 1 }] })
  }
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await expect(page.locator('#alt')).not.toHaveText(before!)
  await context.close()
})

test('unsupported WebGL reports an accessible failure instead of a blank canvas', async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, ...args: Parameters<typeof original>) {
      if (String(args[0]).startsWith('webgl')) return null
      return original.apply(this, args)
    } as typeof original
  })
  await page.goto('./')
  await expect(page.getByRole('alert')).toContainText('Unable to start WebGL2')
  await page.getByText('Science / sources').click()
  await expect(page.locator('#science-content')).toContainText('Natural Earth low-LOD land outlines')
  await expect(page.locator('#science-content')).toContainText('earth-presentation@1.0.0')
})

test('keyboard, selection, local coordinate fly-to, quality and persisted camera', async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('./')
  await expect.poll(async () => (await runtime(page)).frame).toBeGreaterThan(2)
  const globe = page.locator('#globe')
  await globe.focus()
  const initial = await runtime(page)
  await page.keyboard.press('ArrowLeft')
  await expect.poll(async () => (await runtime(page)).camera).not.toEqual(initial.camera)
  await page.keyboard.press('Shift+ArrowRight')
  await expect.poll(async () => (await runtime(page)).target).not.toEqual(initial.target)
  await page.keyboard.press('Home')
  await page.keyboard.press('Enter')
  await page.getByText('Navigate Earth', { exact: true }).click()
  await expect(page.locator('#selection')).toContainText('WGS84 ellipsoid')
  await page.getByLabel('Latitude', { exact: true }).fill('41.8298')
  await page.getByLabel('Longitude', { exact: true }).fill('-86.2542')
  await page.getByLabel('Altitude (m)').fill('100')
  await page.getByRole('button', { name: 'Fly to coordinates' }).click()
  await expect(page.locator('#alt')).toHaveText('ALT 100 m')
  await expect(page.locator('#lat')).toHaveText('LAT 41.830°')
  await expect(page.locator('#lon')).toHaveText('LON -86.254°')
  const local = await runtime(page)
  expect(local.camera.every(Number.isFinite)).toBe(true)
  const diagnostic = await globe.getAttribute('data-runtime')
  expect(JSON.parse(diagnostic!).renderCamera).toEqual([0, 0, 0])
  await page.getByRole('button', { name: 'Save camera' }).click()
  await expect(page.locator('#navigation-status')).toContainText('saved')
  await page.screenshot({ path: testInfo.outputPath('local-ellipsoid.png') })
  await globe.focus()
  await page.keyboard.press('+')
  await expect(page.locator('#alt')).toHaveText('ALT 83 m')
  await page.keyboard.press('Home')
  await page.getByRole('button', { name: 'Restore camera' }).click()
  await expect(page.locator('#alt')).toHaveText('ALT 100 m')
  await page.getByLabel('Quality', { exact: true }).selectOption('Safe')
  await expect.poll(async () => (await runtime(page)).calls).toBeLessThan(initial.calls)
  await page.reload()
  await page.getByText('Navigate Earth', { exact: true }).click()
  await page.getByRole('button', { name: 'Restore camera' }).click()
  await expect(page.locator('#alt')).toHaveText('ALT 100 m')
})

test('double-click flies to ellipsoid and user input interrupts motion', async ({ page }) => {
  await page.goto('./')
  await expect.poll(async () => (await runtime(page)).frame).toBeGreaterThan(2)
  await page.mouse.dblclick(600, 400)
  await expect(page.locator('#alt')).toHaveText('ALT 100.0 km')
  await page.locator('#globe').focus()
  await page.keyboard.press('Home')
  await page.mouse.dblclick(600, 400)
  await page.keyboard.press('Home')
  await expect(page.locator('#alt')).toContainText('Mm')
})

test('repeated page lifecycle disposes GPU geometry and restores the same bounded scene', async ({ page }) => {
  await page.goto('./')
  await expect.poll(async () => (await runtime(page)).frame).toBeGreaterThan(2)
  await expect(page.locator('#globe')).toHaveAttribute('data-geography', 'ready')
  const initial = await runtime(page)
  for (let i = 0; i < 3; i++) {
    await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true })))
    await expect.poll(async () => JSON.parse((await page.locator('#globe').getAttribute('data-lifecycle'))!)).toMatchObject({ state: 'disposed', geometries: 0 })
    await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })))
    await expect.poll(async () => (await runtime(page)).frame).toBeGreaterThan(2)
    await expect(page.locator('#globe')).toHaveAttribute('data-geography', 'ready')
    expect((await runtime(page)).geometries).toBe(initial.geometries)
    expect((await runtime(page)).textures).toBe(initial.textures)
  }
})

test('geography failure is explicit and globe navigation remains usable', async ({ page }) => {
  await page.route('**/data/ne_110m_land.geojson', route => route.fulfill({ status: 503, body: 'Unavailable' }))
  await page.goto('./')
  await expect(page.locator('#geography-status')).toContainText('Geography unavailable')
  await expect(page.locator('#globe')).toHaveAttribute('data-geography', 'unavailable')
  await expect.poll(async () => (await runtime(page)).triangles).toBeGreaterThan(1000)
})

async function streaming(page: Page) {
  return page.locator('#globe').evaluate(el => JSON.parse((el as HTMLElement).dataset.runtime!).streaming as {
    active: number; queued: number; cached: number; decodedBytes: number; gpuTiles: number; failed: number; visible: boolean
  })
}

test('regional coastlines load, unload and stay inside request/cache/GPU bounds', async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('./')
  await expect(page.locator('#globe')).toHaveAttribute('data-geography', 'ready')
  const baseline = await runtime(page)
  await page.getByText('Navigate Earth', { exact: true }).click()
  await page.getByLabel('Altitude (m)').fill('500000')
  for (const [latitude, longitude] of [['40', '10'], ['35', '140'], ['-30', '-70'], ['40', '10']]) {
    await page.getByLabel('Latitude', { exact: true }).fill(latitude!)
    await page.getByLabel('Longitude', { exact: true }).fill(longitude!)
    await page.getByRole('button', { name: 'Fly to coordinates' }).click()
    await expect.poll(async () => (await streaming(page)).visible).toBe(true)
    const stats = await streaming(page)
    expect(stats.gpuTiles).toBeLessThanOrEqual(9)
    expect(stats.cached).toBeLessThanOrEqual(12)
    expect(stats.decodedBytes).toBeLessThanOrEqual(2_000_000)
    expect((await runtime(page)).geometries).toBeLessThanOrEqual(baseline.geometries + 10)
  }
  await page.screenshot({ path: testInfo.outputPath('regional-coastlines.png') })
  await page.locator('#globe').focus()
  await page.keyboard.press('Home')
  await expect.poll(async () => (await streaming(page)).gpuTiles).toBe(0)
})

test('failed regional tiles retain a labeled global fallback', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.route('**/data/ne-110m/*.json', route => route.fulfill({ status: 503, body: 'Unavailable' }))
  await page.goto('./')
  await page.getByText('Navigate Earth', { exact: true }).click()
  await page.getByLabel('Altitude (m)').fill('500000')
  await page.getByRole('button', { name: 'Fly to coordinates' }).click()
  await expect(page.locator('#streaming-status')).toContainText('Regional provider degraded')
  await expect(page.locator('#streaming-status')).toContainText('fallback retained')
  expect((await streaming(page)).visible).toBe(false)
})
