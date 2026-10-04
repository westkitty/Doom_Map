import type { QualityTier } from './quality'

const ORDER: readonly QualityTier[] = ['safe', 'low', 'balanced', 'high']

function indexOfTier(tier: QualityTier): number {
  return ORDER.indexOf(tier)
}

export interface AutoQualityOptions {
  degradeFrameMs?: number
  upgradeFrameMs?: number
  badWindows?: number
  goodWindows?: number
  cooldownMs?: number
}

export class AutoQualityGovernor {
  private badCount = 0
  private goodCount = 0
  private lastChangeAtMs = Number.NEGATIVE_INFINITY
  private readonly degradeFrameMs: number
  private readonly upgradeFrameMs: number
  private readonly badWindows: number
  private readonly goodWindows: number
  private readonly cooldownMs: number

  constructor(options: AutoQualityOptions = {}) {
    this.degradeFrameMs = options.degradeFrameMs ?? 23
    this.upgradeFrameMs = options.upgradeFrameMs ?? 14.5
    this.badWindows = options.badWindows ?? 3
    this.goodWindows = options.goodWindows ?? 7
    this.cooldownMs = options.cooldownMs ?? 8_000
  }

  observe(frameMs: number, currentTier: QualityTier, nowMs: number, ceiling: QualityTier = 'high'): QualityTier | null {
    if (!Number.isFinite(frameMs) || !Number.isFinite(nowMs)) return null

    if (frameMs > this.degradeFrameMs) {
      this.badCount += 1
      this.goodCount = 0
    } else if (frameMs < this.upgradeFrameMs) {
      this.goodCount += 1
      this.badCount = 0
    } else {
      this.badCount = Math.max(0, this.badCount - 1)
      this.goodCount = Math.max(0, this.goodCount - 1)
    }

    if (nowMs - this.lastChangeAtMs < this.cooldownMs) return null

    const currentIndex = indexOfTier(currentTier)
    const ceilingIndex = indexOfTier(ceiling)

    if (this.badCount >= this.badWindows && currentIndex > 0) {
      this.badCount = 0
      this.goodCount = 0
      this.lastChangeAtMs = nowMs
      return ORDER[currentIndex - 1] ?? null
    }

    if (this.goodCount >= this.goodWindows && currentIndex < ceilingIndex) {
      this.badCount = 0
      this.goodCount = 0
      this.lastChangeAtMs = nowMs
      return ORDER[currentIndex + 1] ?? null
    }

    return null
  }

  reset(nowMs = Number.NEGATIVE_INFINITY): void {
    this.badCount = 0
    this.goodCount = 0
    this.lastChangeAtMs = nowMs
  }
}
