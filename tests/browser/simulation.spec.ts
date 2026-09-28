import { test, expect, type Page } from '@playwright/test'

async function open(page: Page) {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('./')
  await expect(page.locator('#globe')).toHaveAttribute('data-geography', 'ready')
}

test('deterministic scenario clock plays, pauses, scrubs, and advances simulation time', async ({ page }) => {
  await open(page)

  const playBtn = page.locator('#play-pause')
  const timeDisplay = page.locator('#time-display')
  const scrubber = page.locator('#timeline-scrubber')

  // Initial state is paused at T+0
  await expect(playBtn).toHaveText('▶ Play')
  await expect(timeDisplay).toContainText('T+0.0s')

  // Start playback
  await playBtn.click()
  await expect(playBtn).toHaveText('❚❚ Pause')
  await expect.poll(async () => await timeDisplay.textContent()).not.toBe('T+0.0s (0.0m)')

  // Pause playback
  await playBtn.click()
  await expect(playBtn).toHaveText('▶ Play')

  // Change playback speed
  await page.locator('#speed-select').selectOption('100')

  // Scrub timeline to 50%
  await scrubber.fill('500')
  await scrubber.dispatchEvent('input')
  await expect(timeDisplay).toContainText('T+150.0s')
})

test('hazard selection evaluates physics footprint, updates consequences, and renders VFX', async ({ page }, testInfo) => {
  await open(page)
  await page.getByText('Disaster & Consequences').click()

  // 1. Select Asteroid Impact
  await page.locator('#hazard-select').selectOption('asteroid_land_impact')
  await expect(page.locator('#consequence-content')).toContainText('MT TNT')
  await expect(page.locator('#consequence-content')).toContainText('Exposed Population')

  // Take screenshot of Asteroid impact simulation and consequence HUD
  await page.screenshot({ path: testInfo.outputPath('simulation-asteroid-impact.png') })

  // 2. Select Earthquake and tweak magnitude parameter
  await page.locator('#hazard-select').selectOption('earthquake_point_source')
  await expect(page.locator('#consequence-content')).toContainText('Mw')
  const magInput = page.locator('#hazard-params input').first()
  await magInput.fill('8.5')
  await magInput.dispatchEvent('input')
  await expect(page.locator('#consequence-content')).toContainText('8.5 Mw')

  // 3. Select Tropical Cyclone
  await page.locator('#hazard-select').selectOption('tropical_cyclone')
  await expect(page.locator('#consequence-content')).toContainText('kt')
})

test('scenario vault saves, shares URL hash, and restores scenario state', async ({ page }) => {
  await open(page)

  // 1. Configure a custom scenario (Tsunami)
  await page.getByText('Disaster & Consequences').click()
  await page.locator('#hazard-select').selectOption('tsunami_subduction')

  await page.getByText('Scenario Vault & Sharing').click()
  await page.locator('#save-scenario').click()
  await expect(page.locator('#vault-status')).toContainText('saved to local vault')

  // 2. Share scenario via hash URL
  await page.locator('#share-scenario').click()
  await expect(page.locator('#vault-status')).toContainText('encoded into URL')

  const url = page.url()
  expect(url).toContain('#')

  // 3. Open fresh page with the scenario hash URL
  const newPage = await page.context().newPage()
  await newPage.goto(url)
  await expect(newPage.locator('#globe')).toHaveAttribute('data-geography', 'ready')
  await newPage.getByText('Disaster & Consequences').click()
  await expect(newPage.locator('#hazard-select')).toHaveValue('tsunami_subduction')
  await expect(newPage.locator('#consequence-content')).toContainText('runup')
  await newPage.close()
})
