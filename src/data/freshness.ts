export type FreshnessState = 'fresh' | 'stale' | 'expired' | 'invalid'

export interface FreshnessPolicy {
  maxAgeMs: number
  staleWhileRevalidateMs: number
}

export function classifyFreshness(fetchedAt: string, policy: FreshnessPolicy, nowMs = Date.now()): FreshnessState {
  if (!Number.isFinite(policy.maxAgeMs) || policy.maxAgeMs < 0 || !Number.isFinite(policy.staleWhileRevalidateMs) || policy.staleWhileRevalidateMs < 0) {
    throw new RangeError('Freshness durations must be non-negative and finite.')
  }
  const fetchedAtMs = Date.parse(fetchedAt)
  if (Number.isNaN(fetchedAtMs) || !Number.isFinite(nowMs)) return 'invalid'
  const age = Math.max(0, nowMs - fetchedAtMs)
  if (age <= policy.maxAgeMs) return 'fresh'
  if (age <= policy.maxAgeMs + policy.staleWhileRevalidateMs) return 'stale'
  return 'expired'
}
