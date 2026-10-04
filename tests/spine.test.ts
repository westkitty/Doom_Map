import { describe, expect, it } from 'vitest'
import models from '../data/models.json'
import providers from '../data/providers.json'
import { parseManifest, parseProvenance } from '../src/data/provenance'
import { FrameStatistics } from '../src/core/performance'

describe('governed manifest boundary', () => {
  it('validates all active records with explicit providers', () => {
    expect(parseManifest(models, 'model')).toHaveLength(1)
    expect(parseManifest(providers, 'provider')).toHaveLength(2)
  })
  it.each(['id', 'version', 'sources', 'assumptions', 'uncertainty', 'limitations', 'license', 'coverage', 'timestamp'])(
    'rejects absent %s', key => {
      const record: Record<string, unknown> = { ...models.records[0] }
      delete record[key]
      expect(() => parseProvenance(record)).toThrow()
    })
  it('rejects false fidelity, duplicate IDs, invalid sources and wrong kinds', () => {
    expect(() => parseProvenance({ ...models.records[0], fidelity: 'precise' })).toThrow()
    expect(() => parseProvenance({ ...models.records[0], sources: ['javascript:alert(1)'] })).toThrow()
    expect(() => parseManifest({ ...models, records: [...models.records, ...models.records] }, 'model')).toThrow()
    expect(() => parseManifest(models, 'provider')).toThrow()
  })
})

it('bounds frame history and reports measured rolling statistics', () => {
  const stats = new FrameStatistics()
  for (let i = 0; i < 1000; i++) stats.record(i * 20)
  expect(stats.snapshot()).toEqual({ fps: 50, meanMs: 20, p95Ms: 20, samples: 120 })
})
