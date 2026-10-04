import type { HazardManifest } from './manifest'

export interface ParameterValidationResult {
  values: Record<string, number | string>
  issues: string[]
}

export function normalizeHazardParameters(manifest: HazardManifest, input: Readonly<Record<string, unknown>>): ParameterValidationResult {
  const values: Record<string, number | string> = {}
  const issues: string[] = []

  for (const [name, spec] of Object.entries(manifest.parameters)) {
    const raw = input[name]
    if (spec.type === 'number') {
      const value = raw === undefined ? spec.default : raw
      if (typeof value !== 'number' || !Number.isFinite(value)) {
        issues.push(`${name} must be a finite number`)
        continue
      }
      if (value < spec.min || value > spec.max) {
        issues.push(`${name} must be between ${spec.min} and ${spec.max}`)
        continue
      }
      values[name] = value
      continue
    }

    const value = raw === undefined ? spec.default : raw
    if (typeof value !== 'string' || !spec.values.includes(value)) {
      issues.push(`${name} must be one of: ${spec.values.join(', ')}`)
      continue
    }
    values[name] = value
  }

  for (const key of Object.keys(input)) {
    if (!(key in manifest.parameters)) issues.push(`unknown parameter: ${key}`)
  }

  return { values, issues }
}
