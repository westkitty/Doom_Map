export type Connectivity = 'online' | 'offline'

export interface ConnectivitySnapshot {
  state: Connectivity
  changedAtMs: number
  transitions: number
}

export class NetworkState {
  private current: ConnectivitySnapshot

  constructor(initialOnline: boolean, nowMs = 0) {
    this.current = { state: initialOnline ? 'online' : 'offline', changedAtMs: nowMs, transitions: 0 }
  }

  observe(online: boolean, nowMs: number): ConnectivitySnapshot {
    if (!Number.isFinite(nowMs)) throw new RangeError('Connectivity timestamp must be finite.')
    const next: Connectivity = online ? 'online' : 'offline'
    if (next !== this.current.state) {
      this.current = { state: next, changedAtMs: nowMs, transitions: this.current.transitions + 1 }
    }
    return this.snapshot()
  }

  snapshot(): ConnectivitySnapshot { return { ...this.current } }
}
