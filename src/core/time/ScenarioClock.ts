export type ClockListener = (timeMs: number, state: ClockState) => void

export interface ClockState {
  timeMs: number
  startTimeMs: number
  endTimeMs: number
  durationMs: number
  progress: number // 0.0 - 1.0
  playbackRate: number
  isPlaying: boolean
}

export class ScenarioClock {
  private timeMs: number
  private readonly startTimeMs: number
  private readonly durationMs: number
  private playbackRate = 1.0
  private isPlaying = false
  private readonly listeners = new Set<ClockListener>()

  constructor(startTimeMs: number, durationMs: number) {
    if (!Number.isFinite(startTimeMs) || !Number.isFinite(durationMs) || durationMs <= 0) {
      throw new Error('Invalid clock bounds')
    }
    this.startTimeMs = startTimeMs
    this.durationMs = durationMs
    this.timeMs = startTimeMs
  }

  get state(): ClockState {
    const elapsed = this.timeMs - this.startTimeMs
    return {
      timeMs: this.timeMs,
      startTimeMs: this.startTimeMs,
      endTimeMs: this.startTimeMs + this.durationMs,
      durationMs: this.durationMs,
      progress: Math.max(0, Math.min(1, elapsed / this.durationMs)),
      playbackRate: this.playbackRate,
      isPlaying: this.isPlaying
    }
  }

  play(): void {
    if (!this.isPlaying) {
      this.isPlaying = true
      this.notify()
    }
  }

  pause(): void {
    if (this.isPlaying) {
      this.isPlaying = false
      this.notify()
    }
  }

  toggle(): void {
    if (this.isPlaying) this.pause()
    else this.play()
  }

  setPlaybackRate(rate: number): void {
    if (!Number.isFinite(rate) || rate <= 0) throw new Error('Playback rate must be positive')
    this.playbackRate = rate
    this.notify()
  }

  seek(targetTimeMs: number): void {
    const clamped = Math.max(this.startTimeMs, Math.min(this.startTimeMs + this.durationMs, targetTimeMs))
    this.timeMs = clamped
    this.notify()
  }

  seekNormalized(fraction: number): void {
    const clamped = Math.max(0, Math.min(1, fraction))
    this.seek(this.startTimeMs + clamped * this.durationMs)
  }

  seekRelative(offsetMs: number): void {
    this.seek(this.timeMs + offsetMs)
  }

  advanceRealTime(deltaSeconds: number): void {
    if (!this.isPlaying || deltaSeconds <= 0) return
    const deltaSimMs = deltaSeconds * 1000 * this.playbackRate
    this.timeMs += deltaSimMs
    if (this.timeMs >= this.startTimeMs + this.durationMs) {
      this.timeMs = this.startTimeMs + this.durationMs
      this.pause()
    }
    this.notify()
  }

  subscribe(listener: ClockListener): () => void {
    this.listeners.add(listener)
    listener(this.timeMs, this.state)
    return () => this.listeners.delete(listener)
  }

  private notify(): void {
    const s = this.state
    for (const listener of this.listeners) {
      listener(this.timeMs, s)
    }
  }
}
