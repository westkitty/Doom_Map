export interface ConsequenceNode<T = unknown> {
  id: string
  parentIds: readonly string[]
  startTimeMs: number
  endTimeMs?: number
  severity: number
  confidence: number
  payload: T
}

export class ConsequenceGraph<T = unknown> {
  private readonly nodes = new Map<string, ConsequenceNode<T>>()

  add(node: ConsequenceNode<T>): void {
    if (!node.id.trim()) throw new Error('Consequence id is required.')
    if (this.nodes.has(node.id)) throw new Error(`Duplicate consequence id: ${node.id}`)
    if (!Number.isFinite(node.startTimeMs)) throw new RangeError('Consequence start time must be finite.')
    if (node.endTimeMs !== undefined && (!Number.isFinite(node.endTimeMs) || node.endTimeMs < node.startTimeMs)) throw new RangeError('Consequence end time is invalid.')
    if (!Number.isFinite(node.severity) || node.severity < 0 || node.severity > 1) throw new RangeError('Severity must be between 0 and 1.')
    if (!Number.isFinite(node.confidence) || node.confidence < 0 || node.confidence > 1) throw new RangeError('Confidence must be between 0 and 1.')
    if (new Set(node.parentIds).size !== node.parentIds.length) throw new Error('Consequence parent ids must be unique.')
    for (const parentId of node.parentIds) {
      if (!this.nodes.has(parentId)) throw new Error(`Missing consequence parent: ${parentId}`)
    }
    this.nodes.set(node.id, node)
  }

  get(id: string): ConsequenceNode<T> | null { return this.nodes.get(id) ?? null }

  topologicalOrder(): ConsequenceNode<T>[] {
    const indegree = new Map<string, number>()
    const children = new Map<string, string[]>()
    for (const node of this.nodes.values()) {
      indegree.set(node.id, node.parentIds.length)
      for (const parentId of node.parentIds) {
        const list = children.get(parentId) ?? []
        list.push(node.id)
        children.set(parentId, list)
      }
    }
    const ready = [...this.nodes.values()].filter((node) => (indegree.get(node.id) ?? 0) === 0).sort((a, b) => a.startTimeMs - b.startTimeMs || a.id.localeCompare(b.id))
    const ordered: ConsequenceNode<T>[] = []
    while (ready.length > 0) {
      const node = ready.shift()!
      ordered.push(node)
      for (const childId of children.get(node.id) ?? []) {
        const remaining = (indegree.get(childId) ?? 0) - 1
        indegree.set(childId, remaining)
        if (remaining === 0) ready.push(this.nodes.get(childId)!)
      }
      ready.sort((a, b) => a.startTimeMs - b.startTimeMs || a.id.localeCompare(b.id))
    }
    if (ordered.length !== this.nodes.size) throw new Error('Consequence graph contains a cycle.')
    return ordered
  }

  descendants(id: string): ConsequenceNode<T>[] {
    if (!this.nodes.has(id)) return []
    const result: ConsequenceNode<T>[] = []
    const queue = [id]
    const seen = new Set(queue)
    while (queue.length > 0) {
      const current = queue.shift()!
      for (const node of this.nodes.values()) {
        if (!node.parentIds.includes(current) || seen.has(node.id)) continue
        seen.add(node.id)
        queue.push(node.id)
        result.push(node)
      }
    }
    return result
  }
}
