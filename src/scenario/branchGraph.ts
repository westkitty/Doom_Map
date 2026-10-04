export interface ScenarioBranch {
  id: string
  parentId: string | null
  label: string
  scenarioChecksum: string
  createdAt: string
}

export class ScenarioBranchGraph {
  private readonly branches = new Map<string, ScenarioBranch>()

  add(branch: ScenarioBranch): void {
    if (!branch.id.trim() || !branch.label.trim() || !branch.scenarioChecksum.trim()) throw new Error('Branch id, label, and checksum are required.')
    if (this.branches.has(branch.id)) throw new Error(`Duplicate branch id: ${branch.id}`)
    if (branch.parentId !== null && !this.branches.has(branch.parentId)) throw new Error(`Missing parent branch: ${branch.parentId}`)
    if (Number.isNaN(Date.parse(branch.createdAt))) throw new Error('Branch createdAt must be an ISO-compatible timestamp.')
    this.branches.set(branch.id, branch)
  }

  get(id: string): ScenarioBranch | null { return this.branches.get(id) ?? null }

  lineage(id: string): ScenarioBranch[] {
    const result: ScenarioBranch[] = []
    let current = this.branches.get(id) ?? null
    while (current) {
      result.unshift(current)
      current = current.parentId === null ? null : this.branches.get(current.parentId) ?? null
    }
    return result
  }

  leaves(): ScenarioBranch[] {
    const parents = new Set([...this.branches.values()].map((branch) => branch.parentId).filter((id): id is string => id !== null))
    return [...this.branches.values()].filter((branch) => !parents.has(branch.id))
  }

  list(): ScenarioBranch[] { return [...this.branches.values()] }
}
