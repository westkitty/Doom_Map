import type { FidelityClass } from './provenance'
export type ProviderKind = 'terrain' | 'imagery' | 'vector' | 'building' | 'population' | 'infrastructure' | 'event'
export type ProviderHealth = 'unknown' | 'healthy' | 'degraded' | 'offline'
export type CachePolicy = 'none' | 'session' | 'persistent'
export interface ProviderDescriptor { id: string; label: string; kind: ProviderKind; attribution: string; fidelity: FidelityClass; coverage: string; cachePolicy: CachePolicy; requiresSecret: boolean; limitations: string[] }
export interface ProviderSnapshot { providerId: string; datasetVersion?: string; timestamp?: string; health: ProviderHealth }
const KINDS = new Set<ProviderKind>(['terrain','imagery','vector','building','population','infrastructure','event'])
const FIDELITY = new Set<FidelityClass>(['A','B','C','D'])
const CACHE_POLICIES = new Set<CachePolicy>(['none','session','persistent'])
export function validateProviderDescriptor(provider: ProviderDescriptor): string[] {
  const issues: string[] = []
  if (!provider.id.trim()) issues.push('provider id is required')
  if (!provider.label.trim()) issues.push('provider label is required')
  if (!KINDS.has(provider.kind)) issues.push('provider kind is invalid')
  if (!provider.attribution.trim()) issues.push('provider attribution is required')
  if (!FIDELITY.has(provider.fidelity)) issues.push('provider fidelity is invalid')
  if (!provider.coverage.trim()) issues.push('provider coverage is required')
  if (!CACHE_POLICIES.has(provider.cachePolicy)) issues.push('provider cache policy is invalid')
  if (provider.limitations.length === 0) issues.push('at least one provider limitation is required')
  return issues
}
