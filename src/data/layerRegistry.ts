export interface DataLayerState {
  id: string
  visible: boolean
  opacity: number
  order: number
}

export class DataLayerRegistry {
  private readonly layers = new Map<string, DataLayerState>()

  register(layer: DataLayerState): void {
    if (!layer.id.trim()) throw new Error('Layer id is required.')
    if (this.layers.has(layer.id)) throw new Error(`Duplicate layer id: ${layer.id}`)
    this.validate(layer)
    this.layers.set(layer.id, { ...layer })
  }

  update(id: string, patch: Partial<Omit<DataLayerState, 'id'>>): DataLayerState {
    const current = this.layers.get(id)
    if (!current) throw new Error(`Unknown layer: ${id}`)
    const next = { ...current, ...patch }
    this.validate(next)
    this.layers.set(id, next)
    return { ...next }
  }

  orderedVisible(): DataLayerState[] {
    return [...this.layers.values()].filter((layer) => layer.visible).sort((a, b) => a.order - b.order || a.id.localeCompare(b.id)).map((layer) => ({ ...layer }))
  }

  get(id: string): DataLayerState | null { const value = this.layers.get(id); return value ? { ...value } : null }

  private validate(layer: DataLayerState): void {
    if (!Number.isFinite(layer.opacity) || layer.opacity < 0 || layer.opacity > 1) throw new RangeError('Layer opacity must be between 0 and 1.')
    if (!Number.isFinite(layer.order)) throw new RangeError('Layer order must be finite.')
  }
}
