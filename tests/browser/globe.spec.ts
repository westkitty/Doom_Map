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
  await expect(page.locator('#science-content')).toContainText('No geographic data provider is active')
  await expect(page.locator('#science-content')).toContainText('earth-presentation@1.0.0')
})
