import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/browser',
  timeout: 45_000,
  workers: 1,
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:4173/Doom_Map/',
    viewport: { width: 1200, height: 800 },
    launchOptions: {
      executablePath: process.env.CHROMIUM_PATH,
      args: [
        '--no-sandbox',
        '--use-gl=angle',
        '--use-angle=swiftshader',
        '--enable-unsafe-swiftshader',
        '--in-process-gpu',
        '--ignore-gpu-blocklist',
        ...(process.env.CHROMIUM_PATH ? ['--no-zygote'] : [])
      ]
    },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure'
  },
  webServer: process.env.PLAYWRIGHT_BASE_URL ? undefined : {
    command: 'npm run preview -- --host 0.0.0.0 --port 4173 --strictPort',
    url: 'http://127.0.0.1:4173/Doom_Map/',
    reuseExistingServer: !process.env.CI
  }
})
