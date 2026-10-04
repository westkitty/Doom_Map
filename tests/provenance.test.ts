import { describe, expect, it } from 'vitest'
import { validateProvenanceRecord } from '../src/core/provenance'

describe('provenance contract', () => {
  it('accepts a complete scientific provenance record', () => {
    expect(validateProvenanceRecord({
      id: 'example-model',
      version: '1.0.0',
      fidelity: 'B',
      sources: [{ id: 'paper-1', title: 'Reference', kind: 'reference' }],
      assumptions: ['Reduced-order representation'],
      limitations: ['Not valid for structure-level engineering decisions'],
      uncertainty: 'Outputs are reported as ranges.'
    })).toEqual([])
  })

  it('rejects untraceable output metadata', () => {
    const issues = validateProvenanceRecord({ id: '', version: '', fidelity: 'D', sources: [], assumptions: [], limitations: [], uncertainty: '' })
    expect(issues.length).toBeGreaterThanOrEqual(5)
  })
})
