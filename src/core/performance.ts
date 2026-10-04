/** Bounded rolling window; frame times include scheduling, not GPU timing. */
export class FrameStatistics {
  private readonly samples: number[] = []
  private previous: number | undefined
  record(now: number): void {
    if (this.previous !== undefined) {
      this.samples.push(now - this.previous)
      if (this.samples.length > 120) this.samples.shift()
    }
    this.previous = now
  }
  snapshot(): { fps: number; meanMs: number; p95Ms: number; samples: number } {
    const sorted = [...this.samples].sort((a, b) => a - b)
    const meanMs = sorted.reduce((sum, n) => sum + n, 0) / (sorted.length || 1)
    return { fps: meanMs > 0 ? 1000 / meanMs : 0, meanMs,
      p95Ms: sorted[Math.max(0, Math.ceil(sorted.length * 0.95) - 1)] ?? 0,
      samples: sorted.length }
  }
}
