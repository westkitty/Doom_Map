import { normalizeLongitudeDeg, type GeodeticPoint } from './coordinates'

interface ParsedToken {
  value: number
  axis: 'lat' | 'lon' | null
}

const TOKEN_PATTERN = /([NSEW]?\s*[+-]?\d+(?:\.\d+)?\s*[NSEW]?)/gi

function parseToken(raw: string): ParsedToken | null {
  const compact = raw.trim().toUpperCase().replace(/\s+/g, '')
  if (!compact) return null

  const direction = compact.match(/[NSEW]/)?.[0] ?? null
  const numericText = compact.replace(/[NSEW]/g, '')
  const numeric = Number(numericText)
  if (!Number.isFinite(numeric)) return null

  const magnitude = Math.abs(numeric)
  const value = direction === 'S' || direction === 'W'
    ? -magnitude
    : direction === 'N' || direction === 'E'
      ? magnitude
      : numeric

  return {
    value,
    axis: direction === 'N' || direction === 'S'
      ? 'lat'
      : direction === 'E' || direction === 'W'
        ? 'lon'
        : null
  }
}

export function parseCoordinateInput(input: string): GeodeticPoint | null {
  const matches = input.match(TOKEN_PATTERN)
  if (!matches || matches.length !== 2) return null

  const first = parseToken(matches[0] ?? '')
  const second = parseToken(matches[1] ?? '')
  if (!first || !second) return null

  let latitude: number
  let longitude: number

  if (first.axis === 'lon' && second.axis === 'lat') {
    latitude = second.value
    longitude = first.value
  } else if (first.axis === 'lat' && second.axis === 'lon') {
    latitude = first.value
    longitude = second.value
  } else if (first.axis === null && second.axis === null) {
    latitude = first.value
    longitude = second.value
  } else if (first.axis === 'lat' && second.axis === null) {
    latitude = first.value
    longitude = second.value
  } else if (first.axis === null && second.axis === 'lon') {
    latitude = first.value
    longitude = second.value
  } else {
    return null
  }

  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null

  return {
    latitudeDeg: latitude,
    longitudeDeg: normalizeLongitudeDeg(longitude),
    heightM: 0
  }
}
