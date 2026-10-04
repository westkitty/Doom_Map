import { checksumCanonical } from '../sim/canonical'

export interface RuntimeInputEntry<E = unknown> {
  sequence: number
  id: string
  timeMs: number
  type: string
  payload: E
}

export class RuntimeInputJournal<E = unknown> {
  private entries: RuntimeInputEntry<E>[] = []
  private sequence = 0

  record(id: string, timeMs: number, type: string, payload: E): RuntimeInputEntry<E> {
    if (!id.trim() || !type.trim()) throw new Error('Journal id and type are required.')
    if (!Number.isFinite(timeMs)) throw new RangeError('Journal time must be finite.')
    const entry = { sequence: this.sequence++, id, timeMs, type, payload: structuredClone(payload) }
    this.entries.push(entry)
    return structuredClone(entry)
  }

  snapshot(): RuntimeInputEntry<E>[] { return structuredClone(this.entries) }

  restore(entries: readonly RuntimeInputEntry<E>[]): void {
    this.entries = structuredClone([...entries])
    this.sequence = this.entries.reduce((max, entry) => Math.max(max, entry.sequence + 1), 0)
  }

  checksum(): string { return checksumCanonical(this.entries) }
}
