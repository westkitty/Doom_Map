import type { HazardCategory, HazardManifest } from './manifest'

const LIMITATION = ['Catalog metadata only until a dedicated model declares stronger fidelity.'] as const

const GROUPS: ReadonlyArray<readonly [HazardCategory, readonly string[]]> = [
  ['explosive-impact-radiological', [
    'nuclear_airburst','nuclear_surface_burst','radiological_release','asteroid_land_impact','asteroid_ocean_impact','comet_impact','airburst_meteor','orbital_debris_reentry'
  ]],
  ['seismic-crustal', [
    'earthquake_point_source','earthquake_finite_fault','aftershock_sequence','surface_rupture','liquefaction','earthquake_landslide','sinkhole_collapse','subsidence_event'
  ]],
  ['ocean-coastal', [
    'tsunami_subduction','tsunami_landslide','tsunami_impact','storm_surge','coastal_flooding','rogue_wave_coastal_event','meteotsunami','coastal_erosion_episode'
  ]],
  ['volcanic-geothermal', [
    'explosive_volcanic_eruption','effusive_lava_flow','pyroclastic_density_current','volcanic_ashfall','lahar','volcanic_gas_release','caldera_scale_eruption','geothermal_hydrothermal_explosion'
  ]],
  ['weather-atmospheric', [
    'tropical_cyclone','extratropical_cyclone','tornado','derecho','severe_thunderstorm','hailstorm','lightning_outbreak','blizzard','ice_storm','dust_storm','sandstorm','atmospheric_river','flash_flood','river_flood','urban_pluvial_flood'
  ]],
  ['fire-smoke-heat', [
    'wildfire','urban_conflagration','peat_fire','wildfire_smoke','extreme_heat','extreme_cold','drought','heat_drought_compound'
  ]],
  ['cryosphere-mountain', [
    'avalanche','rockfall','debris_flow','glacial_lake_outburst_flood','glacier_collapse','ice_shelf_breakup','permafrost_thaw_failure'
  ]],
  ['infrastructure-technological', [
    'regional_blackout','substation_failure_cascade','dam_failure','levee_failure','bridge_failure','port_shutdown','airport_shutdown','telecom_outage','fiber_backbone_cut','water_system_failure','wastewater_failure','fuel_supply_disruption','industrial_chemical_release','oil_spill','mine_tailings_failure','building_collapse_cluster'
  ]],
  ['space-weather', [
    'geomagnetic_storm','solar_proton_event','extreme_solar_flare','satellite_constellation_failure','high_altitude_atmospheric_disturbance'
  ]],
  ['biological-ecological', [
    'crop_failure_region','locust_outbreak','harmful_algal_bloom','forest_pest_outbreak','coral_bleaching_event','mass_fish_kill'
  ]],
  ['compound-cascading', [
    'earthquake_tsunami_compound','cyclone_surge_flood_compound','heat_wildfire_smoke_compound','drought_wildfire_compound','earthquake_grid_fire_compound','volcano_ash_aviation_compound','flood_water_wastewater_compound','ice_storm_grid_telecom_compound','geomagnetic_grid_satellite_compound','impact_global_climate_proxy','multi_hazard_user_composition'
  ]]
]

const FLAGSHIPS = new Set([
  'nuclear_airburst','nuclear_surface_burst','asteroid_land_impact','asteroid_ocean_impact','earthquake_finite_fault','tsunami_subduction','tropical_cyclone','river_flood','storm_surge','wildfire','explosive_volcanic_eruption','tornado','extreme_heat','regional_blackout'
])

function labelFromId(id: string): string {
  return id.split('_').map((word) => word[0]!.toUpperCase() + word.slice(1)).join(' ')
}

export const DEFAULT_HAZARD_CATALOG: readonly HazardManifest[] = Object.freeze(
  GROUPS.flatMap(([category, ids]) => ids.map((id) => Object.freeze({
    id,
    label: labelFromId(id),
    category,
    fidelity: 'D' as const,
    implementationState: 'catalogued' as const,
    parameters: Object.freeze({}),
    consequenceTypes: Object.freeze([]),
    limitations: LIMITATION,
    flagship: FLAGSHIPS.has(id)
  })))
)


export { initHazardRegistry } from './runtimeCatalogCompat'
