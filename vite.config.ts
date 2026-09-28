import { defineConfig } from 'vitest/config'

export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/Doom_Map/' : '/',
  build: {
    sourcemap: true,
    target: 'es2022'
  },
  test: {
    environment: 'node'
  }
}))
