import type { GeodeticPoint } from '../core/coordinates'
import type { Provenance } from '../data/provenance'

export type HazardCategory =
  | 'explosive_impact'
  | 'seismic'
  | 'ocean_coastal'
  | 'volcanic'
  | 'atmospheric'
  | 'hydrological_wildfire'
  | 'infrastructure_industrial'
  | 'space_compound'

export interface HazardParameterMeta {
  name: string
  label: string
  type: 'number' | 'string' | 'boolean' | 'select'
  default: number | string | boolean
  min?: number
  max?: number
  step?: number
  unit?: string
  options?: { value: string; label: string }[]
  description: string
}

export interface HazardIntensitySample {
  intensity: number
  unit: string
  description: string
  fields: Record<string, number>
}

export interface HazardFootprintBand {
  radiusM: number
  intensity: number
  severity: 'extreme' | 'severe' | 'moderate' | 'minor'
  label: string
}

export interface HazardFootprint {
  type: 'radial' | 'elliptical' | 'corridor' | 'polygon'
  center: GeodeticPoint
  radiusM: number
  semiMajorM?: number
  semiMinorM?: number
  azimuthDeg?: number
  peakIntensity: number
  unit: string
  bands: HazardFootprintBand[]
}

export interface ConsequenceEmission {
  category: 'structural' | 'casualties' | 'infrastructure' | 'economic' | 'ecological'
  severity: number // 0.0 - 1.0
  affectedAreaKm2: number
  description: string
  metrics: Record<string, number>
}

export interface VfxHint {
  type: 'shockwave' | 'fireball' | 'plume' | 'wave_ring' | 'vortex' | 'fire_front' | 'crater' | 'debris'
  origin: GeodeticPoint
  radiusM: number
  heightM?: number
  azimuthDeg?: number
  progress: number // 0.0 - 1.0
  colorHex: number
  opacity: number
}

export interface HazardState {
  timeMs: number
  isActive: boolean
  peakIntensity: number
  footprint: HazardFootprint
  emissions: ConsequenceEmission[]
  vfxHints: VfxHint[]
}

export interface HazardModule {
  readonly id: string
  readonly name: string
  readonly category: HazardCategory
  readonly provenance: Provenance
  readonly parameterSchema: HazardParameterMeta[]

  validateParameters(params: Record<string, unknown>): Record<string, number | string | boolean>
  evaluate(origin: GeodeticPoint, params: Record<string, number | string | boolean>, timeOffsetMs: number, seed: number): HazardState
  sample(origin: GeodeticPoint, target: GeodeticPoint, params: Record<string, number | string | boolean>, timeOffsetMs: number): HazardIntensitySample
}
