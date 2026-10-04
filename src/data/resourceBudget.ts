import type { QualityTier } from '../core/quality'

export interface ResourceBudget {
  maxResidentBytes: number
  maxGpuBytes: number
  maxDecodedTiles: number
  maxConcurrentRequests: number
  maxPrefetchRequests: number
}

export const RESOURCE_BUDGETS: Readonly<Record<QualityTier, ResourceBudget>> = Object.freeze({
  high: Object.freeze({ maxResidentBytes: 768 * 1024 * 1024, maxGpuBytes: 512 * 1024 * 1024, maxDecodedTiles: 640, maxConcurrentRequests: 12, maxPrefetchRequests: 4 }),
  balanced: Object.freeze({ maxResidentBytes: 448 * 1024 * 1024, maxGpuBytes: 320 * 1024 * 1024, maxDecodedTiles: 360, maxConcurrentRequests: 8, maxPrefetchRequests: 3 }),
  low: Object.freeze({ maxResidentBytes: 224 * 1024 * 1024, maxGpuBytes: 160 * 1024 * 1024, maxDecodedTiles: 180, maxConcurrentRequests: 5, maxPrefetchRequests: 1 }),
  safe: Object.freeze({ maxResidentBytes: 112 * 1024 * 1024, maxGpuBytes: 80 * 1024 * 1024, maxDecodedTiles: 96, maxConcurrentRequests: 3, maxPrefetchRequests: 0 })
})

export function resourceBudgetFor(tier: QualityTier): ResourceBudget {
  return RESOURCE_BUDGETS[tier]
}
