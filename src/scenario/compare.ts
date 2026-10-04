import type { ScenarioBatchResult } from './batch'

export interface ScenarioOutcomeComparison {
  sameFingerprint: boolean
  emissionDelta: number
  consequenceDelta: number
  simulatedTimeDeltaMs: number
}

export function compareScenarioOutcomes(a: ScenarioBatchResult, b: ScenarioBatchResult): ScenarioOutcomeComparison {
  return {
    sameFingerprint: a.fingerprint === b.fingerprint,
    emissionDelta: b.emissionCount - a.emissionCount,
    consequenceDelta: b.consequenceCount - a.consequenceCount,
    simulatedTimeDeltaMs: b.timeMs - a.timeMs
  }
}
