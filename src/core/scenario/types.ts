import type { GeodeticPoint } from '../coordinates'

export interface ChapterMarker {
  timeOffsetMs: number
  label: string
  description: string
}

export interface ScenarioDefinition {
  schemaVersion: 1
  id: string
  name: string
  description: string
  seed: number
  createdAt: string
  startTimeMs: number
  durationMs: number
  hazardType: string
  origin: GeodeticPoint
  parameters: Record<string, number | string | boolean>
  chapters: ChapterMarker[]
  modelSnapshots: { id: string; version: string; fidelity: string }[]
}

export function parseScenario(value: unknown): ScenarioDefinition {
  if (!value || typeof value !== 'object') throw new Error('Scenario must be an object')
  const s = value as Partial<ScenarioDefinition>
  if (s.schemaVersion !== 1) throw new Error('Unsupported scenario schemaVersion')
  if (typeof s.id !== 'string' || !/^[a-z0-9-_]+$/i.test(s.id)) throw new Error('Invalid scenario ID')
  if (typeof s.name !== 'string' || s.name.trim().length === 0) throw new Error('Scenario name is required')
  if (typeof s.seed !== 'number' || !Number.isInteger(s.seed)) throw new Error('Scenario seed must be an integer')
  if (typeof s.startTimeMs !== 'number' || !Number.isFinite(s.startTimeMs)) throw new Error('Invalid startTimeMs')
  if (typeof s.durationMs !== 'number' || s.durationMs <= 0) throw new Error('Scenario duration must be positive')
  if (typeof s.hazardType !== 'string' || s.hazardType.trim().length === 0) throw new Error('hazardType is required')
  if (!s.origin || typeof s.origin.latitudeDeg !== 'number' || typeof s.origin.longitudeDeg !== 'number') {
    throw new Error('Valid origin GeodeticPoint is required')
  }
  if (!Array.isArray(s.chapters)) throw new Error('Chapters must be an array')
  if (!s.parameters || typeof s.parameters !== 'object') throw new Error('Parameters must be an object')
  return s as ScenarioDefinition
}
