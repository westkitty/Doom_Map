import { describe, expect, it } from 'vitest'
import { WGS84 } from '../src/core/coordinates'
import { intersectWgs84Ellipsoid, localBasisAtGeodetic, wgs84SurfaceNormal } from '../src/core/ellipsoid'
describe('WGS84 ellipsoid helpers', () => {
  it('intersects a radial ray with the equator', () => { const hit=intersectWgs84Ellipsoid({x:WGS84.semiMajorAxis*2,y:0,z:0},{x:-1,y:0,z:0}); expect(hit).not.toBeNull(); expect(hit?.x).toBeCloseTo(WGS84.semiMajorAxis,5); expect(hit?.y).toBeCloseTo(0,5); expect(hit?.z).toBeCloseTo(0,5) })
  it('returns null when a ray misses Earth', () => { expect(intersectWgs84Ellipsoid({x:WGS84.semiMajorAxis*2,y:0,z:0},{x:0,y:1,z:0})).toBeNull() })
  it('produces the expected surface normal at the north pole', () => { const n=wgs84SurfaceNormal({x:0,y:0,z:WGS84.semiMinorAxis}); expect(n.x).toBeCloseTo(0,8); expect(n.y).toBeCloseTo(0,8); expect(n.z).toBeCloseTo(1,8) })
  it('builds an orthogonal ENU basis', () => { const b=localBasisAtGeodetic({latitudeDeg:41.8298,longitudeDeg:-86.2542,heightM:0}); const dot=(a:typeof b.east,c:typeof b.east)=>a.x*c.x+a.y*c.y+a.z*c.z; expect(dot(b.east,b.north)).toBeCloseTo(0,10); expect(dot(b.east,b.up)).toBeCloseTo(0,10); expect(dot(b.north,b.up)).toBeCloseTo(0,10) })
})
