# Doom Map — Disaster Catalog

This catalog defines the initial hazard registry. A listed item is not automatically a high-fidelity scientific solver. Each implementation must declare its fidelity class, source basis, uncertainty, and unsupported claims.

## Registry requirements

Every hazard must provide:
- stable ID and category
- parameter schema and sane bounds
- spatial origin/extent
- time model
- footprint sampler
- consequence emissions
- visualization hints
- provenance/model metadata
- uncertainty/limitations
- one deterministic smoke fixture
- at least one representative validation case

## A. Explosive, impact, and radiological

1. nuclear_airburst — blast, thermal, prompt radiation, fallout
2. nuclear_surface_burst — blast, thermal, prompt radiation, fallout, crater proxy
3. radiological_release — plume/deposition exposure model
4. asteroid_land_impact — crater, blast, thermal, ejecta, seismic effects
5. asteroid_ocean_impact — impact plus tsunami generation
6. comet_impact — high-velocity impact variant
7. airburst_meteor — Tunguska-like atmospheric energy deposition
8. orbital_debris_reentry — debris corridor and ground-risk visualization

## B. Seismic and crustal

9. earthquake_point_source — magnitude/depth-based shaking
10. earthquake_finite_fault — rupture-line/plane shaking model
11. aftershock_sequence — decaying secondary seismicity
12. surface_rupture — fault-displacement corridor
13. liquefaction — susceptibility + shaking proxy
14. earthquake_landslide — shaking-triggered slope-failure proxy
15. sinkhole_collapse — localized ground collapse
16. subsidence_event — regional deformation/settlement

## C. Ocean and coastal

17. tsunami_subduction — offshore seismic tsunami
18. tsunami_landslide — landslide-generated local tsunami
19. tsunami_impact — impact-generated wave field
20. storm_surge — wind/pressure/coastline surge proxy
21. coastal_flooding — sea level + surge + tide scenario
22. rogue_wave_coastal_event — localized maritime/coastal exposure
23. meteotsunami — atmospheric-pressure-driven wave event
24. coastal_erosion_episode — shoreline retreat/exposure proxy

## D. Volcanic and geothermal

25. explosive_volcanic_eruption — ash, pyroclastic, ejecta
26. effusive_lava_flow — lava inundation
27. pyroclastic_density_current — high-speed hot flow
28. volcanic_ashfall — plume and deposition
29. lahar — volcanic debris flow
30. volcanic_gas_release — SO2/CO2 exposure proxy
31. caldera_scale_eruption — regional/global reduced-order consequences
32. geothermal_hydrothermal_explosion — localized thermal/explosive event

## E. Weather and atmospheric

33. tropical_cyclone — track, wind, rain, surge consequences
34. extratropical_cyclone — wind/rain/snow regional storm
35. tornado — moving damage swath
36. derecho — linear convective wind event
37. severe_thunderstorm — wind/hail/lightning ensemble
38. hailstorm — hail footprint and property/crop exposure
39. lightning_outbreak — spatial strike-density exposure
40. blizzard — snow, wind, visibility, access disruption
41. ice_storm — accretion + tree/grid damage
42. dust_storm — visibility, respiratory, transport effects
43. sandstorm — desert-region dust/wind variant
44. atmospheric_river — extreme precipitation corridor
45. flash_flood — rainfall-driven rapid inundation
46. river_flood — riverine inundation
47. urban_pluvial_flood — drainage-overload flooding

## F. Fire, smoke, and heat

48. wildfire — terrain/fuel/weather spread proxy
49. urban_conflagration — structure-density/fire-spread proxy
50. peat_fire — persistent subsurface burn/smoke
51. wildfire_smoke — advected particulate plume
52. extreme_heat — heat index/wet-bulb exposure
53. extreme_cold — cold/wind-chill exposure
54. drought — long-duration water/agriculture stress
55. heat_drought_compound — compound hazard state

## G. Cryosphere and mountain

56. avalanche — snow-slope runout proxy
57. rockfall — steep-slope localized debris
58. debris_flow — rainfall/slope-triggered flow
59. glacial_lake_outburst_flood — sudden mountain flood
60. glacier_collapse — ice/debris runout
61. ice_shelf_breakup — coastal/cryosphere scenario
62. permafrost_thaw_failure — infrastructure ground-instability proxy

## H. Infrastructure and technological

63. regional_blackout — electric grid cascade
64. substation_failure_cascade — node/edge outage propagation
65. dam_failure — breach hydrograph/inundation proxy
66. levee_failure — flood-defense breach
67. bridge_failure — network/access consequence
68. port_shutdown — logistics disruption
69. airport_shutdown — aviation/access disruption
70. telecom_outage — communications graph degradation
71. fiber_backbone_cut — network route degradation
72. water_system_failure — potable-water capacity loss
73. wastewater_failure — sanitation/environment consequence
74. fuel_supply_disruption — logistics/capacity cascade
75. industrial_chemical_release — bounded toxic plume proxy
76. oil_spill — marine/coastal transport and ecological exposure
77. mine_tailings_failure — slurry/inundation consequence
78. building_collapse_cluster — localized structural-failure scenario

## I. Space weather and planetary environment

79. geomagnetic_storm — grid/satellite exposure proxy
80. solar_proton_event — satellite/aviation/radiation exposure visualization
81. extreme_solar_flare — communications/space-weather scenario
82. satellite_constellation_failure — orbital-service degradation
83. high_altitude_atmospheric_disturbance — upper-atmosphere/communications proxy

## J. Biological and ecological

84. crop_failure_region — food-production stress
85. locust_outbreak — agricultural exposure
86. harmful_algal_bloom — aquatic/ecological exposure
87. forest_pest_outbreak — vegetation-loss scenario
88. coral_bleaching_event — marine heat/ecological stress
89. mass_fish_kill — water-quality/ecological event

## K. Compound and cascading scenarios

90. earthquake_tsunami_compound
91. cyclone_surge_flood_compound
92. heat_wildfire_smoke_compound
93. drought_wildfire_compound
94. earthquake_grid_fire_compound
95. volcano_ash_aviation_compound
96. flood_water_wastewater_compound
97. ice_storm_grid_telecom_compound
98. geomagnetic_grid_satellite_compound
99. impact_global_climate_proxy
100. multi_hazard_user_composition

## Flagship fidelity targets

The following receive deeper validation before broad catalog expansion:
- nuclear_airburst / nuclear_surface_burst
- asteroid_land_impact / asteroid_ocean_impact
- earthquake_finite_fault
- tsunami_subduction
- tropical_cyclone
- river_flood
- storm_surge
- wildfire
- explosive_volcanic_eruption
- tornado
- extreme_heat
- regional_blackout

## Presentation law

A hazard may be spectacular. Its visual spectacle must not silently imply model precision. Illustrative particles, shockwave shaders, smoke, debris, lightning, and destruction cues remain explicitly downstream of model output.
