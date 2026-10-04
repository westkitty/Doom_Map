import { DEFAULT_HAZARD_CATALOG } from '../hazards/catalog'
import { validateHazardManifest } from '../hazards/manifest'
import type { ProviderDescriptor } from './provider'
import { validateProviderDescriptor } from './provider'

export interface FoundationAuditReport {
  ok: boolean
  hazardCount: number
  flagshipCount: number
  providerCount: number
  issues: string[]
}

export function auditFoundation(providers: readonly ProviderDescriptor[] = []): FoundationAuditReport {
  const issues: string[] = []
  const ids = new Set<string>()
  for (const hazard of DEFAULT_HAZARD_CATALOG) {
    if (ids.has(hazard.id)) issues.push(`duplicate hazard id: ${hazard.id}`)
    ids.add(hazard.id)
    for (const issue of validateHazardManifest(hazard)) issues.push(`${hazard.id}: ${issue}`)
  }

  const providerIds = new Set<string>()
  for (const provider of providers) {
    if (providerIds.has(provider.id)) issues.push(`duplicate provider id: ${provider.id}`)
    providerIds.add(provider.id)
    for (const issue of validateProviderDescriptor(provider)) issues.push(`${provider.id}: ${issue}`)
  }

  if (DEFAULT_HAZARD_CATALOG.length < 40) issues.push('hazard catalog contains fewer than 40 entries')

  return {
    ok: issues.length === 0,
    hazardCount: DEFAULT_HAZARD_CATALOG.length,
    flagshipCount: DEFAULT_HAZARD_CATALOG.filter((hazard) => hazard.flagship === true).length,
    providerCount: providers.length,
    issues
  }
}
