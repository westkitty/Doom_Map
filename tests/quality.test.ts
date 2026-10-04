import { describe, expect, it } from 'vitest'
import { chooseInitialQuality } from '../src/core/quality'

describe('quality policy', () => {
  it('uses safe mode for reduced-motion environments', () => { expect(chooseInitialQuality({ devicePixelRatio: 2, hardwareConcurrency: 10, reducedMotion: true })).toBe('safe') })
  it('uses low mode on constrained four-core devices', () => { expect(chooseInitialQuality({ devicePixelRatio: 2, hardwareConcurrency: 4, reducedMotion: false })).toBe('low') })
  it('uses high mode only when the hardware and pixel ratio are reasonable', () => { expect(chooseInitialQuality({ devicePixelRatio: 2, hardwareConcurrency: 8, reducedMotion: false })).toBe('high') })
})
