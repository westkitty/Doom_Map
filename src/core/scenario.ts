import type { ProviderSnapshot } from './provider'

export interface ScenarioEnvelope {
  schemaVersion: 1
  id: string
  seed: number
  hazardType: string
  startTime: string
  modelVersions: Record<string, string>
  providerSnapshots: ProviderSnapshot[]
  parameters: Record<string, unknown>
}

export function validateScenarioEnvelope(scenario: ScenarioEnvelope): string[] {
  const issues: string[] = []
  if (scenario.schemaVersion !== 1) issues.push('unsupported scenario schema version')
  if (!scenario.id.trim()) issues.push('scenario id is required')
  if (!Number.isSafeInteger(scenario.seed) || scenario.seed < 0) issues.push('scenario seed must be a non-negative safe integer')
  if (!scenario.hazardType.trim()) issues.push('hazard type is required')
  if (!scenario.startTime.trim() || Number.isNaN(Date.parse(scenario.startTime))) issues.push('start time must be an ISO-compatible timestamp')
  for (const [modelId, version] of Object.entries(scenario.modelVersions)) {
    if (!modelId.trim() || !version.trim()) issues.push('model version entries require non-empty ids and versions')
  }
  const providerIds = new Set<string>()
  for (const snapshot of scenario.providerSnapshots) {
    if (!snapshot.providerId.trim()) issues.push('provider snapshot id is required')
    if (providerIds.has(snapshot.providerId)) issues.push(`duplicate provider snapshot: ${snapshot.providerId}`)
    providerIds.add(snapshot.providerId)
  }
  return issues
}
