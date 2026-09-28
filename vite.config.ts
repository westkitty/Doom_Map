import { defineConfig } from 'vitest/config'

export default defineConfig(({ command, isPreview }) => ({
  base: command === 'build' || isPreview ? '/Doom_Map/' : '/',
  build: {
    sourcemap: true,
    target: 'es2022'
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts']
  }
}))
