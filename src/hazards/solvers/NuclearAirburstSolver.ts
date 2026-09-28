import type { HazardModule, HazardParameterMeta, HazardState, HazardIntensitySample, HazardFootprint, ConsequenceEmission, VfxHint } from '../types'
import type { GeodeticPoint } from '../../core/coordinates'
import type { Provenance } from '../../data/provenance'

export class NuclearAirburstSolver implements HazardModule {
  readonly id = 'nuclear_airburst'
  readonly name = 'Nuclear Detonation (Airburst)'
  readonly category = 'explosive_impact' as const

  readonly provenance: Provenance = {
    id: 'glasstone-dolan-nuclear-1977',
    version: '1977.1',
    kind: 'model',
    title: 'Glasstone & Dolan Nuclear Detonation Effects',
    fidelity: 'A',
    sources: [
      'https://www.atomicarchive.com/resources/documents/effects/glasstone-dolan.html'
    ],
    timestamp: '1977-01-01T00:00:00Z',
    assumptions: [
      'Standard sea-level atmosphere and homogeneous terrain scaling.',
      'Optimal burst height for blast overpressure enhancement (~60 m/kt^0.33).'
    ],
    uncertainty: 'Empirical scaling laws from Pacific and Nevada test series; localized topography and atmospheric layering introduce ±20% variance.',
    limitations: [
      'Reduced-order hydrodynamic equations; does not compute 3D CFD urban street canyon reflections.',
      'Thermal radiation assumes clear atmospheric transmission factor (0.75).'
    ],
    attribution: 'Glasstone, S. & Dolan, P.J. (1977). The Effects of Nuclear Weapons. US DoD & ERDA.',
    license: 'Public Domain / US Government Technical Report.',
    coverage: 'Global analytical point-source detonation'
  }

  readonly parameterSchema: HazardParameterMeta[] = [
    { name: 'yieldKt', label: 'Yield', type: 'number', default: 100, min: 0.1, max: 50000, step: 10, unit: 'kt', description: 'Detonation explosive yield in kilotons of TNT equivalent' },
    { name: 'burstAltitudeM', label: 'Burst Altitude', type: 'number', default: 600, min: 50, max: 10000, step: 50, unit: 'm', description: 'Height of burst above terrain' }
  ]

  validateParameters(params: Record<string, unknown>): Record<string, number | string | boolean> {
    const yieldKt = Math.max(0.01, Math.min(100000, Number(params.yieldKt ?? 100)))
    const burstAltitudeM = Math.max(0, Math.min(50000, Number(params.burstAltitudeM ?? 600)))
    return { yieldKt, burstAltitudeM }
  }

  /**
   * Glasstone & Dolan blast scaling:
   * Overpressure radii scale with W^(1/3).
   * 20 psi (heavy concrete demolition): r20 ≈ 0.65 * W^(1/3) km
   * 5 psi (widespread structural collapse): r5 ≈ 1.65 * W^(1/3) km
   * 2 psi (moderate residential damage): r2 ≈ 3.10 * W^(1/3) km
   * 1 psi (glass breakage & minor damage): r1 ≈ 5.40 * W^(1/3) km
   */
  evaluate(origin: GeodeticPoint, params: Record<string, number | string | boolean>, timeOffsetMs: number, _seed: number): HazardState {
    const valid = this.validateParameters(params)
    const W = valid.yieldKt as number
    const wCbrt = Math.cbrt(W)

    // Blast radii in meters
    const r20psi = 650 * wCbrt
    const r5psi = 1650 * wCbrt
    const r2psi = 3100 * wCbrt
    const r1psi = 5400 * wCbrt

    // Fireball radius: R_fb ≈ 70 * W^0.4 (meters)
    const maxFireballRadiusM = 70 * Math.pow(W, 0.4)
    const fireballDurationMs = Math.min(30000, 1000 * Math.pow(W, 0.45))

    // Shockwave propagation speed: average ~400 m/s in near field
    const blastSpeedMs = 400
    const shockwaveRadiusM = Math.min(r1psi * 1.5, (timeOffsetMs / 1000) * blastSpeedMs)
    const isActive = timeOffsetMs >= 0 && timeOffsetMs <= 300000 // 5 minutes active simulation

    const footprint: HazardFootprint = {
      type: 'radial',
      center: origin,
      radiusM: r1psi,
      peakIntensity: 20, // 20+ psi
      unit: 'psi',
      bands: [
        { radiusM: r20psi, intensity: 20, severity: 'extreme', label: '20 psi · Complete structural demolition' },
        { radiusM: r5psi, intensity: 5, severity: 'severe', label: '5 psi · Widespread building collapse' },
        { radiusM: r2psi, intensity: 2, severity: 'moderate', label: '2 psi · Moderate structural damage' },
        { radiusM: r1psi, intensity: 1, severity: 'minor', label: '1 psi · Window and cladding breakage' }
      ]
    }

    const emissions: ConsequenceEmission[] = [
      {
        category: 'structural',
        severity: 0.95,
        affectedAreaKm2: Math.PI * (r5psi / 1000) ** 2,
        description: `Severe structural collapse zone extending to ${(r5psi / 1000).toFixed(2)} km radius`,
        metrics: { r20psiM: r20psi, r5psiM: r5psi, r1psiM: r1psi }
      },
      {
        category: 'casualties',
        severity: 0.88,
        affectedAreaKm2: Math.PI * (r2psi / 1000) ** 2,
        description: `High thermal and blast casualty radius out to ${(r2psi / 1000).toFixed(2)} km`,
        metrics: { thermalRadiusM: r2psi, promptRadiationM: 1200 * wCbrt }
      }
    ]

    const vfxHints: VfxHint[] = []
    if (timeOffsetMs >= 0 && timeOffsetMs <= fireballDurationMs) {
      const fbProgress = timeOffsetMs / fireballDurationMs
      vfxHints.push({
        type: 'fireball',
        origin,
        radiusM: maxFireballRadiusM * Math.min(1, fbProgress * 4),
        heightM: valid.burstAltitudeM as number,
        progress: fbProgress,
        colorHex: 0xffeedd,
        opacity: Math.max(0, 1 - fbProgress * 0.8)
      })
    }
    if (timeOffsetMs > 0 && shockwaveRadiusM > 0) {
      vfxHints.push({
        type: 'shockwave',
        origin,
        radiusM: shockwaveRadiusM,
        progress: Math.min(1, shockwaveRadiusM / r1psi),
        colorHex: 0x99ddff,
        opacity: Math.max(0, 1 - shockwaveRadiusM / (r1psi * 1.5))
      })
    }

    return {
      timeMs: timeOffsetMs,
      isActive,
      peakIntensity: 20,
      footprint,
      emissions,
      vfxHints
    }
  }

  sample(origin: GeodeticPoint, target: GeodeticPoint, params: Record<string, number | string | boolean>, _timeOffsetMs: number): HazardIntensitySample {
    const valid = this.validateParameters(params)
    const W = valid.yieldKt as number
    const wCbrt = Math.cbrt(W)

    // Distance calculation on sphere (approx)
    const lat1 = origin.latitudeDeg * (Math.PI / 180), lon1 = origin.longitudeDeg * (Math.PI / 180)
    const lat2 = target.latitudeDeg * (Math.PI / 180), lon2 = target.longitudeDeg * (Math.PI / 180)
    const dLat = lat2 - lat1, dLon = lon2 - lon1
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2
    const distM = 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    const slantDistKm = Math.hypot(distM, valid.burstAltitudeM as number) / 1000

    // Scaled distance: R_scaled = R / W^(1/3)
    const scaledDistKm = slantDistKm / wCbrt
    // Approximate overpressure in psi from scaled distance
    const overpressurePsi = scaledDistKm > 0 ? Math.min(200, 1.2 / (scaledDistKm ** 1.3) + 0.3 / (scaledDistKm ** 2.5)) : 200

    return {
      intensity: overpressurePsi,
      unit: 'psi',
      description: `Peak blast overpressure: ${overpressurePsi.toFixed(2)} psi at ${(distM / 1000).toFixed(2)} km ground distance`,
      fields: { overpressurePsi, groundDistanceKm: distM / 1000, slantDistanceKm: slantDistKm }
    }
  }
}
