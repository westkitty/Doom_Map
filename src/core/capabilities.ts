export type RuntimeClass = 'full' | 'balanced' | 'constrained' | 'fallback'

export interface RuntimeCapabilityInput {
  webgl2: boolean
  hardwareConcurrency: number
  deviceMemoryGb?: number
  maxTextureSize: number
  reducedMotion: boolean
}

export interface RuntimeCapabilityProfile {
  class: RuntimeClass
  allowHighDetailBuildings: boolean
  allowBackgroundPrefetch: boolean
  workerCount: number
  reasons: string[]
}

export function classifyRuntimeCapabilities(input: RuntimeCapabilityInput): RuntimeCapabilityProfile {
  const cores = Number.isFinite(input.hardwareConcurrency) ? Math.max(1, Math.floor(input.hardwareConcurrency)) : 2
  const memory = input.deviceMemoryGb === undefined || !Number.isFinite(input.deviceMemoryGb) ? null : Math.max(0, input.deviceMemoryGb)
  const reasons: string[] = []

  let runtimeClass: RuntimeClass = 'full'
  if (!input.webgl2 || input.maxTextureSize < 4096) { runtimeClass = 'fallback'; reasons.push('limited graphics capabilities') }
  else if (cores <= 2 || (memory !== null && memory <= 2)) { runtimeClass = 'constrained'; reasons.push('limited CPU or memory') }
  else if (cores <= 4 || (memory !== null && memory <= 4) || input.reducedMotion) { runtimeClass = 'balanced'; reasons.push('moderate runtime budget') }

  return {
    class: runtimeClass,
    allowHighDetailBuildings: runtimeClass === 'full' || runtimeClass === 'balanced',
    allowBackgroundPrefetch: runtimeClass === 'full' && !input.reducedMotion,
    workerCount: runtimeClass === 'fallback' ? 1 : runtimeClass === 'constrained' ? Math.min(2, cores) : Math.min(6, Math.max(2, cores - 1)),
    reasons
  }
}
