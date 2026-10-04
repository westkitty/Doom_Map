import type { HazardModule, HazardParameterMeta, HazardState, HazardIntensitySample, HazardFootprint, ConsequenceEmission, VfxHint } from '../types'
import type { GeodeticPoint } from '../../core/coordinates'
import type { Provenance } from '../../data/provenance'

export class AsteroidImpactSolver implements HazardModule {
  readonly id = 'asteroid_land_impact'
  readonly name = 'Asteroid Kinetic Land Impact'
  readonly category = 'explosive_impact' as const

  readonly provenance: Provenance = {
    id: 'collins-melosh-impact-2005',
    version: '2005.1',
    kind: 'model',
    title: 'Collins, Melosh & Marcus Earth Impact Effects Model',
    fidelity: 'A',
    sources: [
      'https://impact.ese.ic.ac.uk/ImpactEarth/',
      'https://doi.org/10.1111/j.1945-5100.2005.tb00157.x'
    ],
    timestamp: '2005-06-01T00:00:00Z',
    assumptions: [
      'Solid target rock density (2700 kg/m^3) and spherical impactor geometry.',
      'Transient crater scaling follows Schmidt-Holsapple gravity-regime laws.'
    ],
    uncertainty: 'Crater collapse and target heterogeneity produce ±25% diameter uncertainty; atmospheric entry ablation is modeled for stony bodies.',
    limitations: [
      'Does not model long-term atmospheric climate winter cooling (treated in separate climate module).',
      'Assumes planar ground surface around impact ground zero.'
    ],
    attribution: 'Collins, G.S., Melosh, H.J. & Marcus, R.A. (2005). Meteoritics & Planetary Science 40(6):817-840.',
    license: 'Academic Reference / Open Research Formulation.',
    coverage: 'Global analytical kinetic impact solver'
  }

  readonly parameterSchema: HazardParameterMeta[] = [
    { name: 'diameterM', label: 'Impactor Diameter', type: 'number', default: 200, min: 10, max: 10000, step: 10, unit: 'm', description: 'Diameter of asteroid body' },
    { name: 'velocityKms', label: 'Impact Velocity', type: 'number', default: 20, min: 11.2, max: 72, step: 1, unit: 'km/s', description: 'Impact velocity at atmospheric interface' },
    { name: 'densityKgm3', label: 'Impactor Density', type: 'number', default: 3000, min: 1000, max: 8000, step: 100, unit: 'kg/m³', description: 'Density: 1500 (comet), 3000 (stony), 7800 (iron)' },
    { name: 'angleDeg', label: 'Impact Angle', type: 'number', default: 45, min: 15, max: 90, step: 5, unit: 'deg', description: 'Trajectory angle relative to surface horizontal' }
  ]

  validateParameters(params: Record<string, unknown>): Record<string, number | string | boolean> {
    const diameterM = Math.max(5, Math.min(20000, Number(params.diameterM ?? 200)))
    const velocityKms = Math.max(11.2, Math.min(72, Number(params.velocityKms ?? 20)))
    const densityKgm3 = Math.max(500, Math.min(10000, Number(params.densityKgm3 ?? 3000)))
    const angleDeg = Math.max(10, Math.min(90, Number(params.angleDeg ?? 45)))
    return { diameterM, velocityKms, densityKgm3, angleDeg }
  }

  evaluate(origin: GeodeticPoint, params: Record<string, number | string | boolean>, timeOffsetMs: number, _seed: number): HazardState {
    const valid = this.validateParameters(params)
    const D = valid.diameterM as number
    const v = (valid.velocityKms as number) * 1000
    const rho = valid.densityKgm3 as number
    const theta = ((valid.angleDeg as number) * Math.PI) / 180

    // Mass = 4/3 * pi * r^3 * rho
    const massKg = (4 / 3) * Math.PI * Math.pow(D / 2, 3) * rho
    // Kinetic Energy E = 1/2 * m * v^2 (Joules)
    const energyJoules = 0.5 * massKg * Math.pow(v, 2)
    const megatonsTNT = energyJoules / 4.184e15

    // Collins et al. transient crater diameter (Schmidt-Holsapple scaling):
    // D_tc = 1.161 * (rho_i / rho_t)^0.33 * D^0.78 * v^0.44 * g^(-0.22) * sin(theta)^0.33
    const rhoTarget = 2700
    const g = 9.81
    const Dtc = 1.161 * Math.pow(rho / rhoTarget, 0.333) * Math.pow(D, 0.78) * Math.pow(v, 0.44) * Math.pow(g, -0.22) * Math.pow(Math.sin(theta), 0.333)
    // Final crater diameter D_f (complex crater collapse transition at ~3.2 km):
    const Dfinal = Dtc > 3200 ? 1.17 * Math.pow(Dtc, 1.13) / Math.pow(3200, 0.13) : 1.25 * Dtc
    const craterRadiusM = Dfinal / 2

    // Blast and thermal devastation zones (Megatons equivalent)
    const wCbrt = Math.cbrt(megatonsTNT * 1000)
    const rSevereBlastM = 2200 * wCbrt
    const rModerateBlastM = 5500 * wCbrt
    const rThermalM = 3500 * Math.sqrt(megatonsTNT) * 1000

    const seismicMagnitudeMw = Math.min(10.0, 0.67 * Math.log10(energyJoules) - 5.87)

    const footprint: HazardFootprint = {
      type: 'radial',
      center: origin,
      radiusM: Math.max(rModerateBlastM, rThermalM),
      peakIntensity: megatonsTNT,
      unit: 'MT TNT',
      bands: [
        { radiusM: craterRadiusM, intensity: megatonsTNT, severity: 'extreme', label: `Crater: ${(Dfinal / 1000).toFixed(2)} km diameter` },
        { radiusM: rSevereBlastM, intensity: 5, severity: 'severe', label: 'Severe blast collapse' },
        { radiusM: rModerateBlastM, intensity: 2, severity: 'moderate', label: 'Moderate airblast damage' },
        { radiusM: rThermalM, intensity: 1, severity: 'minor', label: 'Thermal ignition zone' }
      ]
    }

    const emissions: ConsequenceEmission[] = [
      {
        category: 'structural',
        severity: 1.0,
        affectedAreaKm2: Math.PI * (craterRadiusM / 1000) ** 2,
        description: `Impact excavation crater of ${(Dfinal / 1000).toFixed(2)} km diameter with complete vaporization`,
        metrics: { craterDiameterKm: Dfinal / 1000, energyMegatons: megatonsTNT }
      },
      {
        category: 'infrastructure',
        severity: 0.9,
        affectedAreaKm2: Math.PI * (rModerateBlastM / 1000) ** 2,
        description: `Regional blast wave causing severe infrastructure devastation and Mw ${seismicMagnitudeMw.toFixed(1)} seismic shock`,
        metrics: { seismicMw: seismicMagnitudeMw, blastRadiusKm: rModerateBlastM / 1000 }
      }
    ]

    const vfxHints: VfxHint[] = [
      {
        type: 'crater',
        origin,
        radiusM: craterRadiusM,
        progress: 1.0,
        colorHex: 0x3a2e24,
        opacity: 0.95
      }
    ]

    if (timeOffsetMs >= 0 && timeOffsetMs < 60000) {
      const p = timeOffsetMs / 60000
      vfxHints.push({
        type: 'shockwave',
        origin,
        radiusM: Math.min(rModerateBlastM * 1.5, (timeOffsetMs / 1000) * 1200),
        progress: p,
        colorHex: 0xffaa44,
        opacity: Math.max(0, 1 - p)
      })
    }

    return {
      timeMs: timeOffsetMs,
      isActive: timeOffsetMs >= 0 && timeOffsetMs <= 86400000,
      peakIntensity: megatonsTNT,
      footprint,
      emissions,
      vfxHints
    }
  }

  sample(origin: GeodeticPoint, target: GeodeticPoint, params: Record<string, number | string | boolean>, _timeOffsetMs: number): HazardIntensitySample {
    const valid = this.validateParameters(params)
    const D = valid.diameterM as number
    const v = (valid.velocityKms as number) * 1000
    const rho = valid.densityKgm3 as number
    const massKg = (4 / 3) * Math.PI * Math.pow(D / 2, 3) * rho
    const energyJoules = 0.5 * massKg * Math.pow(v, 2)
    const megatonsTNT = energyJoules / 4.184e15

    const lat1 = origin.latitudeDeg * (Math.PI / 180), lon1 = origin.longitudeDeg * (Math.PI / 180)
    const lat2 = target.latitudeDeg * (Math.PI / 180), lon2 = target.longitudeDeg * (Math.PI / 180)
    const dLat = lat2 - lat1, dLon = lon2 - lon1
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2
    const distM = 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    const distKm = distM / 1000

    const seismicMw = 0.67 * Math.log10(energyJoules) - 5.87
    const blastPsi = distKm > 0 ? Math.min(500, (15 * Math.cbrt(megatonsTNT)) / distKm) : 500

    return {
      intensity: blastPsi,
      unit: 'psi',
      description: `Impact blast overpressure ${blastPsi.toFixed(2)} psi, Seismic ground shaking Mw ${seismicMw.toFixed(1)} at ${distKm.toFixed(1)} km`,
      fields: { blastOverpressurePsi: blastPsi, seismicMw, groundDistanceKm: distKm }
    }
  }
}
