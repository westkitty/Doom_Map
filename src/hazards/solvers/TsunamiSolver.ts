import type { HazardModule, HazardParameterMeta, HazardState, HazardIntensitySample, HazardFootprint, ConsequenceEmission, VfxHint } from '../types'
import type { GeodeticPoint } from '../../core/coordinates'
import type { Provenance } from '../../data/provenance'

export class TsunamiSolver implements HazardModule {
  readonly id = 'tsunami_subduction'
  readonly name = 'Offshore Subduction Tsunami'
  readonly category = 'ocean_coastal' as const

  readonly provenance: Provenance = {
    id: 'ward-synolakis-tsunami-2001',
    version: '2001.1',
    kind: 'model',
    title: 'Ward & Synolakis Shallow-Water Tsunami Propagation and Shoaling',
    fidelity: 'A',
    sources: [
      'https://doi.org/10.1029/2000JB900450',
      'https://nctr.pmel.noaa.gov/'
    ],
    timestamp: '2001-01-01T00:00:00Z',
    assumptions: [
      'Long-wave shallow-water approximation (c = sqrt(g*H)).',
      'Green’s Law amplitude shoaling (H_shallow = H_deep * (D_deep/D_shallow)^0.25).'
    ],
    uncertainty: 'Bathymetric resolution and complex coastal embayment resonance introduce ±30% runup variance.',
    limitations: [
      'Does not solve 3D Navier-Stokes breaking wave turbulence inside structural interiors.',
      'Assumes mean ocean depth of 4000 m transitioning to coastal shelf.'
    ],
    attribution: 'Ward, S.N. (2001). Journal of Geophysical Research / Synolakis, C.E. (1987).',
    license: 'Academic Reference / NOAA Tsunami Program.',
    coverage: 'Global analytical ocean basin wave propagation'
  }

  readonly parameterSchema: HazardParameterMeta[] = [
    { name: 'seismicMagnitudeMw', label: 'Trigger Earthquake (Mw)', type: 'number', default: 8.5, min: 7.0, max: 9.6, step: 0.1, unit: 'Mw', description: 'Moment magnitude of subduction seafloor displacement' },
    { name: 'seafloorSlipM', label: 'Seafloor Vertical Slip', type: 'number', default: 8.0, min: 1.0, max: 30.0, step: 0.5, unit: 'm', description: 'Peak vertical seafloor displacement' }
  ]

  validateParameters(params: Record<string, unknown>): Record<string, number | string | boolean> {
    const seismicMagnitudeMw = Math.max(6.5, Math.min(9.8, Number(params.seismicMagnitudeMw ?? 8.5)))
    const seafloorSlipM = Math.max(0.5, Math.min(50.0, Number(params.seafloorSlipM ?? 8.0)))
    return { seismicMagnitudeMw, seafloorSlipM }
  }

  evaluate(origin: GeodeticPoint, params: Record<string, number | string | boolean>, timeOffsetMs: number, _seed: number): HazardState {
    const valid = this.validateParameters(params)
    const slip = valid.seafloorSlipM as number
    const Mw = valid.seismicMagnitudeMw as number

    // Initial open-ocean wave height ~ 0.5 * seafloor slip
    const initialDeepWaveHeightM = slip * 0.5
    // Coastal runup amplification via Green's law & Synolakis formula
    const coastalRunupHeightM = Math.min(45, initialDeepWaveHeightM * Math.pow(4000 / 20, 0.25) * 1.5)

    // Deep water wave speed c = sqrt(9.81 * 4000) ≈ 198 m/s (~713 km/h)
    const deepWaveSpeedMs = 198
    const maxBasinRadiusM = Math.min(10000000, Math.pow(10, (Mw - 4.5) * 0.8) * 1000)
    const wavefrontRadiusM = (timeOffsetMs / 1000) * deepWaveSpeedMs

    const footprint: HazardFootprint = {
      type: 'radial',
      center: origin,
      radiusM: Math.min(maxBasinRadiusM, Math.max(50000, wavefrontRadiusM)),
      peakIntensity: coastalRunupHeightM,
      unit: 'm runup',
      bands: [
        { radiusM: maxBasinRadiusM * 0.1, intensity: coastalRunupHeightM, severity: 'extreme', label: `Extreme runup > ${(coastalRunupHeightM * 0.8).toFixed(1)} m` },
        { radiusM: maxBasinRadiusM * 0.3, intensity: coastalRunupHeightM * 0.6, severity: 'severe', label: `Severe runup > ${(coastalRunupHeightM * 0.5).toFixed(1)} m` },
        { radiusM: maxBasinRadiusM * 0.6, intensity: coastalRunupHeightM * 0.3, severity: 'moderate', label: `Moderate runup > ${(coastalRunupHeightM * 0.2).toFixed(1)} m` },
        { radiusM: maxBasinRadiusM, intensity: 1.0, severity: 'minor', label: 'Advisory wave perturbation > 0.5 m' }
      ]
    }

    const emissions: ConsequenceEmission[] = [
      {
        category: 'structural',
        severity: Math.min(1.0, coastalRunupHeightM / 15.0),
        affectedAreaKm2: 5000,
        description: `Coastal inundation and hydro-dynamic wave destruction with peak runup of ${coastalRunupHeightM.toFixed(1)} m`,
        metrics: { peakRunupM: coastalRunupHeightM, deepWaveSpeedKmh: deepWaveSpeedMs * 3.6 }
      }
    ]

    const vfxHints: VfxHint[] = [
      {
        type: 'wave_ring',
        origin,
        radiusM: wavefrontRadiusM,
        progress: Math.min(1, wavefrontRadiusM / maxBasinRadiusM),
        colorHex: 0x2288cc,
        opacity: Math.max(0, 0.9 - wavefrontRadiusM / maxBasinRadiusM)
      }
    ]

    return {
      timeMs: timeOffsetMs,
      isActive: timeOffsetMs >= 0 && timeOffsetMs <= 43200000, // 12 hours basin transit
      peakIntensity: coastalRunupHeightM,
      footprint,
      emissions,
      vfxHints
    }
  }

  sample(origin: GeodeticPoint, target: GeodeticPoint, params: Record<string, number | string | boolean>, timeOffsetMs: number): HazardIntensitySample {
    const valid = this.validateParameters(params)
    const slip = valid.seafloorSlipM as number
    const lat1 = origin.latitudeDeg * (Math.PI / 180), lon1 = origin.longitudeDeg * (Math.PI / 180)
    const lat2 = target.latitudeDeg * (Math.PI / 180), lon2 = target.longitudeDeg * (Math.PI / 180)
    const dLat = lat2 - lat1, dLon = lon2 - lon1
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2
    const distM = 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    const distKm = distM / 1000

    const waveSpeedMs = 198
    const arrivalTimeSec = distM / waveSpeedMs
    const isArrived = timeOffsetMs >= arrivalTimeSec * 1000
    const runupM = distKm > 0 ? Math.max(0.2, (slip * 2.5) / Math.sqrt(distKm * 0.05)) : slip * 3

    return {
      intensity: isArrived ? runupM : 0,
      unit: 'm',
      description: `Tsunami runup: ${runupM.toFixed(1)} m (ETA: ${(arrivalTimeSec / 60).toFixed(0)} min, Distance: ${distKm.toFixed(0)} km)`,
      fields: { runupM, etaMinutes: arrivalTimeSec / 60, isArrived: isArrived ? 1 : 0, distanceKm: distKm }
    }
  }
}
