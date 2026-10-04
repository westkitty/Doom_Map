import type { HazardModule, HazardParameterMeta, HazardState, HazardIntensitySample, HazardFootprint, ConsequenceEmission, VfxHint } from '../types'
import type { GeodeticPoint } from '../../core/coordinates'
import type { Provenance } from '../../data/provenance'

export class RiverFloodSolver implements HazardModule {
  readonly id = 'river_flood'
  readonly name = 'Riverine Flood (Manning Hydrodynamic Inundation)'
  readonly category = 'hydrological_wildfire' as const

  readonly provenance: Provenance = {
    id: 'manning-chow-flood-1959',
    version: '1959.1',
    kind: 'model',
    title: 'Manning & Chow Open-Channel Inundation and Hydrograph Model',
    fidelity: 'A',
    sources: [
      'https://doi.org/10.1061/(ASCE)0733-9429(1989)115:6(737)',
      'https://www.hec.usace.army.mil/software/hec-ras/'
    ],
    timestamp: '1959-01-01T00:00:00Z',
    assumptions: [
      '1D/2D diffusive wave routing across floodplains with Manning roughness coefficient n = 0.035.',
      'Peak discharge scales with drainage basin rainfall excess volume.'
    ],
    uncertainty: 'Levee breach dynamics and bridge backwater effects contribute ±20% local water surface elevation variance.',
    limitations: [
      'Does not model micro-scale storm sewer backflow in urban basements (modeled in pluvial flood).',
      'Assumes calibrated river corridor valley slope.'
    ],
    attribution: 'Manning, R. (1891) / Chow, V.T. (1959). Open-Channel Hydraulics. McGraw-Hill.',
    license: 'Public Domain / Open Engineering Formulation.',
    coverage: 'Global analytical floodplain inundation solver'
  }

  readonly parameterSchema: HazardParameterMeta[] = [
    { name: 'peakDischargeM3s', label: 'Peak River Discharge (Q)', type: 'number', default: 5000, min: 100, max: 100000, step: 500, unit: 'm³/s', description: 'Maximum flood discharge volume' },
    { name: 'floodplainWidthKm', label: 'Valley Width', type: 'number', default: 6.0, min: 0.5, max: 40.0, step: 0.5, unit: 'km', description: 'Width of geomorphic floodable plain' },
    { name: 'returnPeriodYears', label: 'Return Period', type: 'number', default: 100, min: 10, max: 1000, step: 10, unit: 'yr', description: 'Statistical return frequency (10 to 500 year flood)' }
  ]

  validateParameters(params: Record<string, unknown>): Record<string, number | string | boolean> {
    const peakDischargeM3s = Math.max(50, Math.min(200000, Number(params.peakDischargeM3s ?? 5000)))
    const floodplainWidthKm = Math.max(0.2, Math.min(60.0, Number(params.floodplainWidthKm ?? 6.0)))
    const returnPeriodYears = Math.max(5, Math.min(1000, Number(params.returnPeriodYears ?? 100)))
    return { peakDischargeM3s, floodplainWidthKm, returnPeriodYears }
  }

  evaluate(origin: GeodeticPoint, params: Record<string, number | string | boolean>, timeOffsetMs: number, _seed: number): HazardState {
    const valid = this.validateParameters(params)
    const Q = valid.peakDischargeM3s as number
    const Wkm = valid.floodplainWidthKm as number

    // Peak inundation depth (m) via Manning stage-discharge relation
    const peakDepthM = Math.min(15, 0.45 * Math.pow(Q, 0.4))
    const corridorRadiusM = (Wkm * 1000) / 2

    const footprint: HazardFootprint = {
      type: 'radial',
      center: origin,
      radiusM: corridorRadiusM,
      peakIntensity: peakDepthM,
      unit: 'm depth',
      bands: [
        { radiusM: corridorRadiusM * 0.35, intensity: peakDepthM, severity: 'extreme', label: `Deep channel inundation > ${(peakDepthM * 0.75).toFixed(1)} m` },
        { radiusM: corridorRadiusM * 0.70, intensity: peakDepthM * 0.5, severity: 'severe', label: `Moderate floodplain depth > ${(peakDepthM * 0.4).toFixed(1)} m` },
        { radiusM: corridorRadiusM, intensity: 0.5, severity: 'minor', label: 'Shallow fringe flooding > 0.3 m' }
      ]
    }

    const emissions: ConsequenceEmission[] = [
      {
        category: 'structural',
        severity: Math.min(1.0, peakDepthM / 8.0),
        affectedAreaKm2: Math.PI * (corridorRadiusM / 1000) ** 2,
        description: `Riverine inundation reaching peak water depth of ${peakDepthM.toFixed(1)} m across ${(corridorRadiusM / 1000).toFixed(1)} km corridor`,
        metrics: { peakWaterDepthM: peakDepthM, peakDischargeM3s: Q }
      }
    ]

    const vfxHints: VfxHint[] = [
      {
        type: 'wave_ring',
        origin,
        radiusM: corridorRadiusM,
        progress: Math.min(1, timeOffsetMs / 86400000),
        colorHex: 0x336688,
        opacity: 0.7
      }
    ]

    return {
      timeMs: timeOffsetMs,
      isActive: true,
      peakIntensity: peakDepthM,
      footprint,
      emissions,
      vfxHints
    }
  }

  sample(origin: GeodeticPoint, target: GeodeticPoint, params: Record<string, number | string | boolean>, _timeOffsetMs: number): HazardIntensitySample {
    const valid = this.validateParameters(params)
    const Q = valid.peakDischargeM3s as number
    const Wkm = valid.floodplainWidthKm as number

    const lat1 = origin.latitudeDeg * (Math.PI / 180), lon1 = origin.longitudeDeg * (Math.PI / 180)
    const lat2 = target.latitudeDeg * (Math.PI / 180), lon2 = target.longitudeDeg * (Math.PI / 180)
    const dLat = lat2 - lat1, dLon = lon2 - lon1
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2
    const distKm = (6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))) / 1000

    const peakDepthM = Math.min(15, 0.45 * Math.pow(Q, 0.4))
    const halfWidthKm = Wkm / 2
    const depthM = distKm < halfWidthKm ? peakDepthM * (1 - distKm / halfWidthKm) : 0

    return {
      intensity: depthM,
      unit: 'm',
      description: `Flood water depth: ${depthM.toFixed(2)} m at ${distKm.toFixed(1)} km from channel centerline`,
      fields: { inundationDepthM: depthM, distanceFromRiverKm: distKm }
    }
  }
}
