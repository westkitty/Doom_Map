export type LifelineType = 'power' | 'water' | 'telecom' | 'transport' | 'healthcare'

export interface LifelineNode {
  id: string
  name: string
  type: LifelineType
  capacity: number // 0.0 - 1.0 (1.0 = fully operational)
  directDamage: number // 0.0 - 1.0
  operability: number // 0.0 - 1.0 (after dependency cascade)
  dependencies: string[] // IDs of prerequisite upstream nodes
}

export class LifelineGraph {
  readonly nodes = new Map<string, LifelineNode>()

  constructor() {
    this.reset()
  }

  reset(): void {
    this.nodes.clear()
    const baseline: LifelineNode[] = [
      { id: 'grid_substation', name: 'High-Voltage Power Substation', type: 'power', capacity: 1.0, directDamage: 0, operability: 1.0, dependencies: [] },
      { id: 'water_treatment', name: 'Municipal Water Treatment Facility', type: 'water', capacity: 1.0, directDamage: 0, operability: 1.0, dependencies: ['grid_substation'] },
      { id: 'telecom_tower', name: 'Cellular Base Station & Fiber Hub', type: 'telecom', capacity: 1.0, directDamage: 0, operability: 1.0, dependencies: ['grid_substation'] },
      { id: 'transport_bridge', name: 'Highway Bridges & Transport Arteries', type: 'transport', capacity: 1.0, directDamage: 0, operability: 1.0, dependencies: [] },
      { id: 'regional_hospital', name: 'Regional Emergency Medical Center', type: 'healthcare', capacity: 1.0, directDamage: 0, operability: 1.0, dependencies: ['grid_substation', 'water_treatment', 'transport_bridge'] }
    ]
    for (const node of baseline) {
      this.nodes.set(node.id, { ...node })
    }
  }

  applyDamage(damageMap: Record<string, number>): void {
    for (const [id, directDmg] of Object.entries(damageMap)) {
      const node = this.nodes.get(id)
      if (node) {
        node.directDamage = Math.max(0, Math.min(1, directDmg))
        node.capacity = Math.max(0, 1 - node.directDamage)
      }
    }
    this.propagateCascades()
  }

  private propagateCascades(): void {
    // Run relaxation iterations across dependency directed acyclic graph
    for (let iter = 0; iter < 4; iter++) {
      for (const node of this.nodes.values()) {
        let dependencyFactor = 1.0
        for (const depId of node.dependencies) {
          const upstream = this.nodes.get(depId)
          if (upstream) {
            // Backup generators provide 0.25 floor for hospital and telecom
            const floor = (node.type === 'healthcare' || node.type === 'telecom') ? 0.25 : 0.0
            dependencyFactor = Math.min(dependencyFactor, Math.max(floor, upstream.operability))
          }
        }
        node.operability = node.capacity * dependencyFactor
      }
    }
  }

  summary(): { overallOperability: number; failedCount: number; degradedCount: number; details: Record<LifelineType, number> } {
    let sum = 0
    let failed = 0
    let degraded = 0
    const details: Record<LifelineType, number> = { power: 0, water: 0, telecom: 0, transport: 0, healthcare: 0 }

    for (const node of this.nodes.values()) {
      sum += node.operability
      details[node.type] = node.operability
      if (node.operability < 0.2) failed++
      else if (node.operability < 0.8) degraded++
    }

    return {
      overallOperability: this.nodes.size > 0 ? sum / this.nodes.size : 1.0,
      failedCount: failed,
      degradedCount: degraded,
      details
    }
  }
}
