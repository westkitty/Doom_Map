import type { ScenarioEnvelope } from '../core/scenario'
import type { HazardModule } from '../hazards/module'
import { ScenarioRuntime } from './runtime'

export interface ScenarioBatchResult {
  scenarioId: string
  seed: number
  fingerprint: string
  emissionCount: number
  consequenceCount: number
  timeMs: number
}

export interface ScenarioBatchOptions {
  durationMs: number
  chunkMs?: number
  fixedStepMs?: number
}

export function runScenarioBatch<S, P extends Record<string, unknown>, E>(
  scenarios: readonly ScenarioEnvelope[],
  moduleForScenario: (scenario: ScenarioEnvelope) => HazardModule<S, P, E>,
  options: ScenarioBatchOptions
): ScenarioBatchResult[] {
  if (!Number.isFinite(options.durationMs) || options.durationMs < 0) throw new RangeError('Batch duration must be non-negative.')
  const chunkMs = options.chunkMs ?? 100
  if (!Number.isFinite(chunkMs) || chunkMs <= 0) throw new RangeError('Batch chunk must be positive.')

  return scenarios.map((scenario) => {
    const runtime = new ScenarioRuntime(scenario, moduleForScenario(scenario), options.fixedStepMs)
    runtime.play()
    let elapsed = 0
    while (elapsed < options.durationMs) {
      const delta = Math.min(chunkMs, options.durationMs - elapsed)
      runtime.advance(delta)
      elapsed += delta
    }
    const snapshot = runtime.snapshot()
    return {
      scenarioId: scenario.id,
      seed: scenario.seed,
      fingerprint: snapshot.fingerprint,
      emissionCount: snapshot.emissions.length,
      consequenceCount: runtime.consequenceOrder().length,
      timeMs: snapshot.timeMs
    }
  })
}
