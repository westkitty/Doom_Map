import './style.css'
import { cameraBookmark } from './core/bookmarks'
import { QUALITY, type QualityTier } from './core/quality'
import type { GeodeticPoint } from './core/coordinates'
import type { BuildingFeature } from './data/providers/buildings'
import models from '../data/models.json'
import providers from '../data/providers.json'
import { parseManifest } from './data/provenance'
import { GlobeApp } from './globe/GlobeApp'

import { ScenarioClock } from './core/time/ScenarioClock'
import { ScenarioVault } from './core/scenario/ScenarioVault'
import { encodeScenarioToHash, decodeScenarioFromHash } from './core/scenario/urlState'
import { compareScenarios, forkScenario } from './core/scenario/comparison'
import type { ScenarioDefinition } from './core/scenario/types'
import { globalHazardRegistry } from './hazards/registry'
import { initHazardRegistry } from './hazards/catalog'
import { ConsequenceEngine } from './consequence/ConsequenceEngine'

initHazardRegistry()

const canvas = document.querySelector<HTMLCanvasElement>('#globe')
const lat = document.querySelector<HTMLElement>('#lat')
const lon = document.querySelector<HTMLElement>('#lon')
const alt = document.querySelector<HTMLElement>('#alt')
const status = document.querySelector<HTMLElement>('#status')!

if (!canvas || !lat || !lon || !alt) {
  throw new Error('Doom Map application shell is incomplete.')
}

const formatAltitude = (meters: number): string => {
  if (meters >= 1_000_000) return (meters / 1_000_000).toFixed(2) + ' Mm'
  if (meters >= 1_000) return (meters / 1_000).toFixed(1) + ' km'
  return meters.toFixed(0) + ' m'
}

canvas.addEventListener('geography-status', event => {
  document.querySelector('#geography-status')!.textContent = (event as CustomEvent<string>).detail
})
canvas.addEventListener('globe-status', (event) => {
  status.textContent = (event as CustomEvent<string>).detail
})

// ==========================================
// SCENARIO, TIME & HAZARD SIMULATION ENGINE
// ==========================================
const consequenceEngine = new ConsequenceEngine()
const scenarioVault = new ScenarioVault()

let activeScenario: ScenarioDefinition = {
  schemaVersion: 1,
  id: 'scenario-default-nuclear',
  name: 'Default Scenario · Nuclear Detonation',
  description: '100 kt nuclear airburst over metropolitan region',
  seed: 42,
  createdAt: new Date().toISOString(),
  startTimeMs: Date.now(),
  durationMs: 300000, // 5 minutes
  hazardType: 'nuclear_airburst',
  origin: { latitudeDeg: 40.7128, longitudeDeg: -74.0060, heightM: 0 },
  parameters: { yieldKt: 100, burstAltitudeM: 600 },
  chapters: [
    { timeOffsetMs: 0, label: 'Detonation', description: 'Prompt nuclear fireball and initial radiation' },
    { timeOffsetMs: 15000, label: 'Shockwave Arrival', description: 'Overpressure blast wave propagates outwards' },
    { timeOffsetMs: 120000, label: 'Thermal & Secondary Fires', description: 'Urban conflagrations and fallout dispersion' }
  ],
  modelSnapshots: []
}

// Check if URL hash contains an imported scenario
if (window.location.hash) {
  const imported = decodeScenarioFromHash(window.location.hash)
  if (imported && imported.id) {
    activeScenario = { ...activeScenario, ...imported } as ScenarioDefinition
  }
}

const clock = new ScenarioClock(activeScenario.startTimeMs, activeScenario.durationMs)

// DOM elements
const playPauseBtn = document.querySelector<HTMLButtonElement>('#play-pause')!
const timelineScrubber = document.querySelector<HTMLInputElement>('#timeline-scrubber')!
const speedSelect = document.querySelector<HTMLSelectElement>('#speed-select')!
const timeDisplay = document.querySelector<HTMLElement>('#time-display')!
const consequencePanel = document.querySelector<HTMLElement>('#consequence-content')!
const hazardSelect = document.querySelector<HTMLSelectElement>('#hazard-select')!

let app: GlobeApp | undefined

function recalcSimulation(timeOffsetMs: number): void {
  const mod = globalHazardRegistry.get(activeScenario.hazardType)
  if (!mod || !app) return

  const state = mod.evaluate(activeScenario.origin, activeScenario.parameters, timeOffsetMs, activeScenario.seed)
  app.setHazardState(state)

  const consequence = consequenceEngine.evaluate(state, activeScenario.hazardType, timeOffsetMs)
  if (consequencePanel) {
    consequencePanel.innerHTML = `
      <div class="consequence-grid">
        <p><strong>Peak Intensity:</strong> ${state.peakIntensity.toFixed(1)} ${state.footprint.unit}</p>
        <p><strong>Footprint Area:</strong> ${consequence.totalFootprintAreaKm2.toLocaleString()} km²</p>
        <p><strong>Exposed Population:</strong> ~${consequence.exposedPopulation.toLocaleString()}</p>
        <p><strong>Est. Economic Loss:</strong> $${consequence.economicLossMillionUsd.toLocaleString()}M USD</p>
        <p><strong>Lifelines Operability:</strong> ${consequence.lifelineOperability}%</p>
        <p><strong>Recovery Progress:</strong> ${consequence.recoveryProgressPct}%</p>
      </div>
      <div class="damage-bars">
        <span class="dmg-none" style="width:${consequence.structuralDamage.nonePct}%" title="None: ${consequence.structuralDamage.nonePct}%"></span>
        <span class="dmg-slight" style="width:${consequence.structuralDamage.slightPct}%" title="Slight: ${consequence.structuralDamage.slightPct}%"></span>
        <span class="dmg-mod" style="width:${consequence.structuralDamage.moderatePct}%" title="Moderate: ${consequence.structuralDamage.moderatePct}%"></span>
        <span class="dmg-ext" style="width:${consequence.structuralDamage.extensivePct}%" title="Extensive: ${consequence.structuralDamage.extensivePct}%"></span>
        <span class="dmg-comp" style="width:${consequence.structuralDamage.completePct}%" title="Complete: ${consequence.structuralDamage.completePct}%"></span>
      </div>
      <small>HAZUS Damage Distribution: None (${consequence.structuralDamage.nonePct}%) · Slight (${consequence.structuralDamage.slightPct}%) · Moderate (${consequence.structuralDamage.moderatePct}%) · Extensive (${consequence.structuralDamage.extensivePct}%) · Complete (${consequence.structuralDamage.completePct}%)</small>
    `
  }
}

function mount(): void {
  try {
    app = new GlobeApp(canvas!, (telemetry) => {
      lat!.textContent = 'LAT ' + telemetry.latitudeDeg.toFixed(3) + '°'
      lon!.textContent = 'LON ' + telemetry.longitudeDeg.toFixed(3) + '°'
      alt!.textContent = 'ALT ' + formatAltitude(telemetry.altitudeM)
    })
    app.start()
    recalcSimulation(clock.state.timeMs - activeScenario.startTimeMs)
  } catch (error) {
    app?.dispose()
    status.textContent = 'Unable to start WebGL2. Enable hardware acceleration or try a supported browser.'
    status.setAttribute('role', 'alert')
    document.body.dataset.webgl = 'unavailable'
    console.error('Globe initialization failed', error)
  }
}
mount()
window.addEventListener('pagehide', () => { app?.dispose(); app = undefined })
window.addEventListener('pageshow', (event) => { if (event.persisted) mount() })

// Populate Hazard Selector
const categories = [
  { id: 'explosive_impact', label: 'Explosive & Kinetic Impact' },
  { id: 'seismic', label: 'Seismic & Crustal' },
  { id: 'ocean_coastal', label: 'Ocean & Coastal Tsunami' },
  { id: 'volcanic', label: 'Volcanic Eruption' },
  { id: 'atmospheric', label: 'Atmospheric Storms' },
  { id: 'hydrological_wildfire', label: 'Hydrological & Wildfire' },
  { id: 'infrastructure_industrial', label: 'Critical Infrastructure & Industrial' },
  { id: 'space_compound', label: 'Space Weather & Compound Cascades' }
] as const

for (const cat of categories) {
  const optGroup = document.createElement('optgroup')
  optGroup.label = cat.label
  const mods = globalHazardRegistry.listByCategory(cat.id)
  for (const mod of mods) {
    const opt = document.createElement('option')
    opt.value = mod.id
    opt.textContent = `${mod.name} [${mod.provenance.fidelity}]`
    opt.selected = mod.id === activeScenario.hazardType
    optGroup.append(opt)
  }
  hazardSelect.append(optGroup)
}

function renderHazardParams(): void {
  const paramsContainer = document.querySelector<HTMLElement>('#hazard-params')!
  paramsContainer.innerHTML = ''
  const mod = globalHazardRegistry.get(activeScenario.hazardType)
  if (!mod) return

  for (const p of mod.parameterSchema) {
    const label = document.createElement('label')
    label.textContent = `${p.label} [${p.unit || ''}]: `
    const input = document.createElement('input')
    input.type = p.type === 'number' ? 'number' : 'text'
    if (p.min !== undefined) input.min = String(p.min)
    if (p.max !== undefined) input.max = String(p.max)
    if (p.step !== undefined) input.step = String(p.step)
    const currentVal = activeScenario.parameters[p.name] ?? p.default
    input.value = String(currentVal)

    input.addEventListener('input', () => {
      activeScenario.parameters[p.name] = p.type === 'number' ? Number(input.value) : input.value
      recalcSimulation(clock.state.timeMs - activeScenario.startTimeMs)
    })

    label.append(input)
    paramsContainer.append(label)
  }
}
renderHazardParams()

hazardSelect.addEventListener('change', () => {
  activeScenario.hazardType = hazardSelect.value
  const mod = globalHazardRegistry.get(activeScenario.hazardType)
  if (mod) {
    const defaults: Record<string, number | string | boolean> = {}
    for (const p of mod.parameterSchema) defaults[p.name] = p.default
    activeScenario.parameters = defaults
    renderHazardParams()
    recalcSimulation(clock.state.timeMs - activeScenario.startTimeMs)
  }
})

playPauseBtn.addEventListener('click', () => clock.toggle())
speedSelect.addEventListener('change', () => clock.setPlaybackRate(Number(speedSelect.value)))
timelineScrubber.addEventListener('input', () => {
  clock.seekNormalized(Number(timelineScrubber.value) / 1000)
})

clock.subscribe((timeMs, state) => {
  playPauseBtn.textContent = state.isPlaying ? '❚❚ Pause' : '▶ Play'
  timelineScrubber.value = String(Math.round(state.progress * 1000))
  const elapsedSec = (timeMs - activeScenario.startTimeMs) / 1000
  timeDisplay.textContent = `T+${elapsedSec.toFixed(1)}s (${(elapsedSec / 60).toFixed(1)}m)`
  recalcSimulation(timeMs - activeScenario.startTimeMs)
})

let lastRealTime = performance.now()
function simLoop(): void {
  const now = performance.now()
  const deltaSec = (now - lastRealTime) / 1000
  lastRealTime = now
  clock.advanceRealTime(deltaSec)
  requestAnimationFrame(simLoop)
}
requestAnimationFrame(simLoop)

// ==========================================
// SCENARIO VAULT & SHARING
// ==========================================
const saveScenarioBtn = document.querySelector<HTMLButtonElement>('#save-scenario')!
const shareScenarioBtn = document.querySelector<HTMLButtonElement>('#share-scenario')!
const exportScenarioBtn = document.querySelector<HTMLButtonElement>('#export-scenario')!
const importScenarioBtn = document.querySelector<HTMLButtonElement>('#import-scenario')!
const forkScenarioBtn = document.querySelector<HTMLButtonElement>('#fork-scenario')!
const compareScenarioBtn = document.querySelector<HTMLButtonElement>('#compare-scenario')!
const comparisonOutput = document.querySelector<HTMLElement>('#comparison-output')!
const vaultStatus = document.querySelector<HTMLElement>('#vault-status')!

let baselineScenario: ScenarioDefinition = JSON.parse(JSON.stringify(activeScenario))

forkScenarioBtn?.addEventListener('click', () => {
  baselineScenario = JSON.parse(JSON.stringify(activeScenario))
  const branched = forkScenario(activeScenario, `${activeScenario.name} (Forked Branch)`, {})
  activeScenario = branched
  vaultStatus.textContent = `Branched scenario "${branched.name}". Modify parameters to compare against baseline.`
})

compareScenarioBtn?.addEventListener('click', () => {
  const currentOffset = clock.state.timeMs - activeScenario.startTimeMs
  const comparison = compareScenarios(baselineScenario, activeScenario, currentOffset)
  if (comparisonOutput) {
    comparisonOutput.style.display = 'block'
    comparisonOutput.innerHTML = `
      <div style="background: rgba(0,0,0,0.4); padding: 0.4rem; border-radius: 4px; border: 1px solid #405968;">
        <strong>A/B Delta (${baselineScenario.name} vs ${activeScenario.name}):</strong><br>
        • Exposed Pop Delta: ${comparison.deltas.exposedPopulationDelta >= 0 ? '+' : ''}${comparison.deltas.exposedPopulationDelta.toLocaleString()}<br>
        • Economic Loss Delta: ${comparison.deltas.economicLossDeltaM >= 0 ? '+' : ''}$${comparison.deltas.economicLossDeltaM.toLocaleString()}M USD<br>
        • Lifelines Delta: ${comparison.deltas.lifelineOperabilityDelta >= 0 ? '+' : ''}${comparison.deltas.lifelineOperabilityDelta}%<br>
        <em>${comparison.deltas.summary}</em>
      </div>
    `
  }
  vaultStatus.textContent = 'A/B comparison calculated.'
})

saveScenarioBtn.addEventListener('click', async () => {
  try {
    activeScenario.createdAt = new Date().toISOString()
    await scenarioVault.save(activeScenario)
    vaultStatus.textContent = `Scenario "${activeScenario.name}" saved to local vault.`
  } catch (error) {
    vaultStatus.textContent = `Failed to save scenario: ${String(error)}`
  }
})

shareScenarioBtn.addEventListener('click', () => {
  const hash = encodeScenarioToHash(activeScenario)
  window.location.hash = hash
  navigator.clipboard?.writeText(window.location.href)
  vaultStatus.textContent = 'Scenario share link encoded into URL and copied to clipboard.'
})

exportScenarioBtn.addEventListener('click', () => {
  const json = scenarioVault.exportJson(activeScenario)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${activeScenario.id}.json`
  a.click()
  URL.revokeObjectURL(url)
  vaultStatus.textContent = 'Scenario exported as JSON file.'
})

importScenarioBtn.addEventListener('click', () => {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.json'
  input.onchange = async () => {
    const file = input.files?.[0]
    if (!file) return
    const text = await file.text()
    try {
      activeScenario = scenarioVault.importJson(text)
      hazardSelect.value = activeScenario.hazardType
      renderHazardParams()
      clock.seek(activeScenario.startTimeMs)
      vaultStatus.textContent = `Loaded scenario "${activeScenario.name}".`
    } catch (e) {
      vaultStatus.textContent = `Import error: ${String(e)}`
    }
  }
  input.click()
})

// Populate Science Panel
const records = [
  ...parseManifest(models, 'model'),
  ...parseManifest(providers, 'provider'),
  ...globalHazardRegistry.list().map(m => m.provenance)
]
const science = document.querySelector<HTMLElement>('#science-content')!
science.innerHTML = ''
for (const record of records) {
  const heading = document.createElement('h2')
  heading.textContent = `${record.title} · Fidelity ${record.fidelity}`
  const description = document.createElement('p')
  description.textContent = `${record.id}@${record.version}. ${record.uncertainty} ${record.limitations.join(' ')} ${record.assumptions.join(' ')} Coverage: ${record.coverage}. ${record.attribution} License: ${record.license}`
  science.append(heading, description)
  for (const source of record.sources) {
    const link = document.createElement('a')
    link.href = source
    link.textContent = source
    link.target = '_blank'
    link.rel = 'noopener noreferrer'
    science.append(link)
  }
}

canvas.addEventListener('globe-selection', event => {
  const point = (event as CustomEvent<GeodeticPoint>).detail
  activeScenario.origin = { ...point, heightM: 0 }
  document.querySelector('#selection')!.textContent = `Hazard Ground Zero: ${point.latitudeDeg.toFixed(5)}°, ${point.longitudeDeg.toFixed(5)}° · WGS84 ellipsoid, not terrain`
  recalcSimulation(clock.state.timeMs - activeScenario.startTimeMs)
})

const buildingInspector = document.querySelector<HTMLElement>('#building-info')
canvas.addEventListener('building-selection', event => {
  const b = (event as CustomEvent<BuildingFeature | null>).detail
  if (!buildingInspector) return
  if (!b) {
    buildingInspector.textContent = 'No building selected. Zoom below 15 km to inspect local building extrusions.'
    return
  }
  const heightTag = b.heightSource === 'observed'
    ? `${b.heightM.toFixed(1)} m (observed survey/roof tag)`
    : `${b.heightM.toFixed(1)} m (inferred from ${b.storeys} storeys @ 3m/storey)`
  buildingInspector.innerHTML = `<strong>${b.name || b.id}</strong><br>` +
    `Use: ${b.use} · Storeys: ${b.storeys} · Height: ${heightTag}<br>` +
    `Confidence: ${(b.confidence * 100).toFixed(0)}% · Timestamp: ${b.timestamp || 'unknown'}<br>` +
    `<em>Truth contract: 2D footprint extrusion; structural resistance and internal occupancy unobserved.</em>`
})

const navigationStatus = document.querySelector<HTMLElement>('#navigation-status')!
document.querySelector<HTMLFormElement>('#location-form')!.addEventListener('submit', event => {
  event.preventDefault()
  const data = new FormData(event.currentTarget as HTMLFormElement)
  try {
    app?.flyTo({ latitudeDeg: Number(data.get('latitude')), longitudeDeg: Number(data.get('longitude')), heightM: Number(data.get('altitude')) })
    navigationStatus.textContent = 'Flying to coordinates. User input cancels camera motion.'
  } catch (error) { navigationStatus.textContent = String(error) }
})
document.querySelector<HTMLSelectElement>('#quality')!.addEventListener('change', event => {
  const tier = (event.target as HTMLSelectElement).value
  if (tier in QUALITY) app?.setQuality(tier as QualityTier)
})
for (const action of ['save', 'restore'] as const) {
  document.querySelector(`#${action}-camera`)!.addEventListener('click', async () => {
    try {
      if (!app) throw new Error('Globe unavailable')
      if (action === 'save') await cameraBookmark('save', app.bookmark())
      else {
        const bookmark = await cameraBookmark('load')
        if (!bookmark) throw new Error('No valid saved camera')
        app.restoreBookmark(bookmark)
      }
      navigationStatus.textContent = action === 'save' ? 'Camera saved on this device.' : 'Camera restored.'
    } catch (error) { navigationStatus.textContent = `Bookmark unavailable: ${String(error)}` }
  })
}

// Low-rate DOM reporting
setInterval(() => {
  const runtime = canvas.dataset.runtime
  if (!runtime) return
  const value = JSON.parse(runtime)
  document.querySelector('#performance')!.textContent = `Frame ${value.meanMs.toFixed(1)} ms / p95 ${value.p95Ms.toFixed(1)} ms · ${value.fps.toFixed(0)} FPS · ${value.calls} draws · ${value.triangles} triangles · ${value.geometries} geometries / ${value.textures} textures. Software/device dependent, not a performance guarantee.`
  const stream = value.streaming
  const bldg = value.buildings
  const bldgText = bldg && bldg.visible
    ? ` · Local buildings: ${bldg.buildingCount} structures (${bldg.gpuTiles} tiles loaded)`
    : ''
  document.querySelector('#streaming-status')!.textContent = stream.error
    ? `Regional provider degraded: ${stream.error}. Global low-resolution fallback retained if available.`
    : `Natural Earth regional ${stream.health}: ${stream.active} requests / ${stream.queued} queued · ${stream.gpuTiles} coastline tiles · ${stream.cachedTiles} persistent-cache tiles / ${stream.staleTiles} stale-cache fallback tiles${bldgText}.${stream.persistent.warning ? ` (${stream.persistent.warning})` : ''} Workers not implemented.`
}, 500)
