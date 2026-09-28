import { describe, expect, it } from 'vitest'
import { WGS84, ecefToGeodetic, geodeticToEcef } from '../src/core/coordinates'

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
})
