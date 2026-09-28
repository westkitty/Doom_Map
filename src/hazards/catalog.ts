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

interface GenericHazardDef {
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

class GenericHazardModule implements HazardModule {
  readonly id: string
  readonly name: string
  readonly category: HazardCategory
  readonly provenance: Provenance
  readonly parameterSchema: HazardParameterMeta[]
  private readonly def: GenericHazardDef

  constructor(def: GenericHazardDef) {
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
      sources: ['https://en.wikipedia.org/wiki/Disaster'],
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
        { radiusM: radiusM * 0.3, intensity: val, severity: 'extreme', label: `Extreme zone (${(val).toFixed(1)} ${this.def.unit})` },
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
    const scale = val / (this.def.paramDefault || 1)
    const maxRadiusM = this.def.baseRadiusM * Math.sqrt(Math.max(0.1, scale))

    const lat1 = origin.latitudeDeg * (Math.PI / 180), lon1 = origin.longitudeDeg * (Math.PI / 180)
    const lat2 = target.latitudeDeg * (Math.PI / 180), lon2 = target.longitudeDeg * (Math.PI / 180)
    const dLat = lat2 - lat1, dLon = lon2 - lon1
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2
    const distM = 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

    const localVal = distM < maxRadiusM ? val * (1 - distM / maxRadiusM) : 0
    return {
      intensity: localVal,
      unit: this.def.unit,
      description: `${this.name}: ${localVal.toFixed(1)} ${this.def.unit} at ${(distM / 1000).toFixed(1)} km`,
      fields: { localIntensity: localVal, distanceKm: distM / 1000 }
    }
  }
}

// Register Flagship Solvers (Fidelity A)
export function initHazardRegistry(): void {
  if (globalHazardRegistry.count() > 0) return

  globalHazardRegistry.register(new NuclearAirburstSolver())
  globalHazardRegistry.register(new AsteroidImpactSolver())
  globalHazardRegistry.register(new EarthquakeSolver())
  globalHazardRegistry.register(new TsunamiSolver())
  globalHazardRegistry.register(new TropicalCycloneSolver())
  globalHazardRegistry.register(new RiverFloodSolver())
  globalHazardRegistry.register(new VolcanicEruptionSolver())
  globalHazardRegistry.register(new WildfireSolver())

  // Catalog definition list (52 additional hazards covering all categories)
  const additionalHazards: GenericHazardDef[] = [
    // A. Explosive / Impact
    { id: 'nuclear_surface_burst', name: 'Nuclear Surface Burst', category: 'explosive_impact', fidelity: 'B', unit: 'kt', baseRadiusM: 8000, peakVal: 100, description: 'Ground contact nuclear burst with heavy fallout', paramName: 'yieldKt', paramLabel: 'Yield', paramDefault: 100, paramMin: 1, paramMax: 10000, vfxType: 'fireball', vfxColor: 0xffaa22 },
    { id: 'radiological_release', name: 'Radiological Dispersal', category: 'explosive_impact', fidelity: 'B', unit: 'TBq', baseRadiusM: 25000, peakVal: 500, description: 'Atmospheric radiological plume dispersion', paramName: 'activityTBq', paramLabel: 'Source Activity', paramDefault: 500, paramMin: 10, paramMax: 50000, vfxType: 'plume', vfxColor: 0x99cc44 },
    { id: 'asteroid_ocean_impact', name: 'Asteroid Ocean Impact', category: 'explosive_impact', fidelity: 'B', unit: 'MT', baseRadiusM: 50000, peakVal: 1000, description: 'Marine kinetic impact with mega-tsunami generation', paramName: 'energyMT', paramLabel: 'Energy', paramDefault: 1000, paramMin: 10, paramMax: 100000, vfxType: 'wave_ring', vfxColor: 0x2288bb },
    { id: 'comet_impact', name: 'Hypervelocity Comet Impact', category: 'explosive_impact', fidelity: 'B', unit: 'km/s', baseRadiusM: 80000, peakVal: 55, description: 'High-velocity volatile comet impact', paramName: 'velocityKms', paramLabel: 'Velocity', paramDefault: 55, paramMin: 30, paramMax: 72, vfxType: 'fireball', vfxColor: 0xffeeaa },
    { id: 'airburst_meteor', name: 'Meteor Airburst (Tunguska)', category: 'explosive_impact', fidelity: 'B', unit: 'MT', baseRadiusM: 30000, peakVal: 15, description: 'Atmospheric kinetic fragmentation and shockwave', paramName: 'energyMT', paramLabel: 'Energy', paramDefault: 15, paramMin: 0.5, paramMax: 100, vfxType: 'shockwave', vfxColor: 0xffcc33 },
    { id: 'orbital_debris_reentry', name: 'Orbital Debris Re-entry Corridor', category: 'explosive_impact', fidelity: 'C', unit: 'fragments', baseRadiusM: 120000, peakVal: 400, description: 'Spacecraft re-entry footprint swath', paramName: 'fragmentCount', paramLabel: 'Fragments', paramDefault: 400, paramMin: 50, paramMax: 5000, vfxType: 'debris', vfxColor: 0xff6622 },

    // B. Seismic & Crustal
    { id: 'earthquake_finite_fault', name: 'Finite Fault Rupture', category: 'seismic', fidelity: 'B', unit: 'Mw', baseRadiusM: 150000, peakVal: 7.8, description: 'Extended 100+ km linear fault rupture', paramName: 'magnitudeMw', paramLabel: 'Magnitude', paramDefault: 7.8, paramMin: 6.5, paramMax: 9.5, vfxType: 'wave_ring', vfxColor: 0xee5522 },
    { id: 'aftershock_sequence', name: 'Omori Aftershock Sequence', category: 'seismic', fidelity: 'B', unit: 'events/day', baseRadiusM: 60000, peakVal: 85, description: 'Decaying temporal aftershock distribution', paramName: 'initialRate', paramLabel: 'Initial Event Rate', paramDefault: 85, paramMin: 10, paramMax: 500, vfxType: 'wave_ring', vfxColor: 0xdd7733 },
    { id: 'surface_rupture', name: 'Surface Fault Offset Corridor', category: 'seismic', fidelity: 'B', unit: 'm offset', baseRadiusM: 40000, peakVal: 6.5, description: 'Ground displacement shear zone', paramName: 'slipOffsetM', paramLabel: 'Surface Offset', paramDefault: 6.5, paramMin: 0.5, paramMax: 15, vfxType: 'wave_ring', vfxColor: 0xaa5533 },
    { id: 'liquefaction', name: 'Soil Liquefaction Susceptibility', category: 'seismic', fidelity: 'C', unit: '% area', baseRadiusM: 25000, peakVal: 65, description: 'Saturated sediment bearing capacity loss', paramName: 'susceptibilityPct', paramLabel: 'Susceptibility', paramDefault: 65, paramMin: 10, paramMax: 100, vfxType: 'wave_ring', vfxColor: 0x998844 },
    { id: 'earthquake_landslide', name: 'Coseismic Landslide Outbreak', category: 'seismic', fidelity: 'B', unit: 'volume Mm³', baseRadiusM: 35000, peakVal: 45, description: 'Shaking-induced slope failure cascades', paramName: 'debrisVolumeMm3', paramLabel: 'Debris Volume', paramDefault: 45, paramMin: 1, paramMax: 500, vfxType: 'debris', vfxColor: 0x775533 },
    { id: 'sinkhole_collapse', name: 'Karst Sinkhole Collapse', category: 'seismic', fidelity: 'C', unit: 'm diameter', baseRadiusM: 500, peakVal: 80, description: 'Subsurface limestone dissolution void collapse', paramName: 'diameterM', paramLabel: 'Diameter', paramDefault: 80, paramMin: 10, paramMax: 300, vfxType: 'crater', vfxColor: 0x443322 },
    { id: 'subsidence_event', name: 'Regional Basin Subsidence', category: 'seismic', fidelity: 'C', unit: 'cm/yr', baseRadiusM: 80000, peakVal: 25, description: 'Groundwater/hydrocarbon extraction settlement', paramName: 'subsidenceRateCm', paramLabel: 'Subsidence Rate', paramDefault: 25, paramMin: 2, paramMax: 100, vfxType: 'wave_ring', vfxColor: 0x556677 },

    // C. Ocean & Coastal
    { id: 'tsunami_landslide', name: 'Submarine Landslide Tsunami', category: 'ocean_coastal', fidelity: 'B', unit: 'm runup', baseRadiusM: 60000, peakVal: 28, description: 'Localized mega-wave generated by slope slump', paramName: 'runupM', paramLabel: 'Peak Runup', paramDefault: 28, paramMin: 2, paramMax: 100, vfxType: 'wave_ring', vfxColor: 0x2277bb },
    { id: 'storm_surge', name: 'Extreme Storm Surge Inundation', category: 'ocean_coastal', fidelity: 'B', unit: 'm surge', baseRadiusM: 70000, peakVal: 6.5, description: 'Wind setup and barometric low-pressure surge', paramName: 'surgeHeightM', paramLabel: 'Surge Height', paramDefault: 6.5, paramMin: 1, paramMax: 12, vfxType: 'wave_ring', vfxColor: 0x338899 },
    { id: 'coastal_flooding', name: 'Combined Tide & Coastal Flooding', category: 'ocean_coastal', fidelity: 'C', unit: 'm level', baseRadiusM: 50000, peakVal: 4.2, description: 'Astronomical king tide and storm setup', paramName: 'waterLevelM', paramLabel: 'Water Level', paramDefault: 4.2, paramMin: 1, paramMax: 8, vfxType: 'wave_ring', vfxColor: 0x4499aa },
    { id: 'rogue_wave_coastal_event', name: 'Extreme Rogue Wave Swell', category: 'ocean_coastal', fidelity: 'C', unit: 'm height', baseRadiusM: 20000, peakVal: 22, description: 'Non-linear wave superposition packet', paramName: 'waveHeightM', paramLabel: 'Significant Height', paramDefault: 22, paramMin: 10, paramMax: 35, vfxType: 'wave_ring', vfxColor: 0x2266aa },
    { id: 'meteotsunami', name: 'Atmospheric Meteotsunami', category: 'ocean_coastal', fidelity: 'B', unit: 'm amplitude', baseRadiusM: 40000, peakVal: 3.5, description: 'Squall line resonance atmospheric pressure wave', paramName: 'amplitudeM', paramLabel: 'Amplitude', paramDefault: 3.5, paramMin: 0.5, paramMax: 6, vfxType: 'wave_ring', vfxColor: 0x337799 },

    // D. Volcanic
    { id: 'effusive_lava_flow', name: 'Effusive Basaltic Lava Flow', category: 'volcanic', fidelity: 'B', unit: 'm³/s', baseRadiusM: 15000, peakVal: 250, description: 'Hawaiian/Icelandic continuous lava effusion', paramName: 'effusionRateM3s', paramLabel: 'Effusion Rate', paramDefault: 250, paramMin: 10, paramMax: 2000, vfxType: 'fire_front', vfxColor: 0xff3300 },
    { id: 'pyroclastic_density_current', name: 'Pyroclastic Surge / PDC', category: 'volcanic', fidelity: 'B', unit: 'km/h', baseRadiusM: 25000, peakVal: 180, description: 'High-temperature gas and tephra gravity current', paramName: 'velocityKmh', paramLabel: 'Flow Velocity', paramDefault: 180, paramMin: 50, paramMax: 400, vfxType: 'plume', vfxColor: 0x884422 },
    { id: 'volcanic_ashfall', name: 'Volcanic Ashfall Isopach', category: 'volcanic', fidelity: 'B', unit: 'cm ash', baseRadiusM: 200000, peakVal: 35, description: 'Regional tephra blanket and aviation hazard', paramName: 'thicknessCm', paramLabel: 'Deposit Thickness', paramDefault: 35, paramMin: 1, paramMax: 150, vfxType: 'plume', vfxColor: 0x665544 },
    { id: 'lahar', name: 'Volcanic Lahar Debris Flow', category: 'volcanic', fidelity: 'B', unit: 'm depth', baseRadiusM: 30000, peakVal: 8.0, description: 'Rain-mobilized volcanic ash slurry', paramName: 'flowDepthM', paramLabel: 'Flow Depth', paramDefault: 8.0, paramMin: 1, paramMax: 20, vfxType: 'debris', vfxColor: 0x554433 },
    { id: 'caldera_scale_eruption', name: 'Supervolcanic Caldera Eruption', category: 'volcanic', fidelity: 'B', unit: 'km³ ejecta', baseRadiusM: 1500000, peakVal: 1000, description: 'VEI 8 continental-scale super-eruption', paramName: 'ejectaVolumeKm3', paramLabel: 'Ejecta Volume', paramDefault: 1000, paramMin: 100, paramMax: 5000, vfxType: 'plume', vfxColor: 0x443322 },

    // E. Atmospheric
    { id: 'tornado', name: 'Tornado Vortex (EF5 Swath)', category: 'atmospheric', fidelity: 'B', unit: 'EF Scale', baseRadiusM: 2000, peakVal: 5, description: 'Supercell tornadic rotational damage track', paramName: 'efRating', paramLabel: 'EF Rating', paramDefault: 5, paramMin: 1, paramMax: 5, vfxType: 'vortex', vfxColor: 0x556677 },
    { id: 'derecho', name: 'Derecho Straight-Line Windstorm', category: 'atmospheric', fidelity: 'B', unit: 'km/h', baseRadiusM: 350000, peakVal: 160, description: 'Long-lived bow echo convective storm complex', paramName: 'gustSpeedKmh', paramLabel: 'Peak Gust Speed', paramDefault: 160, paramMin: 90, paramMax: 220, vfxType: 'shockwave', vfxColor: 0x7799aa },
    { id: 'severe_thunderstorm', name: 'Severe Convective Thunderstorm', category: 'atmospheric', fidelity: 'C', unit: 'dBZ', baseRadiusM: 40000, peakVal: 65, description: 'Mesoscale convective storm with microbursts', paramName: 'radarReflectivityDbz', paramLabel: 'Reflectivity', paramDefault: 65, paramMin: 40, paramMax: 75, vfxType: 'vortex', vfxColor: 0x447788 },
    { id: 'hailstorm', name: 'Severe Hailstorm Swath', category: 'atmospheric', fidelity: 'C', unit: 'cm hail', baseRadiusM: 25000, peakVal: 7.5, description: 'Large destructive hail swath', paramName: 'hailDiameterCm', paramLabel: 'Max Hailstone Size', paramDefault: 7.5, paramMin: 2, paramMax: 15, vfxType: 'debris', vfxColor: 0xaaccdd },
    { id: 'blizzard', name: 'Extreme Winter Blizzard', category: 'atmospheric', fidelity: 'B', unit: 'cm snow', baseRadiusM: 500000, peakVal: 85, description: 'Sub-zero high-wind snowfall and whiteout', paramName: 'snowfallCm', paramLabel: 'Snow Accumulation', paramDefault: 85, paramMin: 20, paramMax: 200, vfxType: 'plume', vfxColor: 0xddeeff },
    { id: 'ice_storm', name: 'Catastrophic Glaze Ice Storm', category: 'atmospheric', fidelity: 'B', unit: 'mm glaze', baseRadiusM: 250000, peakVal: 35, description: 'Freezing rain accretion and power grid collapse', paramName: 'iceAccretionMm', paramLabel: 'Ice Accretion', paramDefault: 35, paramMin: 5, paramMax: 60, vfxType: 'debris', vfxColor: 0x99ccff },
    { id: 'dust_storm', name: 'Haboob / Synoptic Dust Storm', category: 'atmospheric', fidelity: 'B', unit: 'µg/m³ PM10', baseRadiusM: 300000, peakVal: 3500, description: 'Massive particulate suspension and zero visibility', paramName: 'pm10Concentration', paramLabel: 'PM10 Concentration', paramDefault: 3500, paramMin: 500, paramMax: 10000, vfxType: 'plume', vfxColor: 0xbbaa88 },
    { id: 'atmospheric_river', name: 'Atmospheric River Deluge', category: 'atmospheric', fidelity: 'B', unit: 'kg/m/s IVT', baseRadiusM: 800000, peakVal: 1200, description: 'Narrow corridor of extreme water vapor transport', paramName: 'ivtFlux', paramLabel: 'Integrated Vapor Transport', paramDefault: 1200, paramMin: 500, paramMax: 2500, vfxType: 'plume', vfxColor: 0x5588aa },

    // F. Hydrological & Wildfire
    { id: 'flash_flood', name: 'Mountain / Urban Flash Flood', category: 'hydrological_wildfire', fidelity: 'B', unit: 'mm/hr', baseRadiusM: 15000, peakVal: 110, description: 'Rapid runoff torrent in steep or paved basins', paramName: 'rainRateMmHr', paramLabel: 'Rainfall Intensity', paramDefault: 110, paramMin: 30, paramMax: 250, vfxType: 'wave_ring', vfxColor: 0x336699 },
    { id: 'urban_pluvial_flood', name: 'Urban Drainage Overload Flood', category: 'hydrological_wildfire', fidelity: 'C', unit: 'm depth', baseRadiusM: 12000, peakVal: 2.2, description: 'Stormwater system capacity exceeding inundation', paramName: 'streetFloodDepthM', paramLabel: 'Street Flood Depth', paramDefault: 2.2, paramMin: 0.3, paramMax: 5.0, vfxType: 'wave_ring', vfxColor: 0x447799 },
    { id: 'urban_conflagration', name: 'Urban Firestorm Conflagration', category: 'hydrological_wildfire', fidelity: 'B', unit: 'structures/hr', baseRadiusM: 8000, peakVal: 350, description: 'Structure-to-structure mass firestorm propagation', paramName: 'spreadRate', paramLabel: 'Building Burn Rate', paramDefault: 350, paramMin: 20, paramMax: 1000, vfxType: 'fire_front', vfxColor: 0xff3300 },
    { id: 'wildfire_smoke', name: 'Wildfire Smoke Dispersion', category: 'hydrological_wildfire', fidelity: 'B', unit: 'µg/m³ PM2.5', baseRadiusM: 600000, peakVal: 650, description: 'Regional hazardous smoke plume advection', paramName: 'pm25Concentration', paramLabel: 'PM2.5 Level', paramDefault: 650, paramMin: 50, paramMax: 1500, vfxType: 'plume', vfxColor: 0x776655 },
    { id: 'extreme_heat', name: 'Extreme Heatwave / Wet-Bulb Event', category: 'hydrological_wildfire', fidelity: 'B', unit: '°C WetBulb', baseRadiusM: 700000, peakVal: 34.5, description: 'Exceedance of human thermoregulatory limits', paramName: 'wetBulbTempC', paramLabel: 'Wet-Bulb Temperature', paramDefault: 34.5, paramMin: 28, paramMax: 38, vfxType: 'plume', vfxColor: 0xff8844 },
    { id: 'drought', name: 'Multi-Year Megadrought', category: 'hydrological_wildfire', fidelity: 'C', unit: 'SPEI index', baseRadiusM: 1200000, peakVal: -2.8, description: 'Severe soil moisture and hydrological deficit', paramName: 'speiIndex', paramLabel: 'Drought Index', paramDefault: -2.8, paramMin: -4.0, paramMax: -1.0, vfxType: 'plume', vfxColor: 0xaa9966 },
    { id: 'glacial_lake_outburst_flood', name: 'Glacial Lake Outburst Flood (GLOF)', category: 'hydrological_wildfire', fidelity: 'B', unit: 'm³/s peak', baseRadiusM: 45000, peakVal: 8500, description: 'Sudden moraine dam breach surge', paramName: 'glofDischargeM3s', paramLabel: 'Breach Discharge', paramDefault: 8500, paramMin: 500, paramMax: 30000, vfxType: 'wave_ring', vfxColor: 0x228899 },

    // G. Infrastructure & Industrial
    { id: 'regional_blackout', name: 'Regional Power Grid Blackout', category: 'infrastructure_industrial', fidelity: 'B', unit: 'GW dropped', baseRadiusM: 400000, peakVal: 35, description: 'Transmission cascading trip and wide-area outage', paramName: 'droppedLoadGw', paramLabel: 'Dropped Grid Load', paramDefault: 35, paramMin: 2, paramMax: 150, vfxType: 'shockwave', vfxColor: 0x112233 },
    { id: 'substation_failure_cascade', name: 'Substation Transformer Cascade', category: 'infrastructure_industrial', fidelity: 'B', unit: 'substations', baseRadiusM: 80000, peakVal: 18, description: 'High-voltage transformer burnouts and trips', paramName: 'failedNodes', paramLabel: 'Damaged Substations', paramDefault: 18, paramMin: 1, paramMax: 50, vfxType: 'shockwave', vfxColor: 0x334466 },
    { id: 'dam_failure', name: 'Major Dam Catastrophic Breach', category: 'infrastructure_industrial', fidelity: 'B', unit: 'm breach depth', baseRadiusM: 60000, peakVal: 18, description: 'Reservoir structural collapse and wall of water', paramName: 'peakDepthM', paramLabel: 'Breach Water Depth', paramDefault: 18, paramMin: 3, paramMax: 45, vfxType: 'wave_ring', vfxColor: 0x225588 },
    { id: 'industrial_chemical_release', name: 'Toxic Chemical Gas Release', category: 'infrastructure_industrial', fidelity: 'B', unit: 'tons toxic', baseRadiusM: 18000, peakVal: 120, description: 'Dense gas atmospheric plume dispersion', paramName: 'releaseTons', paramLabel: 'Mass Released', paramDefault: 120, paramMin: 5, paramMax: 1000, vfxType: 'plume', vfxColor: 0x88bb33 },
    { id: 'oil_spill', name: 'Major Marine Oil Spill', category: 'infrastructure_industrial', fidelity: 'B', unit: 'barrels', baseRadiusM: 90000, peakVal: 500000, description: 'Coastal marine slicks and shoreline contamination', paramName: 'spillBarrels', paramLabel: 'Spill Volume', paramDefault: 500000, paramMin: 10000, paramMax: 5000000, vfxType: 'wave_ring', vfxColor: 0x222222 },
    { id: 'telecom_outage', name: 'Metropolitan Telecom / Internet Outage', category: 'infrastructure_industrial', fidelity: 'C', unit: '% POPs down', baseRadiusM: 100000, peakVal: 75, description: 'Core fiber transport and cellular base station failure', paramName: 'outagePct', paramLabel: 'Network Loss', paramDefault: 75, paramMin: 10, paramMax: 100, vfxType: 'shockwave', vfxColor: 0x446688 },
    { id: 'water_system_failure', name: 'Municipal Potable Water Outage', category: 'infrastructure_industrial', fidelity: 'C', unit: 'pop affected (k)', baseRadiusM: 60000, peakVal: 850, description: 'Pressure loss and contamination of public water mains', paramName: 'affectedPopThousands', paramLabel: 'Population Affected', paramDefault: 850, paramMin: 50, paramMax: 5000, vfxType: 'wave_ring', vfxColor: 0x3377aa },

    // H. Space & Compound
    { id: 'geomagnetic_storm', name: 'Extreme Geomagnetic Storm (Carrington)', category: 'space_compound', fidelity: 'B', unit: 'nT Dst', baseRadiusM: 20000000, peakVal: -850, description: 'GIC induced currents in high-voltage grids', paramName: 'dstIndexNt', paramLabel: 'Dst Index', paramDefault: -850, paramMin: -2000, paramMax: -100, vfxType: 'plume', vfxColor: 0x66ff88 },
    { id: 'earthquake_tsunami_compound', name: 'Compound Earthquake + Tsunami', category: 'space_compound', fidelity: 'A', unit: 'Mw / m', baseRadiusM: 250000, peakVal: 9.0, description: 'Subduction megathrust with simultaneous coastal wave inundation', paramName: 'magnitudeMw', paramLabel: 'Earthquake Magnitude', paramDefault: 9.0, paramMin: 7.5, paramMax: 9.6, vfxType: 'wave_ring', vfxColor: 0x2288dd },
    { id: 'cyclone_surge_flood_compound', name: 'Compound Cyclone + Surge + Inland Flood', category: 'space_compound', fidelity: 'A', unit: 'Cat / m', baseRadiusM: 300000, peakVal: 5, description: 'Triple-threat hurricane wind, storm surge and pluvial flooding', paramName: 'hurricaneCategory', paramLabel: 'Cyclone Category', paramDefault: 5, paramMin: 1, paramMax: 5, vfxType: 'vortex', vfxColor: 0x88ccdd },
    { id: 'drought_wildfire_compound', name: 'Compound Drought + Wildfire Outbreak', category: 'space_compound', fidelity: 'B', unit: 'MW/m', baseRadiusM: 180000, peakVal: 25000, description: 'Severe fuel moisture depletion and multi-front firestorms', paramName: 'firelineIntensity', paramLabel: 'Fireline Intensity', paramDefault: 25000, paramMin: 1000, paramMax: 80000, vfxType: 'fire_front', vfxColor: 0xff4400 }
  ]

  for (const item of additionalHazards) {
    globalHazardRegistry.register(new GenericHazardModule(item))
  }
}
