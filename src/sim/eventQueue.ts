export interface ScheduledEvent<T = unknown> {
  id: string
  timeMs: number
  type: string
  payload: T
  sequence: number
}

export class EventQueue<T = unknown> {
  private readonly events: ScheduledEvent<T>[] = []
  private sequence = 0

  schedule(event: Omit<ScheduledEvent<T>, 'sequence'>): ScheduledEvent<T> {
    if (!event.id.trim()) throw new Error('Event id is required.')
    if (!event.type.trim()) throw new Error('Event type is required.')
    if (!Number.isFinite(event.timeMs)) throw new RangeError('Event time must be finite.')
    if (this.events.some((item) => item.id === event.id)) throw new Error(`Duplicate event id: ${event.id}`)
    const scheduled = { ...event, sequence: this.sequence++ }
    this.events.push(scheduled)
    this.events.sort((a, b) => a.timeMs - b.timeMs || a.sequence - b.sequence)
    return scheduled
  }

  cancel(id: string): boolean {
    const index = this.events.findIndex((event) => event.id === id)
    if (index < 0) return false
    this.events.splice(index, 1)
    return true
  }

  drainThrough(timeMs: number): ScheduledEvent<T>[] {
    if (!Number.isFinite(timeMs)) throw new RangeError('Drain time must be finite.')
    let count = 0
    while (count < this.events.length && this.events[count]!.timeMs <= timeMs) count += 1
    return this.events.splice(0, count)
  }

  peek(): ScheduledEvent<T> | null {
    return this.events[0] ?? null
  }

  size(): number { return this.events.length }
}
