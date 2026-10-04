import { describe, expect, it } from 'vitest'
import { AutoQualityGovernor } from '../src/core/autoQuality'
describe('automatic quality governor', () => {
  it('degrades after sustained slow frames', () => { const g = new AutoQualityGovernor({ badWindows: 3, cooldownMs: 0 }); expect(g.observe(30,'high',1)).toBeNull(); expect(g.observe(30,'high',2)).toBeNull(); expect(g.observe(30,'high',3)).toBe('balanced') })
  it('upgrades only after sustained fast frames and respects the ceiling', () => { const g = new AutoQualityGovernor({ goodWindows: 2, cooldownMs: 0 }); expect(g.observe(10,'low',1,'balanced')).toBeNull(); expect(g.observe(10,'low',2,'balanced')).toBe('balanced'); expect(g.observe(10,'balanced',3,'balanced')).toBeNull(); expect(g.observe(10,'balanced',4,'balanced')).toBeNull() })
})
