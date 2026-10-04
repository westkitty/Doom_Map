import { describe, expect, it, vi } from 'vitest'
import type { ProviderDescriptor } from '../src/core/provider'
import { ByteBudgetLru } from '../src/data/byteLru'
import { ProviderRegistry } from '../src/data/providerRegistry'
import { RequestScheduler } from '../src/data/requestScheduler'
import { resourceBudgetFor } from '../src/data/resourceBudget'
import { RetryPolicy } from '../src/data/retryPolicy'
import { shouldRefineLod, screenSpaceErrorPx } from '../src/geo/lod'
import { normalizeTileKey, tileBounds, tileKeyToString } from '../src/geo/tileKey'

const provider = (id: string, fidelity: ProviderDescriptor['fidelity'], requiresSecret = false): ProviderDescriptor => ({
  id, label: id, kind: 'terrain', attribution: id, fidelity, coverage: 'global', cachePolicy: 'session', requiresSecret, limitations: ['fixture']
})

describe('bounded geospatial streaming primitives', () => {
  it('normalizes wrapped Z/X/Y tiles and computes geographic bounds', () => {
    expect(normalizeTileKey({ z: 2, x: -1, y: 1 })).toEqual({ z: 2, x: 3, y: 1 })
    expect(tileKeyToString({ z: 2, x: 3, y: 1 })).toBe('2/3/1')
    const bounds = tileBounds({ z: 0, x: 0, y: 0 })
    expect(bounds.westDeg).toBe(-180); expect(bounds.eastDeg).toBe(180)
  })

  it('uses screen-space error with hysteresis to avoid refinement chatter', () => {
    const sse = screenSpaceErrorPx(100, 1000, 1000, 60)
    expect(sse).toBeGreaterThan(80)
    expect(shouldRefineLod({ geometricErrorM: 10, distanceM: 1000, viewportHeightPx: 1000, verticalFovDeg: 60, maximumScreenSpaceErrorPx: 8, wasRefined: false })).toBe(false)
    expect(shouldRefineLod({ geometricErrorM: 10, distanceM: 400, viewportHeightPx: 1000, verticalFovDeg: 60, maximumScreenSpaceErrorPx: 8, wasRefined: false })).toBe(true)
  })

  it('evicts least-recently-used entries to stay inside a byte budget', () => {
    const cache = new ByteBudgetLru<string, string>(10)
    cache.set('a', 'A', 4); cache.set('b', 'B', 4); cache.get('a')
    expect(cache.set('c', 'C', 4)).toEqual(['b'])
    expect(cache.keys()).toEqual(['a', 'c'])
    expect(cache.bytes()).toBe(8)
  })

  it('routes around unhealthy and secret-only providers', () => {
    const registry = new ProviderRegistry()
    registry.register(provider('public-c', 'C'))
    registry.register(provider('secret-a', 'A', true))
    registry.register(provider('public-b', 'B'))
    registry.setHealth('public-b', 'degraded')
    expect(registry.resolve('terrain').map((item) => item.id)).toEqual(['public-c', 'public-b'])
    expect(registry.resolve('terrain', { allowSecrets: true })[0]?.id).toBe('secret-a')
  })

  it('uses bounded quality-tier resource budgets', () => {
    expect(resourceBudgetFor('safe').maxConcurrentRequests).toBeLessThan(resourceBudgetFor('high').maxConcurrentRequests)
    expect(resourceBudgetFor('safe').maxGpuBytes).toBeLessThan(resourceBudgetFor('high').maxGpuBytes)
  })

  it('applies exponential retry rules only to retryable responses', () => {
    const policy = new RetryPolicy({ baseDelayMs: 100, maxAttempts: 3 })
    expect(policy.shouldRetry(1, 503)).toBe(true)
    expect(policy.shouldRetry(1, 404)).toBe(false)
    expect(policy.delayMs(2, 0.5)).toBe(200)
  })

  it('bounds concurrency and supports cancellation', async () => {
    const scheduler = new RequestScheduler(1)
    let release = (): void => { throw new Error('release callback was not initialized') }
    const first = scheduler.enqueue({ id: 'first', priority: 1, run: () => new Promise<void>((resolve) => { release = resolve }) })
    const secondRun = vi.fn(async () => 'second')
    const second = scheduler.enqueue({ id: 'second', priority: 10, run: secondRun })
    expect(scheduler.activeCount()).toBe(1)
    expect(scheduler.queuedCount()).toBe(1)
    expect(scheduler.cancel('second')).toBe(true)
    await expect(second).rejects.toMatchObject({ name: 'AbortError' })
    expect(secondRun).not.toHaveBeenCalled()
    release(); await first
  })
})
