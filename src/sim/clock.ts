export interface ClockState {
  timeMs: number
  speed: number
  paused: boolean
  fixedStepMs: number
}

export class SimulationClock {
  private timeMs: number
  private speed = 1
  private paused = true
  private accumulatorMs = 0

  constructor(startTimeMs = 0, private readonly fixedStepMs = 1000 / 30) {
    if (!Number.isFinite(startTimeMs)) throw new RangeError('Start time must be finite.')
    if (!Number.isFinite(fixedStepMs) || fixedStepMs <= 0) throw new RangeError('Fixed step must be positive.')
    this.timeMs = startTimeMs
  }

  play(): void { this.paused = false }
  pause(): void { this.paused = true }

  setSpeed(speed: number): void {
    if (!Number.isFinite(speed) || speed <= 0) throw new RangeError('Clock speed must be positive.')
    this.speed = speed
  }

  seek(timeMs: number): void {
    if (!Number.isFinite(timeMs)) throw new RangeError('Seek time must be finite.')
    this.timeMs = timeMs
    this.accumulatorMs = 0
  }

  advance(realDeltaMs: number): number[] {
    if (!Number.isFinite(realDeltaMs) || realDeltaMs < 0) throw new RangeError('Delta must be non-negative and finite.')
    if (this.paused || realDeltaMs === 0) return []
    this.accumulatorMs += realDeltaMs * this.speed
    const steps: number[] = []
    while (this.accumulatorMs + 1e-9 >= this.fixedStepMs) {
      this.accumulatorMs -= this.fixedStepMs
      this.timeMs += this.fixedStepMs
      steps.push(this.timeMs)
      if (steps.length > 10_000) throw new Error('Clock advance exceeded safety step limit.')
    }
    return steps
  }

  snapshot(): ClockState {
    return { timeMs: this.timeMs, speed: this.speed, paused: this.paused, fixedStepMs: this.fixedStepMs }
  }
}
