import { defineConfig } from 'vite'

export default defineConfig({
  base: process.env.GITHUB_ACTIONS ? '/Doom_Map/' : '/',
  build: {
    sourcemap: true,
    target: 'es2022'
  },
  test: {
    environment: 'node'
  }
})
