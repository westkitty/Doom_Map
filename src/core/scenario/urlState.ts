import type { ScenarioDefinition } from './types'

export interface ScenarioUrlParams {
  id: string
  name: string
  hazard: string
  lat: number
  lon: number
  alt: number
  seed: number
  start: number
  dur: number
  params: Record<string, number | string | boolean>
}

export function encodeScenarioToHash(scenario: ScenarioDefinition): string {
  const compact: ScenarioUrlParams = {
    id: scenario.id,
    name: scenario.name,
    hazard: scenario.hazardType,
    lat: Number(scenario.origin.latitudeDeg.toFixed(5)),
    lon: Number(scenario.origin.longitudeDeg.toFixed(5)),
    alt: Number(scenario.origin.heightM.toFixed(1)),
    seed: scenario.seed,
    start: scenario.startTimeMs,
    dur: scenario.durationMs,
    params: scenario.parameters
  }
  const json = JSON.stringify(compact)
  return '#' + btoa(encodeURIComponent(json))
}

export function decodeScenarioFromHash(hash: string): Partial<ScenarioDefinition> | null {
  if (!hash || !hash.startsWith('#') || hash.length < 2) return null
  try {
    const base64 = hash.slice(1)
    const json = decodeURIComponent(atob(base64))
    const compact = JSON.parse(json) as ScenarioUrlParams
    return {
      schemaVersion: 1,
      id: compact.id,
      name: compact.name,
      description: `Imported scenario: ${compact.name}`,
      seed: compact.seed,
      createdAt: new Date().toISOString(),
      startTimeMs: compact.start,
      durationMs: compact.dur,
      hazardType: compact.hazard,
      origin: {
        latitudeDeg: compact.lat,
        longitudeDeg: compact.lon,
        heightM: compact.alt
      },
      parameters: compact.params || {},
      chapters: [],
      modelSnapshots: []
    }
  } catch {
    return null
  }
}
