import { defineConfig } from 'vitest/config'

export default defineConfig(({ command, isPreview }) => ({
  base: command === 'build' || isPreview ? '/Doom_Map/' : '/',
  preview: { host: '0.0.0.0', allowedHosts: ['.e2b.app'] },
  build: {
    sourcemap: true,
    target: 'es2022'
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts']
  }
}))
