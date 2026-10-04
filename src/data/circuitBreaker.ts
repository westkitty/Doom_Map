export type CircuitState = 'closed' | 'open' | 'half-open'

export class CircuitBreaker {
  private failures = 0
  private openedAtMs = Number.NEGATIVE_INFINITY
  private probeInFlight = false

  constructor(
    private readonly failureThreshold = 3,
    private readonly resetAfterMs = 30_000
  ) {
    if (!Number.isSafeInteger(failureThreshold) || failureThreshold < 1) throw new RangeError('Failure threshold must be positive.')
    if (!Number.isFinite(resetAfterMs) || resetAfterMs < 0) throw new RangeError('Reset delay must be non-negative.')
  }

  state(nowMs: number): CircuitState {
    if (this.failures < this.failureThreshold) return 'closed'
    if (nowMs - this.openedAtMs >= this.resetAfterMs) return 'half-open'
    return 'open'
  }

  canRequest(nowMs: number): boolean {
    const state = this.state(nowMs)
    if (state === 'open') return false
    if (state === 'half-open') {
      if (this.probeInFlight) return false
      this.probeInFlight = true
    }
    return true
  }

  recordSuccess(): void {
    this.failures = 0
    this.probeInFlight = false
    this.openedAtMs = Number.NEGATIVE_INFINITY
  }

  recordFailure(nowMs: number): void {
    this.failures += 1
    this.probeInFlight = false
    if (this.failures >= this.failureThreshold) this.openedAtMs = nowMs
  }

  recordCancellation(): void {
    this.probeInFlight = false
  }
}
