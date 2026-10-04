import { validateScenarioEnvelope, type ScenarioEnvelope } from '../core/scenario'
import { checksumCanonical } from '../sim/canonical'

export interface ScenarioBundleV1 {
  bundleVersion: 1
  scenario: ScenarioEnvelope
  checksum: string
}

export function exportScenarioBundle(scenario: ScenarioEnvelope): ScenarioBundleV1 {
  const issues = validateScenarioEnvelope(scenario)
  if (issues.length > 0) throw new Error(`Cannot export invalid scenario: ${issues.join('; ')}`)
  return {
    bundleVersion: 1,
    scenario,
    checksum: checksumCanonical(scenario)
  }
}

export function importScenarioBundle(value: unknown): ScenarioBundleV1 {
  if (!value || typeof value !== 'object') throw new Error('Scenario bundle must be an object.')
  const candidate = value as Partial<ScenarioBundleV1>
  if (candidate.bundleVersion !== 1 || !candidate.scenario || typeof candidate.checksum !== 'string') {
    throw new Error('Unsupported or malformed scenario bundle.')
  }
  const issues = validateScenarioEnvelope(candidate.scenario)
  if (issues.length > 0) throw new Error(`Invalid scenario bundle: ${issues.join('; ')}`)
  const expected = checksumCanonical(candidate.scenario)
  if (candidate.checksum !== expected) throw new Error('Scenario bundle checksum mismatch.')
  return { bundleVersion: 1, scenario: candidate.scenario, checksum: candidate.checksum }
}
