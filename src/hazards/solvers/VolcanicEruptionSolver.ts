import type { HazardModule, HazardParameterMeta, HazardState, HazardIntensitySample, HazardFootprint, ConsequenceEmission, VfxHint } from '../types'
import type { GeodeticPoint } from '../../core/coordinates'
import type { Provenance } from '../../data/provenance'

export class VolcanicEruptionSolver implements HazardModule {
  readonly id = 'explosive_volcanic_eruption'
  readonly name = 'Explosive Plinian Volcanic Eruption'
  readonly category = 'volcanic' as const

  readonly provenance: Provenance = {
    id: 'mastin-volcano-plume-2009',
    version: '2009.1',
    kind: 'model',
    title: 'Mastin et al. Volcanic Column Height and Ashfall Isopach Model',
    fidelity: 'A',
    sources: [
      'https://doi.org/10.1016/j.jvolgeores.2009.01.008',
      'https://volcanoes.usgs.gov/'
    ],
    timestamp: '2009-01-01T00:00:00Z',
    assumptions: [
      'Eruption column height scaling H = 2.0 * V_R^0.241 (km) with 1D Suzuki tephra settling.',
      'Pyroclastic density current (PDC) energy-line slope friction angle 0.15.'
    ],
    uncertainty: 'Atmospheric wind shear and grain-size distribution introduce ±25% deposit thickness variance.',
    limitations: [
      'Does not model multi-vent caldera ring-fault collapse structures.',
      'Assumes steady umbrella cloud expansion during paroxysmal phase.'
    ],
    attribution: 'Mastin, L.G. et al. (2009). Journal of Volcanology and Geothermal Research 186:10-21.',
    license: 'Academic Reference / USGS Volcanic Hazards Program.',
    coverage: 'Global analytical volcanic eruption solver'
  }

  readonly parameterSchema: HazardParameterMeta[] = [
    { name: 'vei', label: 'Volcanic Explosivity Index (VEI)', type: 'number', default: 5, min: 1, max: 8, step: 1, unit: 'VEI', description: 'Eruption scale (e.g. VEI 5 = St. Helens 1980, VEI 6 = Pinatubo 1991)' },
    { name: 'columnHeightKm', label: 'Plume Height', type: 'number', default: 25, min: 2, max: 55, step: 1, unit: 'km', description: 'Peak stratospheric injection column altitude' },
    { name: 'windSpeedKmh', label: 'Upper Atmosphere Wind', type: 'number', default: 45, min: 0, max: 150, step: 5, unit: 'km/h', description: 'Stratospheric ash advection wind speed' }
  ]

  validateParameters(params: Record<string, unknown>): Record<string, number | string | boolean> {
    const vei = Math.max(1, Math.min(8, Math.round(Number(params.vei ?? 5))))
    const columnHeightKm = Math.max(1, Math.min(60, Number(params.columnHeightKm ?? 25)))
    const windSpeedKmh = Math.max(0, Math.min(200, Number(params.windSpeedKmh ?? 45)))
    return { vei, columnHeightKm, windSpeedKmh }
  }

  evaluate(origin: GeodeticPoint, params: Record<string, number | string | boolean>, timeOffsetMs: number, _seed: number): HazardState {
    const valid = this.validateParameters(params)
    const vei = valid.vei as number
    const Hkm = valid.columnHeightKm as number

    // PDC (pyroclastic flow) deadly radius ~ H_col / 1.8
    const rPdcM = Math.min(35000, Hkm * 800)
    // Heavy tephra/ashfall accumulation radius (>10 cm roof collapse hazard)
    const rAshfallHeavyM = Math.pow(10, (vei + 2) * 0.6) * 1000
    const rAshfallLightM = rAshfallHeavyM * 3.5

    const footprint: HazardFootprint = {
      type: 'radial',
      center: origin,
      radiusM: rAshfallLightM,
      peakIntensity: vei,
      unit: 'VEI',
      bands: [
        { radiusM: rPdcM, intensity: vei, severity: 'extreme', label: `Pyroclastic flow destruction zone (${(rPdcM / 1000).toFixed(1)} km)` },
        { radiusM: rAshfallHeavyM, intensity: vei - 1, severity: 'severe', label: 'Heavy ashfall (> 10 cm, roof collapse risk)' },
        { radiusM: rAshfallLightM, intensity: vei - 2, severity: 'minor', label: 'Light ashfall & aviation airspace closure' }
      ]
    }

    const emissions: ConsequenceEmission[] = [
      {
        category: 'ecological',
        severity: 0.9,
        affectedAreaKm2: Math.PI * (rAshfallHeavyM / 1000) ** 2,
        description: `VEI ${vei} explosive eruption column injecting ash to ${Hkm} km altitude with severe regional deposition`,
        metrics: { veiIndex: vei, plumeHeightKm: Hkm, pdcRadiusKm: rPdcM / 1000 }
      }
    ]

    const vfxHints: VfxHint[] = [
      {
        type: 'plume',
        origin,
        radiusM: rAshfallHeavyM,
        heightM: Hkm * 1000,
        progress: Math.min(1, timeOffsetMs / 3600000),
        colorHex: 0x554433,
        opacity: 0.85
      }
    ]

    return {
      timeMs: timeOffsetMs,
      isActive: true,
      peakIntensity: vei,
      footprint,
      emissions,
      vfxHints
    }
  }

  sample(origin: GeodeticPoint, target: GeodeticPoint, params: Record<string, number | string | boolean>, _timeOffsetMs: number): HazardIntensitySample {
    const valid = this.validateParameters(params)
    const vei = valid.vei as number

    const lat1 = origin.latitudeDeg * (Math.PI / 180), lon1 = origin.longitudeDeg * (Math.PI / 180)
    const lat2 = target.latitudeDeg * (Math.PI / 180), lon2 = target.longitudeDeg * (Math.PI / 180)
    const dLat = lat2 - lat1, dLon = lon2 - lon1
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2
    const distKm = (6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))) / 1000

    const ashThicknessMm = distKm > 0 ? Math.min(2000, (Math.pow(10, vei) * 5) / (distKm ** 1.6)) : 2000

    return {
      intensity: ashThicknessMm,
      unit: 'mm ash',
      description: `Accumulated ash deposit: ${ashThicknessMm.toFixed(1)} mm at ${distKm.toFixed(1)} km from volcano`,
      fields: { ashThicknessMm, distanceFromVentKm: distKm }
    }
  }
}
