import type { GeoDataPayload, GeoDataProvider, GeoDataQuery } from './geoProvider'
import { CircuitBreaker } from './circuitBreaker'

interface ProviderEntry<T> {
  provider: GeoDataProvider<T>
  breaker: CircuitBreaker
}

export class ProviderFailoverChain<T = unknown> {
  private readonly entries: ProviderEntry<T>[]

  constructor(providers: readonly GeoDataProvider<T>[]) {
    if (providers.length === 0) throw new Error('Provider chain requires at least one provider.')
    const ids = new Set<string>()
    this.entries = providers.map((provider) => {
      if (ids.has(provider.id)) throw new Error(`Duplicate provider id: ${provider.id}`)
      ids.add(provider.id)
      return { provider, breaker: new CircuitBreaker() }
    })
  }

  async fetch(query: GeoDataQuery, signal: AbortSignal, nowMs = Date.now()): Promise<GeoDataPayload<T>> {
    const failures: string[] = []
    for (const entry of this.entries) {
      if (!entry.breaker.canRequest(nowMs)) {
        failures.push(`${entry.provider.id}: circuit open`)
        continue
      }
      try {
        const value = await entry.provider.fetch(query, signal)
        entry.breaker.recordSuccess()
        return value
      } catch (error) {
        if (signal.aborted) {
          entry.breaker.recordCancellation()
          throw error
        }
        entry.breaker.recordFailure(nowMs)
        failures.push(`${entry.provider.id}: ${error instanceof Error ? error.message : String(error)}`)
      }
    }
    throw new Error(`All providers failed: ${failures.join(' | ')}`)
  }
}
