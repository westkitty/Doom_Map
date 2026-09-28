import { expect, it } from 'vitest'
import { WGS84, geodeticToEcef, ecefToGeodetic, enuFrame, enuToEcef, ecefToEnu, toRenderRelative, intersectEllipsoid } from '../src/core/coordinates'

it('round trips surface, poles, antimeridian, negative and orbital heights', () => {
  for (const latitudeDeg of [-90, -89.999, -45, 0, 45, 89.999, 90]) {
    for (const longitudeDeg of [-180, -90, 0, 90, 180]) {
      for (const heightM of [-300, 0, 20, 1e7, 5e7]) {
        const p = { latitudeDeg, longitudeDeg, heightM }
        const result = ecefToGeodetic(geodeticToEcef(p))
        expect(result.latitudeDeg).toBeCloseTo(latitudeDeg, 8)
        expect(result.heightM).toBeCloseTo(heightM, 5)
        if (Math.abs(latitudeDeg) < 90) expect(result.longitudeDeg).toBeCloseTo(longitudeDeg, 8)
      }
    }
  }
})

it('ENU axes at equator are east +Y, north +Z, up +X', () => {
  const frame = enuFrame({ latitudeDeg: 0, longitudeDeg: 0, heightM: 0 })
  expect(enuToEcef({ eastM: 1, northM: 2, upM: 3 }, frame)).toEqual({ x: WGS84.semiMajorAxis + 3, y: 1, z: 2 })
})

it('round trips millimeter local offsets at difficult anchors', () => {
  for (const latitudeDeg of [-90, 0, 41.8298, 90]) {
    const frame = enuFrame({ latitudeDeg, longitudeDeg: 180, heightM: 1000 })
    const offset = { eastM: 0.001, northM: -123.456, upM: 32.789 }
    const ecef = enuToEcef(offset, frame)
    const result = ecefToEnu(ecef, frame)
    for (const key of ['eastM', 'northM', 'upM'] as const) expect(result[key]).toBeCloseTo(offset[key], 7)
    const relative = toRenderRelative(ecef, frame.origin)
    expect(Math.abs(relative.x)).toBeLessThan(200)
  }
})

it('picks the authoritative ellipsoid and rejects rays into space', () => {
  const a = WGS84.semiMajorAxis
  expect(intersectEllipsoid({ x: a * 2, y: 0, z: 0 }, { x: -1, y: 0, z: 0 })?.x).toBeCloseTo(a, 6)
  expect(intersectEllipsoid({ x: a * 2, y: 0, z: 0 }, { x: 1, y: 0, z: 0 })).toBeNull()
  expect(intersectEllipsoid({ x: a * 2, y: 0, z: 0 }, { x: 0, y: 0, z: 0 })).toBeNull()
  expect(intersectEllipsoid({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 1 })?.z).toBeCloseTo(WGS84.semiMinorAxis, 6)
})
