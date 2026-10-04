export class ViewEpochController {
  private epoch = 0
  private readonly releases = new Map<number, Set<() => void>>()

  begin(): number {
    const next = this.epoch + 1
    for (const [epoch, callbacks] of this.releases) {
      if (epoch >= next) continue
      for (const release of callbacks) release()
      this.releases.delete(epoch)
    }
    this.epoch = next
    return next
  }

  current(): number { return this.epoch }
  isCurrent(epoch: number): boolean { return epoch === this.epoch }

  track(epoch: number, release: () => void): () => void {
    if (!this.isCurrent(epoch)) {
      release()
      return () => {}
    }
    const callbacks = this.releases.get(epoch) ?? new Set<() => void>()
    callbacks.add(release)
    this.releases.set(epoch, callbacks)
    return () => {
      callbacks.delete(release)
      if (callbacks.size === 0) this.releases.delete(epoch)
    }
  }

  cancelCurrent(): void {
    const callbacks = this.releases.get(this.epoch)
    if (!callbacks) return
    for (const release of callbacks) release()
    this.releases.delete(this.epoch)
  }
}
