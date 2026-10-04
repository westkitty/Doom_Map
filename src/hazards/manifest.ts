import type { FidelityClass } from '../core/provenance'

export type HazardCategory =
  | 'explosive-impact-radiological'
  | 'seismic-crustal'
  | 'ocean-coastal'
  | 'volcanic-geothermal'
  | 'weather-atmospheric'
  | 'fire-smoke-heat'
  | 'cryosphere-mountain'
  | 'infrastructure-technological'
  | 'space-weather'
  | 'biological-ecological'
  | 'compound-cascading'

export type HazardImplementationState = 'catalogued' | 'stub' | 'modelled' | 'validated'

export interface NumericParameterSpec {
  type: 'number'
  min: number
  max: number
  default: number
  unit?: string
}

export interface EnumParameterSpec {
  type: 'enum'
  values: readonly string[]
  default: string
}

export type HazardParameterSpec = NumericParameterSpec | EnumParameterSpec

export interface HazardManifest {
  id: string
  label: string
  category: HazardCategory
  fidelity: FidelityClass
  implementationState: HazardImplementationState
  parameters: Readonly<Record<string, HazardParameterSpec>>
  consequenceTypes: readonly string[]
  limitations: readonly string[]
  flagship?: boolean
}

export function validateHazardManifest(manifest: HazardManifest): string[] {
  const issues: string[] = []
  if (!/^[a-z0-9]+(?:_[a-z0-9]+)*$/.test(manifest.id)) issues.push('hazard id must be stable snake_case')
  if (!manifest.label.trim()) issues.push('hazard label is required')
  if (manifest.limitations.length === 0) issues.push('at least one limitation is required')
  for (const [name, parameter] of Object.entries(manifest.parameters)) {
    if (!name.trim()) issues.push('parameter name is required')
    if (parameter.type === 'number') {
      if (![parameter.min, parameter.max, parameter.default].every(Number.isFinite)) issues.push(`parameter ${name} bounds/default must be finite`)
      if (parameter.max < parameter.min) issues.push(`parameter ${name} max must be >= min`)
      if (parameter.default < parameter.min || parameter.default > parameter.max) issues.push(`parameter ${name} default must be within bounds`)
    } else {
      if (parameter.values.length === 0) issues.push(`parameter ${name} enum needs values`)
      if (!parameter.values.includes(parameter.default)) issues.push(`parameter ${name} default must be one of its values`)
    }
  }
  return issues
}
