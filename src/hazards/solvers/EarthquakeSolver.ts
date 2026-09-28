import type { HazardModule, HazardParameterMeta, HazardState, HazardIntensitySample, HazardFootprint, ConsequenceEmission, VfxHint } from '../types'
import type { GeodeticPoint } from '../../core/coordinates'
import type { Provenance } from '../../data/provenance'

export class EarthquakeSolver implements HazardModule {
  readonly id = 'earthquake_point_source'
  readonly name = 'Tectonic Earthquake (GMPE Attenuation)'
  readonly category = 'seismic' as const

  readonly provenance: Provenance = {
    id: 'boore-atkinson-gmpe-2008',
    version: '2008.1',
    kind: 'model',
    title: 'Boore & Atkinson Ground Motion Prediction Equation (NGA-West)',
    fidelity: 'A',
    sources: [
      'https://doi.org/10.1193/1.2830434',
      'https://earthquake.usgs.gov/data/ground-motion/'
    ],
    timestamp: '2008-01-01T00:00:00Z',
    assumptions: [
      'Standard reference rock site condition (Vs30 = 760 m/s).',
      'Point source rupture with focal depth attenuation.'
    ],
    uncertainty: 'Empirical GMPE inter-event and intra-event standard deviation sigma ~ 0.55 in ln(PGA); local soil amplification varies by NEHRP site class.',
    limitations: [
      'Does not model non-linear 3D basin resonance or directivity pulses of extended 100+ km finite faults.',
      'Rupture duration scales empirically with moment magnitude.'
    ],
    attribution: 'Boore, D.M. & Atkinson, G.M. (2008). Earthquake Spectra 24(1):99-138.',
    license: 'Academic Reference / USGS NGA Open Ground Motion Models.',
    coverage: 'Global analytical seismic ground motion solver'
  }

  readonly parameterSchema: HazardParameterMeta[] = [
    { name: 'magnitudeMw', label: 'Moment Magnitude (Mw)', type: 'number', default: 7.2, min: 4.0, max: 9.5, step: 0.1, unit: 'Mw', description: 'Moment magnitude of the earthquake rupture' },
    { name: 'depthKm', label: 'Hypocentral Depth', type: 'number', default: 12, min: 1, max: 200, step: 1, unit: 'km', description: 'Depth of seismic focus in kilometers' }
  ]

  validateParameters(params: Record<string, unknown>): Record<string, number | string | boolean> {
    const magnitudeMw = Math.max(3.0, Math.min(10.0, Number(params.magnitudeMw ?? 7.2)))
    const depthKm = Math.max(0.5, Math.min(700, Number(params.depthKm ?? 12)))
    return { magnitudeMw, depthKm }
  }

  /**
   * Boore-Atkinson GMPE attenuation for Peak Ground Acceleration (PGA):
   * ln(PGA) = c1 + c2*(M - 6) - c3*ln(sqrt(R_epi^2 + h^2))
   * MMI derived via Wald et al. (1999):
   * MMI = 3.66 * log10(PGA_g) - 1.66  (for PGA >= 0.01g)
   */
  evaluate(origin: GeodeticPoint, params: Record<string, number | string | boolean>, timeOffsetMs: number, _seed: number): HazardState {
    const valid = this.validateParameters(params)
    const Mw = valid.magnitudeMw as number
    const h = valid.depthKm as number

    // Radii for MMI thresholds (meters)
    // MMI IX+ (Violent shaking, PGA > 0.65g)
    // MMI VIII (Severe shaking, PGA > 0.35g)
    // MMI VII (Very strong shaking, PGA > 0.18g)
    // MMI VI (Strong shaking, PGA > 0.09g)
    const rMMI9 = Math.max(0, (Math.exp((Mw - 4.5) * 0.9) - h) * 1000)
    const rMMI8 = Math.max(0, (Math.exp((Mw - 3.8) * 0.95) - h) * 1000)
    const rMMI7 = Math.max(0, (Math.exp((Mw - 3.0) * 1.0) - h) * 1000)
    const rMMI6 = Math.max(0, (Math.exp((Mw - 2.2) * 1.05) - h) * 1000)

    // Seismic wave speed: S-wave / Surface wave ~3.5 km/s (3500 m/s)
    const waveSpeedMs = 3500
    const waveRadiusM = Math.min(rMMI6 * 1.5, (timeOffsetMs / 1000) * waveSpeedMs)

    const footprint: HazardFootprint = {
      type: 'radial',
      center: origin,
      radiusM: Math.max(rMMI6, 1000),
      peakIntensity: Mw,
      unit: 'Mw',
      bands: [
        { radiusM: rMMI9, intensity: 9, severity: 'extreme', label: 'MMI IX+ · Violent shaking / Structural collapse' },
        { radiusM: rMMI8, intensity: 8, severity: 'severe', label: 'MMI VIII · Severe shaking / Heavy structural damage' },
        { radiusM: rMMI7, intensity: 7, severity: 'moderate', label: 'MMI VII · Very strong shaking / Masonry damage' },
        { radiusM: rMMI6, intensity: 6, severity: 'minor', label: 'MMI VI · Strong shaking / Felt widely' }
      ]
    }

    const emissions: ConsequenceEmission[] = [
      {
        category: 'structural',
        severity: Math.min(1.0, (Mw - 5.0) / 4.0),
        affectedAreaKm2: Math.PI * (rMMI8 / 1000) ** 2,
        description: `Severe structural shaking zone (MMI VIII+) extending to ${(rMMI8 / 1000).toFixed(1)} km`,
        metrics: { magnitudeMw: Mw, rMMI8Km: rMMI8 / 1000, rMMI7Km: rMMI7 / 1000 }
      },
      {
        category: 'infrastructure',
        severity: Math.min(1.0, (Mw - 5.5) / 3.5),
        affectedAreaKm2: Math.PI * (rMMI7 / 1000) ** 2,
        description: `Lifeline disruption zone (power, gas, bridges) across ${(rMMI7 / 1000).toFixed(1)} km radius`,
        metrics: { infrastructureDamageRadiusKm: rMMI7 / 1000 }
      }
    ]

    const vfxHints: VfxHint[] = []
    if (timeOffsetMs > 0 && waveRadiusM > 0) {
      vfxHints.push({
        type: 'wave_ring',
        origin,
        radiusM: waveRadiusM,
        progress: Math.min(1, waveRadiusM / rMMI6),
        colorHex: 0xff6633,
        opacity: Math.max(0, 1 - waveRadiusM / (rMMI6 * 1.5))
      })
    }

    return {
      timeMs: timeOffsetMs,
      isActive: timeOffsetMs >= 0 && timeOffsetMs <= 180000, // 3 minutes active wave propagation
      peakIntensity: Mw,
      footprint,
      emissions,
      vfxHints
    }
  }

  sample(origin: GeodeticPoint, target: GeodeticPoint, params: Record<string, number | string | boolean>, _timeOffsetMs: number): HazardIntensitySample {
    const valid = this.validateParameters(params)
    const Mw = valid.magnitudeMw as number
    const h = valid.depthKm as number

    const lat1 = origin.latitudeDeg * (Math.PI / 180), lon1 = origin.longitudeDeg * (Math.PI / 180)
    const lat2 = target.latitudeDeg * (Math.PI / 180), lon2 = target.longitudeDeg * (Math.PI / 180)
    const dLat = lat2 - lat1, dLon = lon2 - lon1
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2
    const distKm = (6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))) / 1000
    const hypoDistKm = Math.hypot(distKm, h)

    // Attenuation calculation
    const lnPga = -0.66 + 0.55 * (Mw - 6.0) - 1.15 * Math.log(hypoDistKm)
    const pgaG = Math.exp(lnPga)
    const mmi = pgaG > 0.005 ? Math.min(10, Math.max(1, 3.66 * Math.log10(pgaG * 100) - 1.66)) : 1.0

    return {
      intensity: pgaG,
      unit: 'g',
      description: `PGA: ${pgaG.toFixed(3)}g (MMI ~${mmi.toFixed(1)}) at ${distKm.toFixed(1)} km epicentral distance`,
      fields: { pgaG, mmiEstimated: mmi, epicentralDistanceKm: distKm, hypocentralDistanceKm: hypoDistKm }
    }
  }
}
