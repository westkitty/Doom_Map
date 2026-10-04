import { describe, expect, it } from 'vitest'
import { parseViewState, serializeViewState, type ShareableViewState } from '../src/core/viewState'

describe('shareable view state', () => {
  const state: ShareableViewState={version:1,camera:[10000000.25,2000000.5,3000000.75],target:[6378137,0,0],up:[0,0,1],qualityMode:'auto',selected:{latitudeDeg:41.8298,longitudeDeg:-86.2542,heightM:0},hudHidden:true}
  it('round-trips a versioned share hash', () => { const parsed=parseViewState(serializeViewState(state)); expect(parsed).not.toBeNull(); expect(parsed?.qualityMode).toBe('auto'); expect(parsed?.hudHidden).toBe(true); expect(parsed?.selected?.latitudeDeg).toBeCloseTo(41.8298,5); expect(parsed?.camera[0]).toBeCloseTo(state.camera[0],2) })
  it('rejects unknown schema versions', () => { expect(parseViewState('#v=99&c=1,2,3&t=4,5,6&u=0,0,1&q=auto')).toBeNull() })
})
