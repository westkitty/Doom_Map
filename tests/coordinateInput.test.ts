import { describe, expect, it } from 'vitest'
import { parseCoordinateInput } from '../src/core/coordinateInput'
describe('coordinate input parser', () => {
  it('parses signed decimal latitude and longitude', () => { expect(parseCoordinateInput('41.8298, -86.2542')).toEqual({ latitudeDeg:41.8298, longitudeDeg:-86.2542, heightM:0 }) })
  it('parses cardinal-direction coordinates', () => { expect(parseCoordinateInput('41.8298 N 86.2542 W')).toEqual({ latitudeDeg:41.8298, longitudeDeg:-86.2542, heightM:0 }) })
  it('accepts longitude-first directional input', () => { expect(parseCoordinateInput('86.2542 W, 41.8298 N')).toEqual({ latitudeDeg:41.8298, longitudeDeg:-86.2542, heightM:0 }) })
  it('rejects coordinates outside valid ranges', () => { expect(parseCoordinateInput('95, 10')).toBeNull(); expect(parseCoordinateInput('40, 200')).toBeNull() })
})
