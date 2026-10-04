import { describe, expect, it } from 'vitest'
import { classifyRuntimeCapabilities } from '../src/core/capabilities'
import { RuntimeTrace } from '../src/core/runtimeTrace'
import { FloatingOrigin } from '../src/globe/floatingOrigin'

describe('runtime foundation', () => {
  it('classifies runtime capability without pretending every device is equal', () => {
    expect(classifyRuntimeCapabilities({ webgl2: false, hardwareConcurrency: 8, maxTextureSize: 2048, reducedMotion: false }).class).toBe('fallback')
    expect(classifyRuntimeCapabilities({ webgl2: true, hardwareConcurrency: 8, deviceMemoryGb: 8, maxTextureSize: 16384, reducedMotion: false }).class).toBe('full')
  })

  it('keeps a bounded chronological runtime trace', () => {
    const trace = new RuntimeTrace(2)
    trace.record(1, 'tile', 'queued'); trace.record(2, 'tile', 'loaded'); trace.record(3, 'sim', 'step')
    expect(trace.snapshot().map((event) => event.message)).toEqual(['loaded', 'step'])
    expect(trace.snapshot('tile').map((event) => event.message)).toEqual(['loaded'])
  })

  it('rebases local render coordinates without changing authoritative ECEF', () => {
    const origin = new FloatingOrigin({ x: 1000, y: 2000, z: 3000 }, 100)
    const point = { x: 1010, y: 2020, z: 3030 }
    expect(origin.toEcef(origin.toLocal(point))).toEqual(point)
    const result = origin.maybeRebase({ x: 1200, y: 2000, z: 3000 })
    expect(result.rebased).toBe(true)
    expect(origin.toLocal({ x: 1205, y: 2000, z: 3000 })).toEqual({ x: 5, y: 0, z: 0 })
  })
})
