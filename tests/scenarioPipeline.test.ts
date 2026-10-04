import { describe, expect, it } from 'vitest'
import type { ScenarioEnvelope } from '../src/core/scenario'
import { createReferencePulseModule, REFERENCE_PULSE_MANIFEST } from '../src/hazards/referencePulse'
import { normalizeHazardParameters } from '../src/hazards/parameters'
import { HazardRuntimeRegistry } from '../src/hazards/runtimeRegistry'
import { exportScenarioBundle, importScenarioBundle } from '../src/scenario/bundle'
import { ScenarioMigrationRegistry } from '../src/scenario/migrations'
import { compareReplay } from '../src/scenario/replay'
import { ScenarioRuntime } from '../src/scenario/runtime'

const scenario = (): ScenarioEnvelope => ({
  schemaVersion: 1,
  id: 'reference-scenario',
  seed: 42,
  hazardType: 'reference_pulse_fixture',
  startTime: '2026-10-04T00:00:00Z',
  modelVersions: { reference_pulse_fixture: '1.0.0' },
  providerSnapshots: [],
  parameters: { delayMs: 20, severity: 0.4 }
})

describe('end-to-end scenario pipeline', () => {
  it('normalizes bounded parameters and rejects unknown input', () => {
    expect(normalizeHazardParameters(REFERENCE_PULSE_MANIFEST, { delayMs: 5, severity: 0.5 }).issues).toEqual([])
    expect(normalizeHazardParameters(REFERENCE_PULSE_MANIFEST, { delayMs: -1, severity: 0.5, surprise: true }).issues).toHaveLength(2)
  })

  it('registers executable hazard modules separately from catalog metadata', () => {
    const registry = new HazardRuntimeRegistry()
    registry.register(createReferencePulseModule({ delayMs: 20, severity: 0.4 }))
    expect(registry.has('reference_pulse_fixture')).toBe(true)
  })

  it('runs deterministically through clock, hazard, emission, and consequence graph', () => {
    const makeRuntime = () => new ScenarioRuntime(scenario(), createReferencePulseModule({ delayMs: 20, severity: 0.4 }), 10)
    const a = makeRuntime(); const b = makeRuntime()
    a.play(); b.play()
    a.advance(30); b.advance(10); b.advance(20)
    const aSnapshot = a.snapshot(); const bSnapshot = b.snapshot()
    expect(compareReplay(aSnapshot, bSnapshot).match).toBe(true)
    expect(a.consequenceOrder()).toHaveLength(1)
    expect(aSnapshot.emissions).toHaveLength(1)
  })

  it('stores bounded checkpoints for deterministic seek reconstruction', () => {
    const runtime = new ScenarioRuntime(scenario(), createReferencePulseModule({ delayMs: 20, severity: 0.4 }), 10)
    runtime.play(); runtime.advance(10); const saved = runtime.checkpoint(); runtime.advance(20)
    expect(runtime.seekFromCheckpoint(saved.timeMs)?.fingerprint).toBe(saved.fingerprint)
  })

  it('exports and imports tamper-evident scenario bundles', () => {
    const bundle = exportScenarioBundle(scenario())
    expect(importScenarioBundle(bundle)).toEqual(bundle)
    expect(() => importScenarioBundle({ ...bundle, checksum: 'tampered' })).toThrow(/checksum/i)
  })

  it('provides an explicit forward-only migration chain', () => {
    const migrations = new ScenarioMigrationRegistry()
    migrations.register(1, (input) => ({ ...input, migrated: true }))
    expect(migrations.migrate({ schemaVersion: 1, id: 'x' }, 2)).toEqual({ schemaVersion: 2, id: 'x', migrated: true })
  })
})
