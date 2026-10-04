import { describe, expect, it } from 'vitest'
import { SnapshotHistory } from '../src/core/viewHistory'

describe('snapshot history', () => {
  it('moves backward and forward without duplicating entries', () => { const h=new SnapshotHistory<number>(); h.push(1,'one'); h.push(2,'two'); h.push(2,'two'); h.push(3,'three'); expect(h.back()).toBe(2); expect(h.back()).toBe(1); expect(h.back()).toBeNull(); expect(h.forward()).toBe(2) })
  it('drops the forward branch after a new push', () => { const h=new SnapshotHistory<number>(); h.push(1,'one'); h.push(2,'two'); h.push(3,'three'); expect(h.back()).toBe(2); h.push(4,'four'); expect(h.canForward()).toBe(false); expect(h.back()).toBe(2) })
})
