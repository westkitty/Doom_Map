import { describe, expect, it } from 'vitest'
import type { ProviderSnapshot } from '../src/core/provider'
import type { ScenarioEnvelope } from '../src/core/scenario'
import { createReferencePulseModule } from '../src/hazards/referencePulse'
import { runScenarioBatch } from '../src/scenario/batch'
import { validateProviderSnapshotCompatibility } from '../src/scenario/compatibility'
import { compareScenarioOutcomes } from '../src/scenario/compare'
import { RuntimeInputJournal } from '../src/scenario/inputJournal'
import { ScenarioRuntime } from '../src/scenario/runtime'

const scenario = (overrides: Partial<ScenarioEnvelope> = {}): ScenarioEnvelope => ({
  schemaVersion: 1,
  id: 'advanced-reference',
  seed: 42,
  hazardType: 'reference_pulse_fixture',
  startTime: '2026-10-04T00:00:00Z',
  modelVersions: { reference_pulse_fixture: '1.0.0' },
  providerSnapshots: [],
  parameters: { delayMs: 20, severity: 0.4 },
  ...overrides
})

describe('advanced scenario replay and compatibility', () => {
  it('blocks replay when the scenario model version does not match runtime code', () => {
    expect(() => new ScenarioRuntime(
      scenario({ modelVersions: { reference_pulse_fixture: '0.9.0' } }),
      createReferencePulseModule({ delayMs: 20, severity: 0.4 }),
      10
    )).toThrow(/model version mismatch/i)
  })

  it('detects missing, mismatched, and offline provider snapshots', () => {
    const expected: ProviderSnapshot[] = [{ providerId: 'terrain', datasetVersion: 'v1', health: 'healthy' }]
    expect(validateProviderSnapshotCompatibility(expected, [])).toEqual(['missing provider snapshot: terrain'])
    expect(validateProviderSnapshotCompatibility(expected, [{ providerId: 'terrain', datasetVersion: 'v2', health: 'offline' }])).toHaveLength(2)
  })

  it('journals scheduled runtime inputs with a stable checksum', () => {
    const journal = new RuntimeInputJournal<{ amount: number }>()
    journal.record('rain', 10, 'rainfall', { amount: 2 })
    const checksum = journal.checksum()
    const restored = new RuntimeInputJournal<{ amount: number }>()
    restored.restore(journal.snapshot())
    expect(restored.checksum()).toBe(checksum)
  })

  it('restores an actual checkpoint and replays to the same deterministic fingerprint', () => {
    const runtime = new ScenarioRuntime(scenario(), createReferencePulseModule({ delayMs: 20, severity: 0.4 }), 10)
    runtime.play()
    runtime.advance(10)
    const checkpoint = runtime.checkpoint()
    runtime.advance(20)
    const firstFinal = runtime.snapshot()

    expect(runtime.restoreCheckpoint(checkpoint.timeMs)).toBe(true)
    runtime.advance(20)
    expect(runtime.snapshot().fingerprint).toBe(firstFinal.fingerprint)
  })

  it('preserves queued events and their journal across checkpoint restoration', () => {
    const runtime = new ScenarioRuntime<Record<string, never>, Record<string, unknown>, { value: number }>(
      scenario(),
      {
        manifest: createReferencePulseModule({ delayMs: 20, severity: 0.4 }).manifest,
        modelVersion: '1.0.0',
        initialize: () => ({}),
        advance: (state) => ({ state, emissions: [] })
      },
      10
    )
    const start = Date.parse(scenario().startTime)
    runtime.scheduleEvent('future', start + 100, 'fixture', { value: 1 })
    const saved = runtime.checkpoint()
    runtime.play(); runtime.advance(20)
    runtime.restore(saved)
    expect(runtime.inputJournal()).toHaveLength(1)
    expect(runtime.snapshot().queuedEvents).toHaveLength(1)
  })

  it('runs deterministic scenario batches with stable fingerprints', () => {
    const scenarios = [scenario({ id: 'a' }), scenario({ id: 'b' })]
    const results = runScenarioBatch(
      scenarios,
      () => createReferencePulseModule({ delayMs: 20, severity: 0.4 }),
      { durationMs: 30, chunkMs: 10, fixedStepMs: 10 }
    )
    expect(results).toHaveLength(2)
    expect(results[0]?.emissionCount).toBe(1)
    expect(results[1]?.emissionCount).toBe(1)
  })

  it('compares scenario outcomes without pretending unequal runs are identical', () => {
    const comparison = compareScenarioOutcomes(
      { scenarioId: 'a', seed: 1, fingerprint: 'aaa', emissionCount: 1, consequenceCount: 2, timeMs: 100 },
      { scenarioId: 'b', seed: 2, fingerprint: 'bbb', emissionCount: 3, consequenceCount: 5, timeMs: 140 }
    )
    expect(comparison).toEqual({
      sameFingerprint: false,
      emissionDelta: 2,
      consequenceDelta: 3,
      simulatedTimeDeltaMs: 40
    })
  })
})
