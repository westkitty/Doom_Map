import { describe, expect, it } from 'vitest'
import { ConsequenceGraph } from '../src/consequences/graph'
import { DEFAULT_HAZARD_CATALOG } from '../src/hazards/catalog'
import { HazardRegistry } from '../src/hazards/registry'

describe('hazard and consequence architecture', () => {
  it('turns the full 100-item disaster catalog into machine-readable manifests', () => {
    const registry = new HazardRegistry(DEFAULT_HAZARD_CATALOG)
    expect(registry.size()).toBe(100)
    expect(registry.flagship().length).toBeGreaterThanOrEqual(12)
    expect(registry.has('multi_hazard_user_composition')).toBe(true)
  })

  it('keeps catalogued hazards honest about fidelity', () => {
    expect(DEFAULT_HAZARD_CATALOG.every((hazard) => hazard.fidelity === 'D' && hazard.implementationState === 'catalogued')).toBe(true)
  })

  it('builds deterministic consequence order and descendant queries', () => {
    const graph = new ConsequenceGraph<string>()
    graph.add({ id: 'hazard', parentIds: [], startTimeMs: 0, severity: 1, confidence: 0.9, payload: 'hazard' })
    graph.add({ id: 'power', parentIds: ['hazard'], startTimeMs: 5, severity: 0.6, confidence: 0.8, payload: 'power' })
    graph.add({ id: 'water', parentIds: ['power'], startTimeMs: 10, severity: 0.4, confidence: 0.7, payload: 'water' })
    expect(graph.topologicalOrder().map((node) => node.id)).toEqual(['hazard', 'power', 'water'])
    expect(graph.descendants('hazard').map((node) => node.id)).toEqual(['power', 'water'])
  })
})
