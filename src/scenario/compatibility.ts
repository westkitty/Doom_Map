import type { ProviderSnapshot } from '../core/provider'
import type { ScenarioEnvelope } from '../core/scenario'
import type { HazardModule } from '../hazards/module'

export function validateModelCompatibility(scenario: ScenarioEnvelope, module: HazardModule): string[] {
  const expected = scenario.modelVersions[module.manifest.id]
  if (!expected) return [`scenario is missing model version for ${module.manifest.id}`]
  return expected === module.modelVersion
    ? []
    : [`model version mismatch for ${module.manifest.id}: scenario=${expected}, runtime=${module.modelVersion}`]
}

export function validateProviderSnapshotCompatibility(
  expected: readonly ProviderSnapshot[],
  current: readonly ProviderSnapshot[]
): string[] {
  const issues: string[] = []
  const currentById = new Map(current.map((snapshot) => [snapshot.providerId, snapshot]))
  for (const snapshot of expected) {
    const actual = currentById.get(snapshot.providerId)
    if (!actual) {
      issues.push(`missing provider snapshot: ${snapshot.providerId}`)
      continue
    }
    if (snapshot.datasetVersion && actual.datasetVersion !== snapshot.datasetVersion) {
      issues.push(`provider dataset version mismatch for ${snapshot.providerId}`)
    }
    if (actual.health === 'offline') issues.push(`provider is offline: ${snapshot.providerId}`)
  }
  return issues
}
