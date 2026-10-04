import { describe, expect, it } from 'vitest'
import { validateProviderDescriptor } from '../src/core/provider'

describe('data provider contract', () => {
  it('accepts a fully attributed provider', () => {
    expect(validateProviderDescriptor({ id: 'global-buildings', label: 'Global buildings', kind: 'building', attribution: 'Example provider', fidelity: 'C', coverage: 'best available global coverage', cachePolicy: 'persistent', requiresSecret: false, limitations: ['Coverage and height completeness vary by region.'] })).toEqual([])
  })
  it('rejects an untraceable provider', () => {
    expect(validateProviderDescriptor({ id: '', label: '', kind: 'building', attribution: '', fidelity: 'C', coverage: '', cachePolicy: 'session', requiresSecret: false, limitations: [] }).length).toBeGreaterThanOrEqual(5)
  })
})
