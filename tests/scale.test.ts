import { describe, expect, it } from 'vitest'
import { chooseScaleBar } from '../src/core/scale'

describe('scale bar', () => {
  it('selects a readable 1/2/5 scale distance', () => { const value = chooseScaleBar(100,120); expect(value).not.toBeNull(); expect(value?.meters).toBe(10_000); expect(value?.widthPx).toBe(100); expect(value?.label).toBe('10 km') })
  it('rejects invalid screen scale values', () => { expect(chooseScaleBar(0)).toBeNull(); expect(chooseScaleBar(Number.NaN)).toBeNull() })
})
