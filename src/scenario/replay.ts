import type { ScenarioRuntimeSnapshot } from './runtime'

export interface ReplayComparison {
  match: boolean
  expectedFingerprint: string
  actualFingerprint: string
}

export function compareReplay(expected: ScenarioRuntimeSnapshot, actual: ScenarioRuntimeSnapshot): ReplayComparison {
  return {
    match: expected.fingerprint === actual.fingerprint,
    expectedFingerprint: expected.fingerprint,
    actualFingerprint: actual.fingerprint
  }
}
