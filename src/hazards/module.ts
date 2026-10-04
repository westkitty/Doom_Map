import type { HazardManifest } from './manifest'
import type { SeededRandom } from '../sim/random'

export interface HazardEmission<T = unknown> {
  id: string
  parentIds: readonly string[]
  type: string
  timeMs: number
  severity: number
  confidence: number
  payload: T
}

export interface HazardInitializeContext {
  scenarioId: string
  startTimeMs: number
  seed: number
}

export interface HazardAdvanceContext<E = unknown> {
  timeMs: number
  deltaMs: number
  random: SeededRandom
  events: readonly E[]
}

export interface HazardAdvanceResult<S, T = unknown> {
  state: S
  emissions: readonly HazardEmission<T>[]
}

export interface HazardModule<S = unknown, P extends Record<string, unknown> = Record<string, unknown>, E = unknown> {
  readonly manifest: HazardManifest
  readonly modelVersion: string
  initialize(parameters: P, context: HazardInitializeContext): S
  advance(state: S, context: HazardAdvanceContext<E>): HazardAdvanceResult<S>
  sample?(state: S, latitudeDeg: number, longitudeDeg: number): Record<string, number>
}
