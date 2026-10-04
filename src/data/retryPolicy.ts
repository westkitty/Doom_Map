export interface RetryPolicyOptions {
  baseDelayMs?: number
  maxDelayMs?: number
  factor?: number
  maxAttempts?: number
}

export class RetryPolicy {
  readonly baseDelayMs: number
  readonly maxDelayMs: number
  readonly factor: number
  readonly maxAttempts: number

  constructor(options: RetryPolicyOptions = {}) {
    this.baseDelayMs = options.baseDelayMs ?? 350
    this.maxDelayMs = options.maxDelayMs ?? 12_000
    this.factor = options.factor ?? 2
    this.maxAttempts = options.maxAttempts ?? 4
    if (this.baseDelayMs < 0 || this.maxDelayMs < this.baseDelayMs || this.factor < 1 || this.maxAttempts < 1) throw new RangeError('Invalid retry policy.')
  }

  shouldRetry(attempt: number, status?: number): boolean {
    if (attempt >= this.maxAttempts) return false
    if (status === undefined) return true
    return status === 408 || status === 425 || status === 429 || status >= 500
  }

  delayMs(attempt: number, jitter01 = 0.5): number {
    if (!Number.isSafeInteger(attempt) || attempt < 1) throw new RangeError('Retry attempt must start at 1.')
    if (!Number.isFinite(jitter01) || jitter01 < 0 || jitter01 > 1) throw new RangeError('Retry jitter must be between 0 and 1.')
    const raw = Math.min(this.maxDelayMs, this.baseDelayMs * this.factor ** (attempt - 1))
    return raw * (0.75 + jitter01 * 0.5)
  }
}
