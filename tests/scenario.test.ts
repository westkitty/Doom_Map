import { describe, expect, it } from 'vitest'
import { parseScenario, type ScenarioDefinition } from '../src/core/scenario/types'
import { PRNG } from '../src/core/scenario/prng'
import { ScenarioClock } from '../src/core/time/ScenarioClock'
import { encodeScenarioToHash, decodeScenarioFromHash } from '../src/core/scenario/urlState'

const sampleScenario: ScenarioDefinition = {
  schemaVersion: 1,
  id: 'test-scenario-1',
  name: 'Test Asteroid Impact',
  description: 'Near-surface kinetic impact event',
  seed: 42,
  createdAt: '2026-09-28T12:00:00Z',
  startTimeMs: 1774872000000,
  durationMs: 86400000,
  hazardType: 'asteroid-impact',
  origin: { latitudeDeg: 35.6895, longitudeDeg: 139.6917, heightM: 0 },
  parameters: { diameterM: 500, velocityKms: 20, densityKgm3: 3000, impactAngleDeg: 45 },
  chapters: [
    { timeOffsetMs: 0, label: 'Atmospheric Entry', description: 'Entry and ionization trail' },
    { timeOffsetMs: 5000, label: 'Impact Flash', description: 'Ground contact and prompt cratering' },
    { timeOffsetMs: 60000, label: 'Blast Propagation', description: 'Shockwave expands across region' }
  ],
  modelSnapshots: [{ id: 'flagship-asteroid-collins', version: '1.0.0', fidelity: 'A' }]
}

describe('Scenario Schema & Validation', () => {
  it('validates a schema-compliant scenario', () => {
    const s = parseScenario(sampleScenario)
    expect(s.id).toBe('test-scenario-1')
    expect(s.chapters).toHaveLength(3)
  })

  it('rejects invalid schema version or missing fields', () => {
    expect(() => parseScenario({ ...sampleScenario, schemaVersion: 2 })).toThrow()
    expect(() => parseScenario({ ...sampleScenario, id: 'bad id with spaces!' })).toThrow()
    expect(() => parseScenario({ ...sampleScenario, durationMs: -100 })).toThrow()
  })
})

describe('Deterministic PRNG', () => {
  it('produces identical sequences given the same seed', () => {
    const prng1 = new PRNG(12345)
    const prng2 = new PRNG(12345)
    const seq1 = Array.from({ length: 10 }, () => prng1.next())
    const seq2 = Array.from({ length: 10 }, () => prng2.next())
    expect(seq1).toEqual(seq2)
    expect(seq1.every(n => n >= 0 && n < 1)).toBe(true)
  })

  it('generates reproducible integer and gaussian distributions', () => {
    const prng = new PRNG(999)
    const ints = Array.from({ length: 50 }, () => prng.nextInt(10, 20))
    expect(ints.every(n => n >= 10 && n <= 20)).toBe(true)
    const g = prng.nextGaussian(0, 1)
    expect(Number.isFinite(g)).toBe(true)
  })
})

describe('Scenario Clock & Playback', () => {
  it('controls play, pause, playback rate and seek', () => {
    const clock = new ScenarioClock(1000, 10000)
    expect(clock.state.isPlaying).toBe(false)
    expect(clock.state.timeMs).toBe(1000)

    clock.play()
    expect(clock.state.isPlaying).toBe(true)

    clock.advanceRealTime(1.0) // 1 second real time @ 1x = 1000ms sim time
    expect(clock.state.timeMs).toBe(2000)
    expect(clock.state.progress).toBeCloseTo(0.1)

    clock.setPlaybackRate(10)
    clock.advanceRealTime(0.5) // 0.5s real time @ 10x = 5000ms sim time
    expect(clock.state.timeMs).toBe(7000)

    clock.seekNormalized(0.5)
    expect(clock.state.timeMs).toBe(6000)

    clock.seek(11000) // past end
    expect(clock.state.timeMs).toBe(11000)
  })

  it('notifies subscribers upon time advance and seek', () => {
    const clock = new ScenarioClock(0, 5000)
    const updates: number[] = []
    const unsub = clock.subscribe(time => updates.push(time))

    clock.seek(2000)
    expect(updates).toContain(2000)
    unsub()
    clock.seek(3000)
    expect(updates).not.toContain(3000)
  })
})

describe('URL State Serialization', () => {
  it('encodes and decodes scenario parameters via hash', () => {
    const hash = encodeScenarioToHash(sampleScenario)
    expect(hash.startsWith('#')).toBe(true)
    const decoded = decodeScenarioFromHash(hash)
    expect(decoded).not.toBeNull()
    expect(decoded!.id).toBe(sampleScenario.id)
    expect(decoded!.hazardType).toBe(sampleScenario.hazardType)
    expect(decoded!.origin?.latitudeDeg).toBeCloseTo(35.6895)
  })
})
