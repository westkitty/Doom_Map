export type RequestLifecycle = 'queued' | 'running' | 'completed' | 'cancelled' | 'failed'

export interface ScheduledRequest<T> {
  id: string
  priority: number
  run: (signal: AbortSignal) => Promise<T>
}

interface InternalRequest<T> extends ScheduledRequest<T> {
  sequence: number
  controller: AbortController
  resolve: (value: T) => void
  reject: (reason: unknown) => void
  lifecycle: RequestLifecycle
}

export class RequestScheduler {
  private readonly queue: InternalRequest<unknown>[] = []
  private readonly active = new Map<string, InternalRequest<unknown>>()
  private readonly lifecycle = new Map<string, RequestLifecycle>()
  private sequence = 0

  constructor(private readonly maxConcurrent = 6) {
    if (!Number.isSafeInteger(maxConcurrent) || maxConcurrent < 1) throw new RangeError('Request concurrency must be positive.')
  }

  enqueue<T>(request: ScheduledRequest<T>): Promise<T> {
    if (!request.id.trim()) return Promise.reject(new Error('Request id is required.'))
    if (!Number.isFinite(request.priority)) return Promise.reject(new RangeError('Request priority must be finite.'))
    if (this.lifecycle.has(request.id)) return Promise.reject(new Error(`Duplicate request id: ${request.id}`))
    return new Promise<T>((resolve, reject) => {
      const internal: InternalRequest<T> = {
        ...request,
        sequence: this.sequence++,
        controller: new AbortController(),
        resolve,
        reject,
        lifecycle: 'queued'
      }
      this.queue.push(internal as InternalRequest<unknown>)
      this.lifecycle.set(request.id, 'queued')
      this.sortQueue()
      this.pump()
    })
  }

  cancel(id: string): boolean {
    const queuedIndex = this.queue.findIndex((request) => request.id === id)
    if (queuedIndex >= 0) {
      const [request] = this.queue.splice(queuedIndex, 1)
      request!.lifecycle = 'cancelled'
      this.lifecycle.set(id, 'cancelled')
      request!.controller.abort('cancelled')
      request!.reject(new DOMException('Request cancelled', 'AbortError'))
      return true
    }
    const active = this.active.get(id)
    if (!active) return false
    active.lifecycle = 'cancelled'
    this.lifecycle.set(id, 'cancelled')
    active.controller.abort('cancelled')
    return true
  }

  status(id: string): RequestLifecycle | null { return this.lifecycle.get(id) ?? null }
  queuedCount(): number { return this.queue.length }
  activeCount(): number { return this.active.size }

  private sortQueue(): void {
    this.queue.sort((a, b) => b.priority - a.priority || a.sequence - b.sequence)
  }

  private pump(): void {
    while (this.active.size < this.maxConcurrent && this.queue.length > 0) {
      const request = this.queue.shift()!
      request.lifecycle = 'running'
      this.lifecycle.set(request.id, 'running')
      this.active.set(request.id, request)
      void request.run(request.controller.signal).then((value) => {
        if (request.lifecycle === 'cancelled') return
        request.lifecycle = 'completed'
        this.lifecycle.set(request.id, 'completed')
        request.resolve(value)
      }, (error: unknown) => {
        if (request.lifecycle !== 'cancelled') {
          request.lifecycle = 'failed'
          this.lifecycle.set(request.id, 'failed')
        }
        request.reject(error)
      }).finally(() => {
        this.active.delete(request.id)
        this.pump()
      })
    }
  }
}
