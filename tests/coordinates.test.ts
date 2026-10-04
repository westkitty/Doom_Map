import { describe, expect, it } from 'vitest'
import {
  WGS84,
  ecefToEnu,
  ecefToGeodetic,
  enuToEcef,
  geodeticToEcef,
  normalizeLongitudeDeg
} from '../src/core/coordinates'

describe('WGS84 coordinate conversions', () => {
  it('maps the equator and prime meridian to the semi-major axis', () => {
    const value = geodeticToEcef({ latitudeDeg: 0, longitudeDeg: 0, heightM: 0 })
    expect(value.x).toBeCloseTo(WGS84.semiMajorAxis, 5)
    expect(value.y).toBeCloseTo(0, 5)
    expect(value.z).toBeCloseTo(0, 5)
  })
  it('round-trips a representative location', () => {
    const source = { latitudeDeg: 41.8298, longitudeDeg: -86.2542, heightM: 210 }
    const roundTrip = ecefToGeodetic(geodeticToEcef(source))
    expect(roundTrip.latitudeDeg).toBeCloseTo(source.latitudeDeg, 7)
    expect(roundTrip.longitudeDeg).toBeCloseTo(source.longitudeDeg, 7)
    expect(roundTrip.heightM).toBeCloseTo(source.heightM, 3)
  })
  it('handles the north pole', () => {
    const source = { latitudeDeg: 90, longitudeDeg: 0, heightM: 0 }
    const roundTrip = ecefToGeodetic(geodeticToEcef(source))
    expect(roundTrip.latitudeDeg).toBeCloseTo(90, 7)
    expect(roundTrip.heightM).toBeCloseTo(0, 3)
  })
  it('normalizes longitudes without changing the represented meridian', () => {
    expect(normalizeLongitudeDeg(181)).toBeCloseTo(-179, 10)
    expect(normalizeLongitudeDeg(-181)).toBeCloseTo(179, 10)
    expect(normalizeLongitudeDeg(540)).toBeCloseTo(-180, 10)
  })
  it('round-trips local ENU coordinates around a WGS84 origin', () => {
    const origin = { latitudeDeg: 41.8298, longitudeDeg: -86.2542, heightM: 210 }
    const local = { eastM: 1250, northM: -820, upM: 46 }
    const recovered = ecefToEnu(enuToEcef(local, origin), origin)
    expect(recovered.eastM).toBeCloseTo(local.eastM, 6)
    expect(recovered.northM).toBeCloseTo(local.northM, 6)
    expect(recovered.upM).toBeCloseTo(local.upM, 6)
  })
  it('rejects invalid latitude instead of silently corrupting the transform', () => {
    expect(() => geodeticToEcef({ latitudeDeg: 91, longitudeDeg: 0, heightM: 0 })).toThrow(RangeError)
  })
  it('rejects the Earth center because it has no unique geodetic solution', () => {
    expect(() => ecefToGeodetic({ x: 0, y: 0, z: 0 })).toThrow(RangeError)
  })
})
