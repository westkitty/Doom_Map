export interface AttributionEntry {
  providerId: string
  attribution: string
  datasetVersion?: string
}

export class AttributionLedger {
  private readonly entries = new Map<string, AttributionEntry>()

  observe(entry: AttributionEntry): void {
    if (!entry.providerId.trim() || !entry.attribution.trim()) throw new Error('Attribution provider and text are required.')
    this.entries.set(entry.providerId, { ...entry })
  }

  remove(providerId: string): boolean { return this.entries.delete(providerId) }

  list(): AttributionEntry[] {
    return [...this.entries.values()].sort((a, b) => a.providerId.localeCompare(b.providerId))
  }

  renderText(): string {
    return this.list().map((entry) => entry.datasetVersion
      ? `${entry.attribution} (${entry.datasetVersion})`
      : entry.attribution
    ).join(' · ')
  }
}
