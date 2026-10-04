export interface RuntimeTraceEvent<T = unknown> {
  sequence: number
  timestampMs: number
  category: string
  message: string
  data?: T
}

export class RuntimeTrace {
  private readonly events: RuntimeTraceEvent[] = []
  private sequence = 0

  constructor(private readonly capacity = 256) {
    if (!Number.isSafeInteger(capacity) || capacity < 1) throw new RangeError('Trace capacity must be positive.')
  }

  record<T>(timestampMs: number, category: string, message: string, data?: T): RuntimeTraceEvent<T> {
    if (!Number.isFinite(timestampMs)) throw new RangeError('Trace timestamp must be finite.')
    if (!category.trim() || !message.trim()) throw new Error('Trace category and message are required.')
    const event: RuntimeTraceEvent<T> = { sequence: this.sequence++, timestampMs, category, message, ...(data === undefined ? {} : { data }) }
    this.events.push(event)
    if (this.events.length > this.capacity) this.events.splice(0, this.events.length - this.capacity)
    return event
  }

  snapshot(category?: string): RuntimeTraceEvent[] {
    return this.events.filter((event) => category === undefined || event.category === category).map((event) => ({ ...event }))
  }

  clear(): void { this.events.length = 0 }
}
