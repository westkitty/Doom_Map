import type { Cartesian3 } from '../core/coordinates'

function subtract(a: Cartesian3, b: Cartesian3): Cartesian3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z }
}

function add(a: Cartesian3, b: Cartesian3): Cartesian3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z }
}

export class FloatingOrigin {
  private anchor: Cartesian3

  constructor(initialAnchor: Cartesian3 = { x: 0, y: 0, z: 0 }, private readonly rebaseDistanceM = 25_000) {
    if (!Number.isFinite(rebaseDistanceM) || rebaseDistanceM <= 0) throw new RangeError('Rebase distance must be positive.')
    this.anchor = { ...initialAnchor }
  }

  toLocal(authoritativeEcef: Cartesian3): Cartesian3 { return subtract(authoritativeEcef, this.anchor) }
  toEcef(local: Cartesian3): Cartesian3 { return add(local, this.anchor) }
  getAnchor(): Cartesian3 { return { ...this.anchor } }

  maybeRebase(focusEcef: Cartesian3): { rebased: boolean; delta: Cartesian3 } {
    const delta = subtract(focusEcef, this.anchor)
    if (Math.hypot(delta.x, delta.y, delta.z) < this.rebaseDistanceM) return { rebased: false, delta: { x: 0, y: 0, z: 0 } }
    this.anchor = { ...focusEcef }
    return { rebased: true, delta }
  }
}
