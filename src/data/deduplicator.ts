export interface SharedRequest<T> {
  promise: Promise<T>
  release: () => void
}

interface ActiveRequest<T> {
  controller: AbortController
  promise: Promise<T>
  consumers: number
  settled: boolean
}

export class RequestDeduplicator {
  private readonly active = new Map<string, ActiveRequest<unknown>>()

  acquire<T>(key: string, run: (signal: AbortSignal) => Promise<T>): SharedRequest<T> {
    if (!key.trim()) throw new Error('Shared request key is required.')
    let entry = this.active.get(key) as ActiveRequest<T> | undefined

    if (!entry) {
      const controller = new AbortController()
      const created: ActiveRequest<T> = {
        controller,
        consumers: 0,
        settled: false,
        promise: Promise.resolve(undefined as T)
      }
      created.promise = run(controller.signal).finally(() => {
        created.settled = true
        if (created.consumers === 0) this.active.delete(key)
      })
      entry = created
      this.active.set(key, created as ActiveRequest<unknown>)
    }

    entry.consumers += 1
    let released = false
    return {
      promise: entry.promise,
      release: () => {
        if (released) return
        released = true
        entry!.consumers -= 1
        if (entry!.consumers === 0) {
          if (!entry!.settled) entry!.controller.abort('no-consumers')
          else this.active.delete(key)
        }
      }
    }
  }

  activeCount(): number { return this.active.size }
}
