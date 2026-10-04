import { describe, expect, it } from 'vitest'
import { validateScenarioEnvelope } from '../src/core/scenario'

describe('scenario envelope', () => {
  it('accepts a deterministic versioned scenario shell', () => { expect(validateScenarioEnvelope({ schemaVersion:1,id:'demo',seed:42,hazardType:'earthquake',startTime:'2026-10-03T20:00:00Z',modelVersions:{quake:'1.0.0'},providerSnapshots:[{providerId:'terrain',health:'healthy',datasetVersion:'2026-09'}],parameters:{} })).toEqual([]) })
  it('rejects duplicate provider snapshots and invalid identity fields', () => { const issues=validateScenarioEnvelope({ schemaVersion:1,id:'',seed:-1,hazardType:'',startTime:'not-a-date',modelVersions:{'':''},providerSnapshots:[{providerId:'terrain',health:'healthy'},{providerId:'terrain',health:'degraded'}],parameters:{} }); expect(issues.length).toBeGreaterThanOrEqual(5) })
})
