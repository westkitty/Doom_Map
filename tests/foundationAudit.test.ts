import { describe, expect, it } from 'vitest'
import { auditFoundation } from '../src/core/foundationAudit'
import type { ProviderDescriptor } from '../src/core/provider'

describe('foundation audit', () => {
  it('certifies the machine-readable hazard catalog and valid providers', () => {
    const provider: ProviderDescriptor = {
      id: 'fixture',
      label: 'Fixture',
      kind: 'vector',
      attribution: 'Fixture source',
      fidelity: 'D',
      coverage: 'test only',
      cachePolicy: 'session',
      requiresSecret: false,
      limitations: ['Not production data.']
    }
    const report = auditFoundation([provider])
    expect(report.ok).toBe(true)
    expect(report.hazardCount).toBe(100)
    expect(report.flagshipCount).toBeGreaterThanOrEqual(12)
    expect(report.providerCount).toBe(1)
  })
})
