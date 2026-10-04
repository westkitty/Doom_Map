import type { ProviderDescriptor, ProviderHealth, ProviderKind } from '../core/provider'
import { validateProviderDescriptor } from '../core/provider'

const HEALTH_SCORE: Record<ProviderHealth, number> = { healthy: 3, unknown: 2, degraded: 1, offline: 0 }
const FIDELITY_SCORE = { A: 4, B: 3, C: 2, D: 1 } as const

export interface ProviderRouteOptions {
  allowSecrets?: boolean
  preferredIds?: readonly string[]
}

export class ProviderRegistry {
  private readonly providers = new Map<string, ProviderDescriptor>()
  private readonly health = new Map<string, ProviderHealth>()

  register(provider: ProviderDescriptor): void {
    const issues = validateProviderDescriptor(provider)
    if (issues.length > 0) throw new Error(`Invalid provider ${provider.id || '<unknown>'}: ${issues.join('; ')}`)
    if (this.providers.has(provider.id)) throw new Error(`Duplicate provider id: ${provider.id}`)
    this.providers.set(provider.id, provider)
    this.health.set(provider.id, 'unknown')
  }

  setHealth(id: string, health: ProviderHealth): void {
    if (!this.providers.has(id)) throw new Error(`Unknown provider: ${id}`)
    this.health.set(id, health)
  }

  getHealth(id: string): ProviderHealth | null { return this.health.get(id) ?? null }

  resolve(kind: ProviderKind, options: ProviderRouteOptions = {}): ProviderDescriptor[] {
    const preferred = new Map((options.preferredIds ?? []).map((id, index) => [id, index]))
    return [...this.providers.values()]
      .filter((provider) => provider.kind === kind)
      .filter((provider) => options.allowSecrets === true || provider.requiresSecret === false)
      .filter((provider) => (this.health.get(provider.id) ?? 'unknown') !== 'offline')
      .sort((a, b) => {
        const aPreferred = preferred.has(a.id) ? preferred.get(a.id)! : Number.POSITIVE_INFINITY
        const bPreferred = preferred.has(b.id) ? preferred.get(b.id)! : Number.POSITIVE_INFINITY
        if (aPreferred !== bPreferred) return aPreferred - bPreferred
        const healthDelta = HEALTH_SCORE[this.health.get(b.id) ?? 'unknown'] - HEALTH_SCORE[this.health.get(a.id) ?? 'unknown']
        if (healthDelta !== 0) return healthDelta
        return FIDELITY_SCORE[b.fidelity] - FIDELITY_SCORE[a.fidelity] || a.id.localeCompare(b.id)
      })
  }

  list(): ProviderDescriptor[] { return [...this.providers.values()] }
}
