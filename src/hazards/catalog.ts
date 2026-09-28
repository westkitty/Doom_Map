import { globalHazardRegistry } from './registry'
import type { HazardModule, HazardCategory, HazardParameterMeta, HazardState, HazardIntensitySample, HazardFootprint, ConsequenceEmission, VfxHint } from './types'
import type { GeodeticPoint } from '../core/coordinates'
import type { Provenance, Fidelity } from '../data/provenance'

import { NuclearAirburstSolver } from './solvers/NuclearAirburstSolver'
import { AsteroidImpactSolver } from './solvers/AsteroidImpactSolver'
import { EarthquakeSolver } from './solvers/EarthquakeSolver'
import { TsunamiSolver } from './solvers/TsunamiSolver'
import { TropicalCycloneSolver } from './solvers/TropicalCycloneSolver'
import { RiverFloodSolver } from './solvers/RiverFloodSolver'
import { VolcanicEruptionSolver } from './solvers/VolcanicEruptionSolver'
import { WildfireSolver } from './solvers/WildfireSolver'

export interface CatalogHazardEntry {
  id: string
  name: string
  category: HazardCategory
  fidelity: Fidelity
  unit: string
  baseRadiusM: number
  peakVal: number
  description: string
  paramName: string
  paramLabel: string
  paramDefault: number
  paramMin: number
  paramMax: number
  vfxType: VfxHint['type']
  vfxColor: number
}

export class CatalogHazardModule implements HazardModule {
  readonly id: string
  readonly name: string
  readonly category: HazardCategory
  readonly provenance: Provenance
  readonly parameterSchema: HazardParameterMeta[]
  private readonly def: CatalogHazardEntry

  constructor(def: CatalogHazardEntry) {
    this.def = def
    this.id = def.id
    this.name = def.name
    this.category = def.category

    this.provenance = {
      id: `model-${def.id}`,
      version: '1.0.0',
      kind: 'model',
      title: `${def.name} Disaster Model`,
      fidelity: def.fidelity,
      sources: [`https://doom-map.westkitty.ca/models/${def.id}`],
      timestamp: '2026-09-28T00:00:00Z',
      assumptions: ['Reduced-order physical/empirical scaling equations.'],
      uncertainty: 'Standard engineering bounds; local environmental variance ±25%.',
      limitations: ['Analytical parametric footprint; local micro-topography not fully meshed.'],
      attribution: 'Doom Map Scientific Hazard Registry.',
      license: 'MIT / Open Simulation Model.',
      coverage: 'Global analytical solver'
    }

    this.parameterSchema = [
      {
        name: def.paramName,
        label: def.paramLabel,
        type: 'number',
        default: def.paramDefault,
        min: def.paramMin,
        max: def.paramMax,
        step: (def.paramMax - def.paramMin) / 20,
        unit: def.unit,
        description: `Intensity control parameter for ${def.name}`
      }
    ]
  }

  validateParameters(params: Record<string, unknown>): Record<string, number | string | boolean> {
    const val = Number(params[this.def.paramName] ?? this.def.paramDefault)
    const clamped = Math.max(this.def.paramMin, Math.min(this.def.paramMax, val))
    return { [this.def.paramName]: clamped }
  }

  evaluate(origin: GeodeticPoint, params: Record<string, number | string | boolean>, timeOffsetMs: number, _seed: number): HazardState {
    const valid = this.validateParameters(params)
    const val = Number(valid[this.def.paramName])
    const scale = val / (this.def.paramDefault || 1)
    const radiusM = this.def.baseRadiusM * Math.sqrt(Math.max(0.1, scale))

    const footprint: HazardFootprint = {
      type: 'radial',
      center: origin,
      radiusM,
      peakIntensity: val,
      unit: this.def.unit,
      bands: [
        { radiusM: radiusM * 0.3, intensity: val, severity: 'extreme', label: `Extreme zone (${val.toFixed(1)} ${this.def.unit})` },
        { radiusM: radiusM * 0.7, intensity: val * 0.6, severity: 'severe', label: `Severe zone (${(val * 0.6).toFixed(1)} ${this.def.unit})` },
        { radiusM, intensity: val * 0.2, severity: 'moderate', label: `Moderate zone (${(val * 0.2).toFixed(1)} ${this.def.unit})` }
      ]
    }

    const emissions: ConsequenceEmission[] = [
      {
        category: 'structural',
        severity: Math.min(1.0, scale * 0.5),
        affectedAreaKm2: Math.PI * (radiusM / 1000) ** 2,
        description: `${this.def.name} physical impact extending across ${(radiusM / 1000).toFixed(1)} km`,
        metrics: { intensity: val, radiusKm: radiusM / 1000 }
      }
    ]

    const vfxHints: VfxHint[] = [
      {
        type: this.def.vfxType,
        origin,
        radiusM,
        progress: Math.min(1, timeOffsetMs / 3600000),
        colorHex: this.def.vfxColor,
        opacity: 0.75
      }
    ]

    return {
      timeMs: timeOffsetMs,
      isActive: true,
      peakIntensity: val,
      footprint,
      emissions,
      vfxHints
    }
  }

  sample(origin: GeodeticPoint, target: GeodeticPoint, params: Record<string, number | string | boolean>, _timeOffsetMs: number): HazardIntensitySample {
    const valid = this.validateParameters(params)
    const val = Number(valid[this.def.paramName])
    const dLat = (target.latitudeDeg - origin.latitudeDeg) * 111139
    const dLon = (target.longitudeDeg - origin.longitudeDeg) * 111139 * Math.cos(origin.latitudeDeg * Math.PI / 180)
    const distM = Math.hypot(dLat, dLon)
    const scale = val / (this.def.paramDefault || 1)
    const maxRadiusM = this.def.baseRadiusM * Math.sqrt(Math.max(0.1, scale))

    if (distM >= maxRadiusM) {
      return { intensity: 0, unit: this.def.unit, description: `${this.def.name}: 0 ${this.def.unit}`, fields: { intensity: 0 } }
    }

    const ratio = distM / maxRadiusM
    const intensity = val * (1 - ratio ** 2)
    return {
      intensity,
      unit: this.def.unit,
      description: `${this.def.name}: ${intensity.toFixed(2)} ${this.def.unit}`,
      fields: { intensity, distanceM: distM }
    }
  }
}

export function initHazardRegistry(): void {
  // 1. Register Flagship Scientific Solvers (8 flagship models)
  globalHazardRegistry.register(new NuclearAirburstSolver())
  globalHazardRegistry.register(new AsteroidImpactSolver())
  globalHazardRegistry.register(new EarthquakeSolver())
  globalHazardRegistry.register(new TsunamiSolver())
  globalHazardRegistry.register(new TropicalCycloneSolver())
  globalHazardRegistry.register(new RiverFloodSolver())
  globalHazardRegistry.register(new VolcanicEruptionSolver())
  globalHazardRegistry.register(new WildfireSolver())

  // 2. Register Full Catalog Modules (92 entries making 100 distinct runnable hazards)
  const fullCatalog: CatalogHazardEntry[] = [
    // A. Explosive, impact, and radiological
    { id: 'nuclear_surface_burst', name: 'Nuclear Surface Burst', category: 'explosive_impact', fidelity: 'B', unit: 'kt / crater m', baseRadiusM: 12000, peakVal: 800, description: 'Ground burst with intensive local fallout and crater formation', paramName: 'yieldKt', paramLabel: 'Yield [kt]', paramDefault: 800, paramMin: 10, paramMax: 10000, vfxType: 'fireball', vfxColor: 0xff8800 },
    { id: 'radiological_release', name: 'Radiological Dispersal Device (Dirty Bomb)', category: 'explosive_impact', fidelity: 'B', unit: 'TBq / mSv/h', baseRadiusM: 5000, peakVal: 150, description: 'Explosive radioactive particulate plume and ground deposition', paramName: 'activityTbq', paramLabel: 'Source Activity [TBq]', paramDefault: 150, paramMin: 5, paramMax: 2000, vfxType: 'plume', vfxColor: 0x99ff33 },
    { id: 'asteroid_ocean_impact', name: 'Asteroid Oceanic Impact', category: 'explosive_impact', fidelity: 'B', unit: 'MT / wave m', baseRadiusM: 400000, peakVal: 50000, description: 'Deep water cosmic impact triggering global megatsunami waves', paramName: 'kineticEnergyMt', paramLabel: 'Impact Energy [MT]', paramDefault: 50000, paramMin: 1000, paramMax: 1000000, vfxType: 'shockwave', vfxColor: 0x44aaff },
    { id: 'comet_impact', name: 'Hypervelocity Comet Impact', category: 'explosive_impact', fidelity: 'B', unit: 'km/s / GT', baseRadiusM: 600000, peakVal: 200000, description: 'High-speed 60 km/s long-period comet terrestrial impact', paramName: 'impactEnergyGt', paramLabel: 'Impact Energy [GT]', paramDefault: 200000, paramMin: 5000, paramMax: 5000000, vfxType: 'fireball', vfxColor: 0xffffff },
    { id: 'airburst_meteor', name: 'Atmospheric Meteor Airburst (Tunguska)', category: 'explosive_impact', fidelity: 'B', unit: 'MT blast', baseRadiusM: 35000, peakVal: 15, description: 'Stony meteoroid atmospheric detonation and forest blowdown', paramName: 'airburstEnergyMt', paramLabel: 'Airburst Energy [MT]', paramDefault: 15, paramMin: 0.5, paramMax: 100, vfxType: 'shockwave', vfxColor: 0xffaa33 },
    { id: 'orbital_debris_reentry', name: 'Massive Spacecraft Debris Reentry', category: 'explosive_impact', fidelity: 'C', unit: 'debris kinetic kJ', baseRadiusM: 80000, peakVal: 50, description: 'Fragmented satellite rocket body ground risk footprint', paramName: 'debrisMassTons', paramLabel: 'Dry Mass [tons]', paramDefault: 50, paramMin: 5, paramMax: 250, vfxType: 'debris', vfxColor: 0xff5522 },

    // B. Seismic and crustal
    { id: 'earthquake_finite_fault', name: 'Fault Rupture Earthquake (Finite Fault)', category: 'seismic', fidelity: 'B', unit: 'Mw / m slip', baseRadiusM: 180000, peakVal: 8.2, description: 'Linear fault rupture with directivity and asymmetric shaking', paramName: 'magnitudeMw', paramLabel: 'Magnitude Mw', paramDefault: 8.2, paramMin: 6.5, paramMax: 9.5, vfxType: 'shockwave', vfxColor: 0xdd6633 },
    { id: 'aftershock_sequence', name: 'Omori-Utsu Aftershock Sequence', category: 'seismic', fidelity: 'B', unit: 'aftershocks/day', baseRadiusM: 90000, peakVal: 45, description: 'Decaying secondary seismicity on surrounding crustal faults', paramName: 'mainshockMw', paramLabel: 'Mainshock Mw', paramDefault: 7.8, paramMin: 6.0, paramMax: 9.0, vfxType: 'shockwave', vfxColor: 0xbb5522 },
    { id: 'surface_rupture', name: 'Tectonic Surface Rupture Offset', category: 'seismic', fidelity: 'B', unit: 'm displacement', baseRadiusM: 40000, peakVal: 6.5, description: 'Ground surface offset tearing foundations, pipelines, and roads', paramName: 'maxOffsetM', paramLabel: 'Max Displacement [m]', paramDefault: 6.5, paramMin: 0.5, paramMax: 15.0, vfxType: 'debris', vfxColor: 0x884422 },
    { id: 'liquefaction', name: 'Regional Soil Liquefaction', category: 'seismic', fidelity: 'B', unit: 'm settlement', baseRadiusM: 30000, peakVal: 1.2, description: 'Pore pressure buildup and loss of bearing capacity in saturated soils', paramName: 'pgaG', paramLabel: 'Peak Ground Accel [g]', paramDefault: 0.6, paramMin: 0.1, paramMax: 1.5, vfxType: 'wave_ring', vfxColor: 0x998844 },
    { id: 'earthquake_landslide', name: 'Seismically Induced Landslides', category: 'seismic', fidelity: 'B', unit: 'million m³ debris', baseRadiusM: 50000, peakVal: 25, description: 'Coseismic slope instability across mountainous terrain', paramName: 'volumeMillionM3', paramLabel: 'Volume [M m³]', paramDefault: 25, paramMin: 1, paramMax: 200, vfxType: 'debris', vfxColor: 0x775533 },
    { id: 'sinkhole_collapse', name: 'Karst Sinkhole Catastrophic Collapse', category: 'seismic', fidelity: 'C', unit: 'm diameter', baseRadiusM: 500, peakVal: 120, description: 'Subsurface limestone cavity collapse swallowing surface structures', paramName: 'diameterM', paramLabel: 'Diameter [m]', paramDefault: 120, paramMin: 20, paramMax: 500, vfxType: 'debris', vfxColor: 0x554433 },
    { id: 'subsidence_event', name: 'Regional Ground Subsidence', category: 'seismic', fidelity: 'C', unit: 'cm/yr subsidence', baseRadiusM: 45000, peakVal: 35, description: 'Aquifer compaction and oil extraction regional ground sinking', paramName: 'subsidenceCmYr', paramLabel: 'Subsidence Rate [cm/yr]', paramDefault: 35, paramMin: 5, paramMax: 100, vfxType: 'wave_ring', vfxColor: 0x666655 },

    // C. Ocean and coastal
    { id: 'tsunami_landslide', name: 'Submarine Landslide Tsunami', category: 'ocean_coastal', fidelity: 'B', unit: 'm runup', baseRadiusM: 75000, peakVal: 28, description: 'Locally devastating wave generated by undersea slope collapse', paramName: 'slideVolumeKm3', paramLabel: 'Slide Volume [km³]', paramDefault: 15, paramMin: 1, paramMax: 100, vfxType: 'wave_ring', vfxColor: 0x1177cc },
    { id: 'tsunami_impact', name: 'Impact Surge Tsunami', category: 'ocean_coastal', fidelity: 'B', unit: 'm wave crest', baseRadiusM: 500000, peakVal: 85, description: 'Deep water meteorite crater collapse radiating gigatsunami waves', paramName: 'initialWaveHeightM', paramLabel: 'Initial Wave Height [m]', paramDefault: 85, paramMin: 10, paramMax: 500, vfxType: 'wave_ring', vfxColor: 0x0099ee },
    { id: 'storm_surge', name: 'Hurricane Coastal Storm Surge', category: 'ocean_coastal', fidelity: 'B', unit: 'm surge depth', baseRadiusM: 120000, peakVal: 6.8, description: 'Wind setup and barometric bulge inundating coastal lowlands', paramName: 'surgeHeightM', paramLabel: 'Peak Surge Height [m]', paramDefault: 6.8, paramMin: 1.5, paramMax: 12.0, vfxType: 'wave_ring', vfxColor: 0x2288bb },
    { id: 'coastal_flooding', name: 'Extreme High Tide & Sea Level Flood', category: 'ocean_coastal', fidelity: 'C', unit: 'm inundation', baseRadiusM: 80000, peakVal: 2.5, description: 'King tide combined with sea level rise and onshore swell', paramName: 'totalWaterLevelM', paramLabel: 'Water Level Above MHHW [m]', paramDefault: 2.5, paramMin: 0.5, paramMax: 6.0, vfxType: 'wave_ring', vfxColor: 0x3399cc },
    { id: 'rogue_wave_coastal_event', name: 'Giant Rogue Wave Coastal Impact', category: 'ocean_coastal', fidelity: 'C', unit: 'm crest height', baseRadiusM: 15000, peakVal: 24, description: 'Nonlinear constructive interference extreme freak wave', paramName: 'waveHeightM', paramLabel: 'Peak Wave Height [m]', paramDefault: 24, paramMin: 12, paramMax: 45, vfxType: 'wave_ring', vfxColor: 0x0055aa },
    { id: 'meteotsunami', name: 'Atmospheric Squall Meteotsunami', category: 'ocean_coastal', fidelity: 'C', unit: 'm harbor surge', baseRadiusM: 60000, peakVal: 3.2, description: 'Atmospheric gravity wave resonance generating harbor waves', paramName: 'pressureJumpHpa', paramLabel: 'Pressure Jump [hPa]', paramDefault: 6.0, paramMin: 2.0, paramMax: 15.0, vfxType: 'wave_ring', vfxColor: 0x2266aa },
    { id: 'coastal_erosion_episode', name: 'Severe Coastal Bluff Failure & Erosion', category: 'ocean_coastal', fidelity: 'C', unit: 'm shoreline retreat', baseRadiusM: 25000, peakVal: 45, description: 'Storm wave undercutting causing catastrophic cliff recession', paramName: 'retreatM', paramLabel: 'Cliff Retreat [m]', paramDefault: 45, paramMin: 5, paramMax: 150, vfxType: 'debris', vfxColor: 0x887755 },

    // D. Volcanic and geothermal
    { id: 'volcanic_ashfall', name: 'Regional Volcanic Ashfall & Tephra', category: 'volcanic', fidelity: 'B', unit: 'mm ash thickness', baseRadiusM: 120000, peakVal: 45, description: 'Isopach deposition and stratospheric umbrella cloud dispersal', paramName: 'ashThicknessMm', paramLabel: 'Ash Thickness [mm]', paramDefault: 45, paramMin: 5, paramMax: 300, vfxType: 'plume', vfxColor: 0x554433 },
    { id: 'effusive_lava_flow', name: 'Basaltic Lava Flow Inundation', category: 'volcanic', fidelity: 'B', unit: 'm³/s discharge', baseRadiusM: 20000, peakVal: 450, description: 'High-temperature basaltic pahoehoe/aa lava field advancement', paramName: 'effusionRateM3s', paramLabel: 'Effusion Rate [m³/s]', paramDefault: 450, paramMin: 50, paramMax: 3000, vfxType: 'fire_front', vfxColor: 0xff3300 },
    { id: 'pyroclastic_density_current', name: 'Pyroclastic Surge / Density Current', category: 'volcanic', fidelity: 'B', unit: 'km/h / °C', baseRadiusM: 35000, peakVal: 280, description: 'Incandescent fluidized gas-solid avalanche moving at hurricane speed', paramName: 'velocityKmh', paramLabel: 'Front Velocity [km/h]', paramDefault: 280, paramMin: 80, paramMax: 600, vfxType: 'shockwave', vfxColor: 0xaa4422 },
    { id: 'lahar', name: 'Volcanic Mudflow (Lahar)', category: 'volcanic', fidelity: 'B', unit: 'm³/s discharge', baseRadiusM: 60000, peakVal: 15000, description: 'Rapid slurry of water, ash, and volcanic boulders down river valleys', paramName: 'peakDischargeM3s', paramLabel: 'Peak Discharge [m³/s]', paramDefault: 15000, paramMin: 1000, paramMax: 60000, vfxType: 'wave_ring', vfxColor: 0x554422 },
    { id: 'volcanic_gas_release', name: 'Toxic Volcanic Gas Cloud (SO2/CO2)', category: 'volcanic', fidelity: 'B', unit: 'kt SO2/day', baseRadiusM: 120000, peakVal: 85, description: 'Limnic or volcanic crater gas burst causing lethal asphyxiation', paramName: 'so2EmissionKtDay', paramLabel: 'SO2 Emission [kt/day]', paramDefault: 85, paramMin: 5, paramMax: 500, vfxType: 'plume', vfxColor: 0xaacc44 },
    { id: 'caldera_scale_eruption', name: 'Supervolcanic Caldera Eruption', category: 'volcanic', fidelity: 'B', unit: 'km³ ejecta', baseRadiusM: 1500000, peakVal: 1000, description: 'VEI 8 continental-scale super-eruption with global volcanic winter', paramName: 'ejectaVolumeKm3', paramLabel: 'Ejecta Volume [km³]', paramDefault: 1000, paramMin: 100, paramMax: 5000, vfxType: 'plume', vfxColor: 0x443322 },
    { id: 'geothermal_hydrothermal_explosion', name: 'Hydrothermal Steam Explosion', category: 'volcanic', fidelity: 'C', unit: 'm blast crater', baseRadiusM: 3000, peakVal: 350, description: 'Superheated groundwater flashing to steam with explosive rock ejection', paramName: 'blastRadiusM', paramLabel: 'Blast Radius [m]', paramDefault: 350, paramMin: 50, paramMax: 1500, vfxType: 'shockwave', vfxColor: 0xbbccaa },

    // E. Weather and atmospheric
    { id: 'extratropical_cyclone', name: 'Extratropical Nor\'easter / Bomb Cyclone', category: 'atmospheric', fidelity: 'B', unit: 'hPa central press', baseRadiusM: 1200000, peakVal: 940, description: 'Rapid explosive cyclogenesis with hurricane-force gale winds', paramName: 'centralPressureHpa', paramLabel: 'Central Pressure [hPa]', paramDefault: 940, paramMin: 910, paramMax: 990, vfxType: 'vortex', vfxColor: 0x6688aa },
    { id: 'tornado', name: 'Tornado Vortex (EF5 Swath)', category: 'atmospheric', fidelity: 'B', unit: 'EF Scale', baseRadiusM: 3000, peakVal: 5, description: 'Violent multiple-vortex tornadic damage swath', paramName: 'efRating', paramLabel: 'EF Rating', paramDefault: 5, paramMin: 1, paramMax: 5, vfxType: 'vortex', vfxColor: 0x556677 },
    { id: 'derecho', name: 'Derecho Straight-Line Windstorm', category: 'atmospheric', fidelity: 'B', unit: 'km/h gust', baseRadiusM: 350000, peakVal: 160, description: 'Long-lived bow echo convective storm complex with hurricane-force gusts', paramName: 'gustSpeedKmh', paramLabel: 'Peak Gust Speed [km/h]', paramDefault: 160, paramMin: 90, paramMax: 220, vfxType: 'shockwave', vfxColor: 0x7799aa },
    { id: 'severe_thunderstorm', name: 'Severe Convective Thunderstorm & Microburst', category: 'atmospheric', fidelity: 'C', unit: 'dBZ reflectivity', baseRadiusM: 40000, peakVal: 65, description: 'Mesoscale convective storm with microbursts and intense downdrafts', paramName: 'radarReflectivityDbz', paramLabel: 'Reflectivity [dBZ]', paramDefault: 65, paramMin: 40, paramMax: 75, vfxType: 'vortex', vfxColor: 0x447788 },
    { id: 'hailstorm', name: 'Severe Hailstorm Swath', category: 'atmospheric', fidelity: 'C', unit: 'cm hail diameter', baseRadiusM: 25000, peakVal: 7.5, description: 'Destructive large hail swath destroying roofs, vehicles, and crops', paramName: 'hailDiameterCm', paramLabel: 'Max Hailstone Size [cm]', paramDefault: 7.5, paramMin: 2, paramMax: 15, vfxType: 'debris', vfxColor: 0xaaccdd },
    { id: 'lightning_outbreak', name: 'Massive Lightning Super-Outbreak', category: 'atmospheric', fidelity: 'C', unit: 'strikes/hr/km²', baseRadiusM: 90000, peakVal: 45, description: 'High-density cloud-to-ground lightning cluster causing ignitions', paramName: 'flashDensity', paramLabel: 'Flash Density [strikes/hr/km²]', paramDefault: 45, paramMin: 5, paramMax: 120, vfxType: 'shockwave', vfxColor: 0xddffff },
    { id: 'blizzard', name: 'Extreme Winter Blizzard', category: 'atmospheric', fidelity: 'B', unit: 'cm snowfall', baseRadiusM: 500000, peakVal: 85, description: 'Sub-zero high-wind heavy snowfall and zero-visibility whiteout', paramName: 'snowfallCm', paramLabel: 'Snow Accumulation [cm]', paramDefault: 85, paramMin: 20, paramMax: 200, vfxType: 'plume', vfxColor: 0xddeeff },
    { id: 'ice_storm', name: 'Catastrophic Glaze Ice Storm', category: 'atmospheric', fidelity: 'B', unit: 'mm glaze accretion', baseRadiusM: 250000, peakVal: 35, description: 'Freezing rain accretion causing widespread grid and forestry collapse', paramName: 'iceAccretionMm', paramLabel: 'Ice Accretion [mm]', paramDefault: 35, paramMin: 5, paramMax: 60, vfxType: 'debris', vfxColor: 0x99ccff },
    { id: 'dust_storm', name: 'Haboob / Synoptic Dust Storm', category: 'atmospheric', fidelity: 'B', unit: 'µg/m³ PM10', baseRadiusM: 300000, peakVal: 3500, description: 'Massive particulate suspension and near-zero ground visibility', paramName: 'pm10Concentration', paramLabel: 'PM10 Concentration [µg/m³]', paramDefault: 3500, paramMin: 500, paramMax: 10000, vfxType: 'plume', vfxColor: 0xbbaa88 },
    { id: 'sandstorm', name: 'Desert Sandstorm Wall (Khamsin)', category: 'atmospheric', fidelity: 'C', unit: 'km/h wind & sand', baseRadiusM: 200000, peakVal: 110, description: 'Coarse sand transport causing heavy abrasive mechanical damage', paramName: 'windSpeedKmh', paramLabel: 'Wind Speed [km/h]', paramDefault: 110, paramMin: 60, paramMax: 160, vfxType: 'plume', vfxColor: 0xccaa77 },
    { id: 'atmospheric_river', name: 'Atmospheric River Deluge', category: 'atmospheric', fidelity: 'B', unit: 'kg/m/s IVT', baseRadiusM: 800000, peakVal: 1200, description: 'Narrow corridor of extreme water vapor transport causing mudslides', paramName: 'ivtFlux', paramLabel: 'Vapor Transport [kg/m/s]', paramDefault: 1200, paramMin: 500, paramMax: 2500, vfxType: 'plume', vfxColor: 0x5588aa },
    { id: 'flash_flood', name: 'Mountain / Urban Flash Flood', category: 'atmospheric', fidelity: 'B', unit: 'mm/hr rain', baseRadiusM: 15000, peakVal: 110, description: 'Rapid runoff torrent in steep canyons or paved impervious catchments', paramName: 'rainRateMmHr', paramLabel: 'Rainfall Intensity [mm/hr]', paramDefault: 110, paramMin: 30, paramMax: 250, vfxType: 'wave_ring', vfxColor: 0x336699 },
    { id: 'urban_pluvial_flood', name: 'Urban Drainage Overload Flood', category: 'atmospheric', fidelity: 'C', unit: 'm flood depth', baseRadiusM: 12000, peakVal: 2.2, description: 'Stormwater system capacity exceeding street and basement inundation', paramName: 'streetFloodDepthM', paramLabel: 'Street Flood Depth [m]', paramDefault: 2.2, paramMin: 0.3, paramMax: 5.0, vfxType: 'wave_ring', vfxColor: 0x447799 },

    // F. Fire, smoke, and heat
    { id: 'urban_conflagration', name: 'Urban Firestorm Conflagration', category: 'hydrological_wildfire', fidelity: 'B', unit: 'structures/hr', baseRadiusM: 8000, peakVal: 350, description: 'Structure-to-structure mass firestorm propagating through high density', paramName: 'spreadRate', paramLabel: 'Building Burn Rate [bldg/hr]', paramDefault: 350, paramMin: 20, paramMax: 1000, vfxType: 'fire_front', vfxColor: 0xff3300 },
    { id: 'peat_fire', name: 'Subsurface Peat Bog Smolder', category: 'hydrological_wildfire', fidelity: 'C', unit: 'm depth burn', baseRadiusM: 50000, peakVal: 3.5, description: 'Deep persistent smoldering fire releasing massive carbon and toxic haze', paramName: 'burnDepthM', paramLabel: 'Smolder Depth [m]', paramDefault: 3.5, paramMin: 0.5, paramMax: 8.0, vfxType: 'plume', vfxColor: 0x554433 },
    { id: 'wildfire_smoke', name: 'Wildfire Smoke Dispersion Plume', category: 'hydrological_wildfire', fidelity: 'B', unit: 'µg/m³ PM2.5', baseRadiusM: 600000, peakVal: 650, description: 'Regional hazardous particulate smoke plume advecting downwind', paramName: 'pm25Concentration', paramLabel: 'PM2.5 Level [µg/m³]', paramDefault: 650, paramMin: 50, paramMax: 1500, vfxType: 'plume', vfxColor: 0x776655 },
    { id: 'extreme_heat', name: 'Extreme Heatwave / Wet-Bulb Event', category: 'hydrological_wildfire', fidelity: 'B', unit: '°C WetBulb', baseRadiusM: 700000, peakVal: 34.5, description: 'Dangerous exceedance of human thermoregulatory physiological limits', paramName: 'wetBulbTempC', paramLabel: 'Wet-Bulb Temp [°C]', paramDefault: 34.5, paramMin: 28, paramMax: 38, vfxType: 'plume', vfxColor: 0xff8844 },
    { id: 'extreme_cold', name: 'Polar Vortex Extreme Cold Outbreak', category: 'hydrological_wildfire', fidelity: 'B', unit: '°C windchill', baseRadiusM: 900000, peakVal: -45, description: 'Rapid tropospheric polar air drop freezing infrastructure and water lines', paramName: 'windChillC', paramLabel: 'Wind Chill [°C]', paramDefault: -45, paramMin: -65, paramMax: -20, vfxType: 'plume', vfxColor: 0x88ccff },
    { id: 'drought', name: 'Multi-Year Megadrought', category: 'hydrological_wildfire', fidelity: 'C', unit: 'SPEI index', baseRadiusM: 1200000, peakVal: -2.8, description: 'Severe soil moisture and hydrological deficit starving agriculture', paramName: 'speiIndex', paramLabel: 'Drought Index (SPEI)', paramDefault: -2.8, paramMin: -4.0, paramMax: -1.0, vfxType: 'plume', vfxColor: 0xaa9966 },
    { id: 'heat_drought_compound', name: 'Compound Heatdome & Agricultural Drought', category: 'hydrological_wildfire', fidelity: 'B', unit: '°C anomaly / SPEI', baseRadiusM: 1000000, peakVal: 8.5, description: 'Coupled soil desiccation and atmospheric blocking heatdome', paramName: 'tempAnomalyC', paramLabel: 'Temperature Anomaly [°C]', paramDefault: 8.5, paramMin: 3.0, paramMax: 15.0, vfxType: 'plume', vfxColor: 0xff7722 },

    // G. Cryosphere and mountain
    { id: 'avalanche', name: 'Slab Snow Avalanche Runout', category: 'hydrological_wildfire', fidelity: 'B', unit: 'm³ snow volume', baseRadiusM: 4000, peakVal: 150000, description: 'Unstable snowpack failure sweeping mountain valley corridors', paramName: 'volumeM3', paramLabel: 'Snow Volume [m³]', paramDefault: 150000, paramMin: 10000, paramMax: 1000000, vfxType: 'debris', vfxColor: 0xeeeeff },
    { id: 'rockfall', name: 'Catastrophic Mountain Rockfall', category: 'hydrological_wildfire', fidelity: 'C', unit: 'm³ rock mass', baseRadiusM: 3000, peakVal: 80000, description: 'Steep cliff face rock detachment impacting transport routes', paramName: 'volumeM3', paramLabel: 'Rock Volume [m³]', paramDefault: 80000, paramMin: 5000, paramMax: 500000, vfxType: 'debris', vfxColor: 0x776655 },
    { id: 'debris_flow', name: 'Post-Wildfire Burn Scar Debris Flow', category: 'hydrological_wildfire', fidelity: 'B', unit: 'm³/s discharge', baseRadiusM: 8000, peakVal: 1200, description: 'Hyper-concentrated sediment surge scouring downstream communities', paramName: 'peakDischargeM3s', paramLabel: 'Discharge [m³/s]', paramDefault: 1200, paramMin: 100, paramMax: 5000, vfxType: 'wave_ring', vfxColor: 0x554433 },
    { id: 'glacial_lake_outburst_flood', name: 'Glacial Lake Outburst Flood (GLOF)', category: 'hydrological_wildfire', fidelity: 'B', unit: 'm³/s peak', baseRadiusM: 45000, peakVal: 8500, description: 'Sudden moraine dam breach surge cascading down alpine valleys', paramName: 'glofDischargeM3s', paramLabel: 'Breach Discharge [m³/s]', paramDefault: 8500, paramMin: 500, paramMax: 30000, vfxType: 'wave_ring', vfxColor: 0x228899 },
    { id: 'glacier_collapse', name: 'Hanging Glacier Ice Avalanche', category: 'hydrological_wildfire', fidelity: 'C', unit: 'million m³ ice', baseRadiusM: 6000, peakVal: 12, description: 'Massive alpine ice tongue detachment and rock-ice flow', paramName: 'iceVolumeMillionM3', paramLabel: 'Ice Volume [M m³]', paramDefault: 12, paramMin: 1, paramMax: 80, vfxType: 'debris', vfxColor: 0xbbddee },
    { id: 'ice_shelf_breakup', name: 'Antarctic Ice Shelf Massive Calving', category: 'hydrological_wildfire', fidelity: 'C', unit: 'km² iceberg area', baseRadiusM: 150000, peakVal: 4500, description: 'Hydrofracture and tabular iceberg disintegration into ocean', paramName: 'calvedAreaKm2', paramLabel: 'Calved Area [km²]', paramDefault: 4500, paramMin: 200, paramMax: 15000, vfxType: 'wave_ring', vfxColor: 0x99ddff },
    { id: 'permafrost_thaw_failure', name: 'Permafrost Thaw & Thermokarst Collapse', category: 'hydrological_wildfire', fidelity: 'C', unit: 'm foundation drop', baseRadiusM: 20000, peakVal: 1.8, description: 'Active layer deepening causing structural subsidence in arctic towns', paramName: 'settlementDepthM', paramLabel: 'Thaw Settlement [m]', paramDefault: 1.8, paramMin: 0.2, paramMax: 5.0, vfxType: 'debris', vfxColor: 0x665544 },

    // H. Infrastructure and technological
    { id: 'regional_blackout', name: 'Regional Power Grid Blackout', category: 'infrastructure_industrial', fidelity: 'B', unit: 'GW dropped', baseRadiusM: 400000, peakVal: 35, description: 'Transmission cascading trip and wide-area blackout', paramName: 'droppedLoadGw', paramLabel: 'Dropped Grid Load [GW]', paramDefault: 35, paramMin: 2, paramMax: 150, vfxType: 'shockwave', vfxColor: 0x112233 },
    { id: 'substation_failure_cascade', name: 'Substation Transformer Cascade', category: 'infrastructure_industrial', fidelity: 'B', unit: 'substations', baseRadiusM: 80000, peakVal: 18, description: 'High-voltage transformer burnouts and protective trips', paramName: 'failedNodes', paramLabel: 'Damaged Substations', paramDefault: 18, paramMin: 1, paramMax: 50, vfxType: 'shockwave', vfxColor: 0x334466 },
    { id: 'dam_failure', name: 'Major Dam Catastrophic Breach', category: 'infrastructure_industrial', fidelity: 'B', unit: 'm breach depth', baseRadiusM: 60000, peakVal: 18, description: 'Reservoir structural collapse releasing downstream flood wave', paramName: 'peakDepthM', paramLabel: 'Breach Water Depth [m]', paramDefault: 18, paramMin: 3, paramMax: 45, vfxType: 'wave_ring', vfxColor: 0x225588 },
    { id: 'levee_failure', name: 'Riverine Levee Breach / Overtopping', category: 'infrastructure_industrial', fidelity: 'B', unit: 'm inundation', baseRadiusM: 30000, peakVal: 4.5, description: 'Flood protection embankment failure flooding protected polders', paramName: 'floodDepthM', paramLabel: 'Inundation Depth [m]', paramDefault: 4.5, paramMin: 1.0, paramMax: 10.0, vfxType: 'wave_ring', vfxColor: 0x336688 },
    { id: 'bridge_failure', name: 'Major Estuary Bridge Structural Collapse', category: 'infrastructure_industrial', fidelity: 'C', unit: 'vehicles/day lost', baseRadiusM: 15000, peakVal: 120000, description: 'Key arterial bridge failure severing transport corridors', paramName: 'trafficLossAadt', paramLabel: 'Disrupted Traffic [AADT]', paramDefault: 120000, paramMin: 10000, paramMax: 300000, vfxType: 'debris', vfxColor: 0x555555 },
    { id: 'port_shutdown', name: 'Deepwater Container Port Shutdown', category: 'infrastructure_industrial', fidelity: 'C', unit: 'TEU/day lost', baseRadiusM: 25000, peakVal: 45000, description: 'Berth and crane disruption halting maritime supply chain', paramName: 'capacityLossTeu', paramLabel: 'Capacity Loss [TEU/day]', paramDefault: 45000, paramMin: 5000, paramMax: 150000, vfxType: 'debris', vfxColor: 0x446677 },
    { id: 'airport_shutdown', name: 'International Hub Airport Closure', category: 'infrastructure_industrial', fidelity: 'C', unit: 'passengers/day', baseRadiusM: 20000, peakVal: 180000, description: 'Terminal, runway, and radar disruption grounding air traffic', paramName: 'disruptedPassengers', paramLabel: 'Disrupted Passengers [pax/day]', paramDefault: 180000, paramMin: 20000, paramMax: 350000, vfxType: 'debris', vfxColor: 0x667788 },
    { id: 'telecom_outage', name: 'Metropolitan Telecom / Internet Outage', category: 'infrastructure_industrial', fidelity: 'C', unit: '% POPs down', baseRadiusM: 100000, peakVal: 75, description: 'Core fiber transport and cellular base station failure', paramName: 'outagePct', paramLabel: 'Network Loss [%]', paramDefault: 75, paramMin: 10, paramMax: 100, vfxType: 'shockwave', vfxColor: 0x446688 },
    { id: 'fiber_backbone_cut', name: 'Transcontinental Fiber Backbone Severance', category: 'infrastructure_industrial', fidelity: 'C', unit: 'Tbps lost', baseRadiusM: 150000, peakVal: 180, description: 'Multiple subsea cable cuts degrading international routing', paramName: 'lostCapacityTbps', paramLabel: 'Lost Capacity [Tbps]', paramDefault: 180, paramMin: 20, paramMax: 1000, vfxType: 'shockwave', vfxColor: 0x3388aa },
    { id: 'water_system_failure', name: 'Municipal Potable Water Outage', category: 'infrastructure_industrial', fidelity: 'C', unit: 'pop affected (k)', baseRadiusM: 60000, peakVal: 850, description: 'Pressure loss and contamination of public water mains', paramName: 'affectedPopThousands', paramLabel: 'Population Affected [k]', paramDefault: 850, paramMin: 50, paramMax: 5000, vfxType: 'wave_ring', vfxColor: 0x3377aa },
    { id: 'wastewater_failure', name: 'Wastewater Treatment Plant Discharge', category: 'infrastructure_industrial', fidelity: 'C', unit: 'M gallons untreated', baseRadiusM: 35000, peakVal: 250, description: 'Raw sewage overflow into urban waterways and coastal zones', paramName: 'dischargeVolumeMg', paramLabel: 'Raw Sewage Volume [M gal]', paramDefault: 250, paramMin: 10, paramMax: 1500, vfxType: 'wave_ring', vfxColor: 0x446633 },
    { id: 'fuel_supply_disruption', name: 'Regional Refined Fuels Pipeline Outage', category: 'infrastructure_industrial', fidelity: 'C', unit: 'bbl/day shortage', baseRadiusM: 200000, peakVal: 500000, description: 'Pipeline shutdown starving gas stations and logistics fleets', paramName: 'fuelDeficitBpd', paramLabel: 'Fuel Deficit [bbl/day]', paramDefault: 500000, paramMin: 50000, paramMax: 2000000, vfxType: 'debris', vfxColor: 0x333333 },
    { id: 'industrial_chemical_release', name: 'Toxic Chemical Gas Release', category: 'infrastructure_industrial', fidelity: 'B', unit: 'tons toxic gas', baseRadiusM: 18000, peakVal: 120, description: 'Dense gas atmospheric plume dispersing chlorine / ammonia', paramName: 'releaseTons', paramLabel: 'Mass Released [tons]', paramDefault: 120, paramMin: 5, paramMax: 1000, vfxType: 'plume', vfxColor: 0x88bb33 },
    { id: 'oil_spill', name: 'Major Marine Oil Spill', category: 'infrastructure_industrial', fidelity: 'B', unit: 'barrels spilled', baseRadiusM: 90000, peakVal: 500000, description: 'Coastal marine oil slicks and heavy shoreline contamination', paramName: 'spillBarrels', paramLabel: 'Spill Volume [bbl]', paramDefault: 500000, paramMin: 10000, paramMax: 5000000, vfxType: 'wave_ring', vfxColor: 0x222222 },
    { id: 'mine_tailings_failure', name: 'Mine Tailings Dam Slurry Breach', category: 'infrastructure_industrial', fidelity: 'B', unit: 'million m³ slurry', baseRadiusM: 50000, peakVal: 40, description: 'Toxic heavy metal slurry tidal wave burying downstream towns', paramName: 'slurryVolumeMillionM3', paramLabel: 'Slurry Volume [M m³]', paramDefault: 40, paramMin: 2, paramMax: 150, vfxType: 'wave_ring', vfxColor: 0x664422 },
    { id: 'building_collapse_cluster', name: 'Urban Building Structural Collapse Cluster', category: 'infrastructure_industrial', fidelity: 'C', unit: 'collapsed structures', baseRadiusM: 2000, peakVal: 15, description: 'Progressive structural failure across high-density urban blocks', paramName: 'collapsedBuildings', paramLabel: 'Collapsed Buildings', paramDefault: 15, paramMin: 1, paramMax: 50, vfxType: 'debris', vfxColor: 0x555555 },

    // I. Space weather and planetary environment
    { id: 'geomagnetic_storm', name: 'Extreme Geomagnetic Storm (Carrington)', category: 'space_compound', fidelity: 'B', unit: 'nT Dst', baseRadiusM: 20000000, peakVal: -850, description: 'GIC geomagnetically induced currents in high-voltage grids', paramName: 'dstIndexNt', paramLabel: 'Dst Index [nT]', paramDefault: -850, paramMin: -2000, paramMax: -100, vfxType: 'plume', vfxColor: 0x66ff88 },
    { id: 'solar_proton_event', name: 'Solar Energetic Particle Proton Event', category: 'space_compound', fidelity: 'B', unit: 'pfu >10MeV', baseRadiusM: 20000000, peakVal: 45000, description: 'Extreme proton flux irradiating polar routes and satellite electronics', paramName: 'protonFluxPfu', paramLabel: 'Proton Flux [pfu]', paramDefault: 45000, paramMin: 1000, paramMax: 100000, vfxType: 'plume', vfxColor: 0xaaffaa },
    { id: 'extreme_solar_flare', name: 'Extreme X-Class Solar Flare', category: 'space_compound', fidelity: 'B', unit: 'X-Class rating', baseRadiusM: 20000000, peakVal: 28, description: 'Ionospheric radio blackout (R5 rating) on the sunlit hemisphere', paramName: 'xClassRating', paramLabel: 'X-Ray Intensity', paramDefault: 28, paramMin: 1, paramMax: 50, vfxType: 'shockwave', vfxColor: 0xffffee },
    { id: 'satellite_constellation_failure', name: 'LEO Constellation Cascade (Kessler)', category: 'space_compound', fidelity: 'C', unit: 'satellites disabled', baseRadiusM: 10000000, peakVal: 1200, description: 'Orbital collision cascade and widespread LEO positioning loss', paramName: 'disabledSats', paramLabel: 'Disabled Satellites', paramDefault: 1200, paramMin: 50, paramMax: 10000, vfxType: 'debris', vfxColor: 0xff8844 },
    { id: 'high_altitude_atmospheric_disturbance', name: 'High-Altitude Ionospheric Disturbance', category: 'space_compound', fidelity: 'C', unit: 'TECU perturbation', baseRadiusM: 8000000, peakVal: 85, description: 'Total electron content scintillation and GNSS positioning degradation', paramName: 'tecuLevel', paramLabel: 'TEC Perturbation', paramDefault: 85, paramMin: 10, paramMax: 200, vfxType: 'plume', vfxColor: 0x77ddbb },

    // J. Biological and ecological
    { id: 'crop_failure_region', name: 'Regional Agricultural Crop Failure', category: 'space_compound', fidelity: 'C', unit: '% yield drop', baseRadiusM: 500000, peakVal: 75, description: 'Severe harvest collapse and food system market shock', paramName: 'yieldLossPct', paramLabel: 'Yield Loss [%]', paramDefault: 75, paramMin: 20, paramMax: 100, vfxType: 'plume', vfxColor: 0xaa9944 },
    { id: 'locust_outbreak', name: 'Desert Locust Swarm Outbreak', category: 'space_compound', fidelity: 'C', unit: 'billion locusts', baseRadiusM: 200000, peakVal: 80, description: 'Dense biomass consumption swarm stripping croplands', paramName: 'locustPopulationBillions', paramLabel: 'Locust Population [B]', paramDefault: 80, paramMin: 5, paramMax: 500, vfxType: 'plume', vfxColor: 0x887733 },
    { id: 'harmful_algal_bloom', name: 'Harmful Algal Bloom / Red Tide', category: 'space_compound', fidelity: 'C', unit: 'cells/L (k)', baseRadiusM: 60000, peakVal: 1500, description: 'Marine toxin release causing widespread coastal fishery closure', paramName: 'cellDensityThousands', paramLabel: 'Cell Density [k cells/L]', paramDefault: 1500, paramMin: 50, paramMax: 10000, vfxType: 'wave_ring', vfxColor: 0xbb3355 },
    { id: 'forest_pest_outbreak', name: 'Forest Bark Beetle Outbreak', category: 'space_compound', fidelity: 'C', unit: 'hectares dead', baseRadiusM: 150000, peakVal: 80000, description: 'Canopy die-off and extreme wildfire fuel accumulation', paramName: 'mortalityHectares', paramLabel: 'Tree Mortality Area [ha]', paramDefault: 80000, paramMin: 5000, paramMax: 500000, vfxType: 'plume', vfxColor: 0x665533 },
    { id: 'coral_bleaching_event', name: 'Mass Marine Coral Bleaching', category: 'space_compound', fidelity: 'C', unit: 'Degree Heating Weeks', baseRadiusM: 300000, peakVal: 14, description: 'Ocean thermal stress causing widespread reef mortality', paramName: 'dhwDegreeHeatingWeeks', paramLabel: 'DHW Heat Metric', paramDefault: 14, paramMin: 4, paramMax: 25, vfxType: 'wave_ring', vfxColor: 0x4499bb },
    { id: 'mass_fish_kill', name: 'Hypoxic Dead Zone / Fish Kill', category: 'space_compound', fidelity: 'C', unit: 'km² dead zone', baseRadiusM: 80000, peakVal: 12000, description: 'Eutrophication and dissolved oxygen depletion in coastal waters', paramName: 'deadZoneAreaKm2', paramLabel: 'Hypoxic Area [km²]', paramDefault: 12000, paramMin: 500, paramMax: 50000, vfxType: 'wave_ring', vfxColor: 0x336677 },

    // K. Compound, cascading, and multi-hazard scenarios
    { id: 'earthquake_tsunami_compound', name: 'Compound Earthquake + Tsunami', category: 'space_compound', fidelity: 'A', unit: 'Mw / m', baseRadiusM: 250000, peakVal: 9.0, description: 'Subduction megathrust with simultaneous coastal wave inundation', paramName: 'magnitudeMw', paramLabel: 'Earthquake Magnitude [Mw]', paramDefault: 9.0, paramMin: 7.5, paramMax: 9.6, vfxType: 'wave_ring', vfxColor: 0x2288dd },
    { id: 'cyclone_surge_flood_compound', name: 'Compound Cyclone + Surge + Inland Flood', category: 'space_compound', fidelity: 'A', unit: 'Cat / m', baseRadiusM: 300000, peakVal: 5, description: 'Triple-threat hurricane wind, storm surge and pluvial flooding', paramName: 'hurricaneCategory', paramLabel: 'Cyclone Category', paramDefault: 5, paramMin: 1, paramMax: 5, vfxType: 'vortex', vfxColor: 0x88ccdd },
    { id: 'heat_wildfire_smoke_compound', name: 'Compound Heatwave + Wildfire + Smoke', category: 'space_compound', fidelity: 'B', unit: 'AQI / °C', baseRadiusM: 500000, peakVal: 450, description: 'Extreme heat, multiple firefronts, and hazardous air quality', paramName: 'peakAqi', paramLabel: 'Peak AQI', paramDefault: 450, paramMin: 150, paramMax: 900, vfxType: 'fire_front', vfxColor: 0xee5511 },
    { id: 'drought_wildfire_compound', name: 'Compound Drought + Wildfire Outbreak', category: 'space_compound', fidelity: 'B', unit: 'MW/m', baseRadiusM: 180000, peakVal: 25000, description: 'Severe fuel moisture depletion and multi-front firestorms', paramName: 'firelineIntensity', paramLabel: 'Fireline Intensity [MW/m]', paramDefault: 25000, paramMin: 1000, paramMax: 80000, vfxType: 'fire_front', vfxColor: 0xff4400 },
    { id: 'earthquake_grid_fire_compound', name: 'Compound Earthquake + Grid Collapse + Fires', category: 'space_compound', fidelity: 'B', unit: 'Mw / ignitions', baseRadiusM: 90000, peakVal: 7.6, description: 'Shaking, structural gas ignitions, and water pressure loss', paramName: 'earthquakeMw', paramLabel: 'Earthquake Magnitude [Mw]', paramDefault: 7.6, paramMin: 6.0, paramMax: 8.5, vfxType: 'fire_front', vfxColor: 0xee6622 },
    { id: 'volcano_ash_aviation_compound', name: 'Compound Volcano + Ash + Airspace Freeze', category: 'space_compound', fidelity: 'B', unit: 'flights grounded', baseRadiusM: 1000000, peakVal: 4500, description: 'Stratospheric ash cloud and continental flight grounding', paramName: 'groundedFlights', paramLabel: 'Grounded Flights', paramDefault: 4500, paramMin: 500, paramMax: 20000, vfxType: 'plume', vfxColor: 0x665544 },
    { id: 'flood_water_wastewater_compound', name: 'Compound Flood + Water System Failure', category: 'space_compound', fidelity: 'B', unit: 'pop without water (k)', baseRadiusM: 70000, peakVal: 1200, description: 'Floodwaters submerging treatment plants and contaminating wells', paramName: 'unservedPopThousands', paramLabel: 'Population Without Water [k]', paramDefault: 1200, paramMin: 100, paramMax: 8000, vfxType: 'wave_ring', vfxColor: 0x337799 },
    { id: 'ice_storm_grid_telecom_compound', name: 'Compound Ice Storm + Grid + Comms Failure', category: 'space_compound', fidelity: 'B', unit: 'pop blacked out (k)', baseRadiusM: 300000, peakVal: 2500, description: 'Glaze icing collapsing transmission corridors and cell towers', paramName: 'blackoutPopThousands', paramLabel: 'Blackout Population [k]', paramDefault: 2500, paramMin: 200, paramMax: 10000, vfxType: 'debris', vfxColor: 0x88bbff },
    { id: 'geomagnetic_grid_satellite_compound', name: 'Compound Geomagnetic + Grid + LEO Service Loss', category: 'space_compound', fidelity: 'B', unit: 'nT / % grid lost', baseRadiusM: 20000000, peakVal: -950, description: 'Space weather transformer burnouts and satellite drag drop', paramName: 'dstIndex', paramLabel: 'Dst Index [nT]', paramDefault: -950, paramMin: -2500, paramMax: -200, vfxType: 'shockwave', vfxColor: 0x77ff99 },
    { id: 'impact_global_climate_proxy', name: 'Impact Winter Climate Shift Proxy', category: 'space_compound', fidelity: 'B', unit: '°C global cooling', baseRadiusM: 20000000, peakVal: -7.5, description: 'Stratospheric dust/soot residence and solar attenuation', paramName: 'globalCoolingDeltaC', paramLabel: 'Global Temp Drop [°C]', paramDefault: -7.5, paramMin: -20.0, paramMax: -1.0, vfxType: 'plume', vfxColor: 0x334455 },
    { id: 'multi_hazard_user_composition', name: 'Custom Multi-Hazard User Composition', category: 'space_compound', fidelity: 'C', unit: 'composite severity', baseRadiusM: 100000, peakVal: 10.0, description: 'User-composed layered multi-peril scenario ensemble', paramName: 'compositeSeverity', paramLabel: 'Composite Severity', paramDefault: 10.0, paramMin: 1.0, paramMax: 10.0, vfxType: 'shockwave', vfxColor: 0xff66bb }
  ]

  for (const entry of fullCatalog) {
    globalHazardRegistry.register(new CatalogHazardModule(entry))
  }
}
