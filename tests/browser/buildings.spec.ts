import { test, expect, type Page } from '@playwright/test'

async function open(page: Page) {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('./')
  await expect(page.locator('#globe')).toHaveAttribute('data-geography', 'ready')
}

async function buildingsRuntime(page: Page) {
  return page.locator('#globe').evaluate(el => JSON.parse((el as HTMLElement).dataset.runtime!).buildings as {
    active: number; queued: number; cached: number; decodedBytes: number; gpuTiles: number; failed: number; visible: boolean; buildingCount: number
  })
}

test('local buildings stream at low altitude, render 3D extrusions, inspect truth contract, and unload on zoom-out', async ({ page }, testInfo) => {
  await open(page)
  await page.getByText('Navigate Earth', { exact: true }).click()

  // 1. Initial orbital state: no buildings active
  const initial = await buildingsRuntime(page)
  expect(initial.visible).toBe(false)
  expect(initial.buildingCount).toBe(0)

  // 2. Fly to Niles local focus coordinates at 400m altitude
  await page.getByLabel('Latitude', { exact: true }).fill('41.8298')
  await page.getByLabel('Longitude', { exact: true }).fill('-86.2542')
  await page.getByLabel('Altitude (m)').fill('400')
  await page.getByRole('button', { name: 'Fly to coordinates' }).click()

  // 3. Buildings load and render
  await expect.poll(async () => (await buildingsRuntime(page)).visible).toBe(true)
  await expect.poll(async () => (await buildingsRuntime(page)).buildingCount).toBeGreaterThan(10)
  const bldgStats = await buildingsRuntime(page)
  expect(bldgStats.gpuTiles).toBeGreaterThan(0)
  expect(bldgStats.decodedBytes).toBeLessThanOrEqual(4_000_000)

  // Take screenshot of rendered 3D buildings
  await page.screenshot({ path: testInfo.outputPath('local-buildings-3d.png') })

  // 4. Click center of canvas to inspect/pick building
  await page.mouse.click(600, 400)
  await expect(page.locator('#building-info')).toContainText('Truth contract')
  await expect(page.locator('#building-info')).toContainText('Height:')

  // 5. Fly back out to orbit (5000 km)
  await page.getByLabel('Altitude (m)').fill('5000000')
  await page.getByRole('button', { name: 'Fly to coordinates' }).click()

  // 6. Buildings unload and become invisible
  await expect.poll(async () => (await buildingsRuntime(page)).visible).toBe(false)
  await expect.poll(async () => (await buildingsRuntime(page)).gpuTiles).toBe(0)
})

test('science panel attributes both Natural Earth and Building Footprints providers with fidelity and limitations', async ({ page }) => {
  await open(page)
  await page.getByText('Science / sources').click()
  const content = page.locator('#science-content')
  await expect(content).toContainText('Natural Earth 1:110m land outlines')
  await expect(content).toContainText('Local Building Footprints and Extrusions')
  await expect(content).toContainText('local-building-footprints@2026-09-28')
  await expect(content).toContainText('ODbL 1.0 and CDLA-Permissive-2.0')
  await expect(content).toContainText('simplified 3D LOD1 geometries')
})
