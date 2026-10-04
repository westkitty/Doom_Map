import type { HazardModule, HazardParameterMeta, HazardState, HazardIntensitySample, HazardFootprint, ConsequenceEmission, VfxHint } from '../types'
import type { GeodeticPoint } from '../../core/coordinates'
import type { Provenance } from '../../data/provenance'

export class TropicalCycloneSolver implements HazardModule {
  readonly id = 'tropical_cyclone'
  readonly name = 'Tropical Cyclone / Hurricane (Holland Wind Field)'
  readonly category = 'atmospheric' as const

  readonly provenance: Provenance = {
    id: 'holland-cyclone-wind-1980',
    version: '1980.1',
    kind: 'model',
    title: 'Holland Parametric Tropical Cyclone Wind and Pressure Model',
    fidelity: 'A',
    sources: [
      'https://doi.org/10.1175/1520-0493(1980)108<1212:AAMOTW>2.0.CO;2',
      'https://www.nhc.noaa.gov/modelsummary.shtml'
    ],
    timestamp: '1980-08-01T00:00:00Z',
    assumptions: [
      'Axisymmetric gradient wind balance with Holland B parameter scaling.',
      'Standard ambient surface pressure (1013.25 hPa) and sea surface air density (1.15 kg/m^3).'
    ],
    uncertainty: 'Eyewall replacement cycles and asymmetric track shear introduce ±15 kt variance.',
    limitations: [
      'Does not compute localized tornado spouts embedded in outer spiral rainbands.',
      'Assumes steady-state pressure deficit over evaluated time interval.'
    ],
    attribution: 'Holland, G.J. (1980). Monthly Weather Review 108(8):1212-1218.',
    license: 'Academic Reference / NOAA NHC Operational Baseline.',
    coverage: 'Global analytical tropical cyclone wind field solver'
  }

  readonly parameterSchema: HazardParameterMeta[] = [
    { name: 'centralPressureHpa', label: 'Central Pressure', type: 'number', default: 920, min: 870, max: 1000, step: 5, unit: 'hPa', description: 'Minimum central atmospheric pressure' },
    { name: 'radiusMaxWindKm', label: 'Radius of Maximum Winds (Rmax)', type: 'number', default: 35, min: 10, max: 120, step: 5, unit: 'km', description: 'Distance from center to eyewall peak winds' },
    { name: 'hollandB', label: 'Holland B Shape Parameter', type: 'number', default: 1.35, min: 0.8, max: 2.2, step: 0.05, unit: '', description: 'Radial profile peakedness index' }
  ]

  validateParameters(params: Record<string, unknown>): Record<string, number | string | boolean> {
    const centralPressureHpa = Math.max(860, Math.min(1010, Number(params.centralPressureHpa ?? 920)))
    const radiusMaxWindKm = Math.max(5, Math.min(200, Number(params.radiusMaxWindKm ?? 35)))
    const hollandB = Math.max(0.6, Math.min(2.5, Number(params.hollandB ?? 1.35)))
    return { centralPressureHpa, radiusMaxWindKm, hollandB }
  }

  /**
   * Holland (1980) wind formula:
   * V(r) = sqrt( (B / rho) * (Rmax / r)^B * deltaP * exp(-(Rmax / r)^B) + (r * f / 2)^2 ) - (r * f / 2)
   * Peak wind: Vmax = sqrt( (B / (rho * e)) * deltaP )
   */
  evaluate(origin: GeodeticPoint, params: Record<string, number | string | boolean>, timeOffsetMs: number, _seed: number): HazardState {
    const valid = this.validateParameters(params)
    const Pc = valid.centralPressureHpa as number
    const RmaxKm = valid.radiusMaxWindKm as number
    const B = valid.hollandB as number

    const Penv = 1013.25
    const deltaP = Math.max(5, Penv - Pc) * 100 // Pa
    const rho = 1.15 // kg/m^3
    const e = Math.E

    // Peak sustained wind speed (m/s and knots)
    const VmaxMs = Math.sqrt((B / (rho * e)) * deltaP)
    const VmaxKnots = VmaxMs * 1.94384

    // Saffir-Simpson Hurricane Wind Scale:
    // Cat 5: >= 137 kt (70 m/s)
    // Cat 4: 113-136 kt (58 m/s)
    // Cat 3: 96-112 kt (50 m/s)
    // Cat 2: 83-95 kt (43 m/s)
    // Cat 1: 64-82 kt (33 m/s)
    // TS: 34-63 kt (17.5 m/s)
    let category = 'Tropical Storm'
    if (VmaxKnots >= 137) category = 'Category 5 Major Hurricane'
    else if (VmaxKnots >= 113) category = 'Category 4 Major Hurricane'
    else if (VmaxKnots >= 96) category = 'Category 3 Major Hurricane'
    else if (VmaxKnots >= 83) category = 'Category 2 Hurricane'
    else if (VmaxKnots >= 64) category = 'Category 1 Hurricane'

    // Radii for gale (34 kt / 17.5 m/s), storm (50 kt / 25 m/s), and hurricane (64 kt / 33 m/s) winds
    const rHurricaneM = RmaxKm * 1000 * 2.2
    const rStormM = RmaxKm * 1000 * 4.5
    const rGaleM = RmaxKm * 1000 * 8.0

    const stormSurgePeakM = Math.max(0.5, (Penv - Pc) * 0.04 + (VmaxMs / 20) ** 2)

    const footprint: HazardFootprint = {
      type: 'radial',
      center: origin,
      radiusM: rGaleM,
      peakIntensity: VmaxKnots,
      unit: 'kt',
      bands: [
        { radiusM: RmaxKm * 1000 * 1.2, intensity: VmaxKnots, severity: 'extreme', label: `Eyewall · ${category} (${VmaxKnots.toFixed(0)} kt / ${VmaxMs.toFixed(0)} m/s)` },
        { radiusM: rHurricaneM, intensity: 64, severity: 'severe', label: 'Hurricane force wind field (>= 64 kt)' },
        { radiusM: rStormM, intensity: 50, severity: 'moderate', label: 'Storm force wind field (>= 50 kt)' },
        { radiusM: rGaleM, intensity: 34, severity: 'minor', label: 'Tropical storm gale field (>= 34 kt)' }
      ]
    }

    const emissions: ConsequenceEmission[] = [
      {
        category: 'structural',
        severity: Math.min(1.0, VmaxKnots / 140),
        affectedAreaKm2: Math.PI * (rHurricaneM / 1000) ** 2,
        description: `${category} wind field with peak gusts and severe roof/cladding damage across ${(rHurricaneM / 1000).toFixed(0)} km`,
        metrics: { maxWindKnots: VmaxKnots, centralPressureHpa: Pc, surgeHeightM: stormSurgePeakM }
      },
      {
        category: 'infrastructure',
        severity: 0.85,
        affectedAreaKm2: Math.PI * (rStormM / 1000) ** 2,
        description: `Widespread power grid, transmission line, and telecommunication tree-fall outages`,
        metrics: { powerOutageRadiusKm: rStormM / 1000 }
      }
    ]

    const vfxHints: VfxHint[] = [
      {
        type: 'vortex',
        origin,
        radiusM: rGaleM,
        progress: (timeOffsetMs / 3600000) % 1.0,
        colorHex: 0xccddee,
        opacity: 0.75
      }
    ]

    return {
      timeMs: timeOffsetMs,
      isActive: true,
      peakIntensity: VmaxKnots,
      footprint,
      emissions,
      vfxHints
    }
  }

  sample(origin: GeodeticPoint, target: GeodeticPoint, params: Record<string, number | string | boolean>, _timeOffsetMs: number): HazardIntensitySample {
    const valid = this.validateParameters(params)
    const Pc = valid.centralPressureHpa as number
    const RmaxKm = valid.radiusMaxWindKm as number
    const B = valid.hollandB as number

    const lat1 = origin.latitudeDeg * (Math.PI / 180), lon1 = origin.longitudeDeg * (Math.PI / 180)
    const lat2 = target.latitudeDeg * (Math.PI / 180), lon2 = target.longitudeDeg * (Math.PI / 180)
    const dLat = lat2 - lat1, dLon = lon2 - lon1
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2
    const distKm = (6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))) / 1000

    const Penv = 1013.25
    const deltaP = Math.max(5, Penv - Pc) * 100
    const rho = 1.15
    const rRatio = distKm > 0 ? RmaxKm / distKm : 1.0
    const term = Math.pow(rRatio, B)
    const windMs = distKm > 0 ? Math.sqrt((B / rho) * term * deltaP * Math.exp(-term)) : 0
    const windKnots = windMs * 1.94384

    return {
      intensity: windKnots,
      unit: 'kt',
      description: `Sustained wind speed: ${windKnots.toFixed(1)} kt (${windMs.toFixed(1)} m/s) at ${distKm.toFixed(1)} km from eye`,
      fields: { windKnots, windMs, distanceFromEyeKm: distKm }
    }
  }
}
