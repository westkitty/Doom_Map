export type QualityTier = 'high' | 'balanced' | 'low' | 'safe'

export interface QualityProfile {
  maxDpr: number
  globeWidthSegments: number
  globeHeightSegments: number
  atmosphereWidthSegments: number
  atmosphereHeightSegments: number
  gridStepDeg: number
  gridSampleDeg: number
  gridOpacity: number
}

export interface QualityEnvironment {
  devicePixelRatio: number
  hardwareConcurrency: number
  reducedMotion: boolean
}

export const QUALITY_PROFILES: Readonly<Record<QualityTier, QualityProfile>> = Object.freeze({
  high: Object.freeze({
    maxDpr: 2,
    globeWidthSegments: 160,
    globeHeightSegments: 80,
    atmosphereWidthSegments: 128,
    atmosphereHeightSegments: 64,
    gridStepDeg: 10,
    gridSampleDeg: 2,
    gridOpacity: 0.16
  }),
  balanced: Object.freeze({
    maxDpr: 1.75,
    globeWidthSegments: 128,
    globeHeightSegments: 64,
    atmosphereWidthSegments: 96,
    atmosphereHeightSegments: 48,
    gridStepDeg: 15,
    gridSampleDeg: 3,
    gridOpacity: 0.14
  }),
  low: Object.freeze({
    maxDpr: 1.35,
    globeWidthSegments: 96,
    globeHeightSegments: 48,
    atmosphereWidthSegments: 64,
    atmosphereHeightSegments: 32,
    gridStepDeg: 30,
    gridSampleDeg: 4,
    gridOpacity: 0.11
  }),
  safe: Object.freeze({
    maxDpr: 1,
    globeWidthSegments: 64,
    globeHeightSegments: 32,
    atmosphereWidthSegments: 48,
    atmosphereHeightSegments: 24,
    gridStepDeg: 30,
    gridSampleDeg: 6,
    gridOpacity: 0.08
  })
})

export function chooseInitialQuality(environment: QualityEnvironment): QualityTier {
  const cores = Number.isFinite(environment.hardwareConcurrency)
    ? Math.max(1, environment.hardwareConcurrency)
    : 4

  if (environment.reducedMotion || cores <= 2) return 'safe'
  if (cores <= 4) return 'low'
  if (cores >= 8 && environment.devicePixelRatio <= 2.25) return 'high'
  return 'balanced'
}
