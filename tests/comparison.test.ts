import { describe, expect, it, beforeAll } from 'vitest'
import { initHazardRegistry } from '../src/hazards/catalog'
import { compareScenarios, forkScenario } from '../src/core/scenario/comparison'
import type { ScenarioDefinition } from '../src/core/scenario/types'

beforeAll(() => {
  initHazardRegistry()
})

const baseScenario: ScenarioDefinition = {
  schemaVersion: 1,
  id: 'base-nuclear-100',
  name: '100 kt Airburst Baseline',
  description: 'Baseline scenario',
  seed: 42,
  createdAt: '2026-09-28T00:00:00Z',
  startTimeMs: 1774872000000,
  durationMs: 300000,
  hazardType: 'nuclear_airburst',
  origin: { latitudeDeg: 40.7128, longitudeDeg: -74.0060, heightM: 0 },
  parameters: { yieldKt: 100, burstAltitudeM: 600 },
  chapters: [],
  modelSnapshots: []
}

describe('Scenario Forking & Comparison', () => {
  it('forks scenario with overridden parameters and new identity', () => {
    const forked = forkScenario(baseScenario, '500 kt High-Yield Variant', { yieldKt: 500 })
    expect(forked.id).not.toBe(baseScenario.id)
    expect(forked.name).toBe('500 kt High-Yield Variant')
    expect(forked.parameters.yieldKt).toBe(500)
    expect(forked.origin).toEqual(baseScenario.origin)
  })

  it('compares two scenarios and calculates consequence deltas', () => {
    const forked = forkScenario(baseScenario, '500 kt High-Yield Variant', { yieldKt: 500 })
    const comparison = compareScenarios(baseScenario, forked, 5000)

    expect(comparison.reportB.exposedPopulation).toBeGreaterThan(comparison.reportA.exposedPopulation)
    expect(comparison.deltas.exposedPopulationDelta).toBeGreaterThan(0)
    expect(comparison.deltas.economicLossDeltaM).toBeGreaterThan(0)
    expect(comparison.deltas.summary).toContain('Scenario B exposes')
  })
})
