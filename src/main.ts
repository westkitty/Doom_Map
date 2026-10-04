import './style.css'
import { AutoQualityGovernor } from './core/autoQuality'
import { filterCommands, type SearchableCommand } from './core/commandSearch'
import { parseCoordinateInput } from './core/coordinateInput'
import { chooseInitialQuality, type QualityTier } from './core/quality'
import { auditFoundation } from './core/foundationAudit'
import { NetworkState } from './data/networkState'
import { ReferenceDataController } from './data/referenceDataController'
import { resourceBudgetFor } from './data/resourceBudget'
import { registerOfflineShell } from './offline/registerServiceWorker'
import { SnapshotHistory } from './core/viewHistory'
import { parseViewState, serializeViewState, type QualityMode, type ShareableViewState } from './core/viewState'
import { GlobeApp, type CameraBookmark, type PerformanceTelemetry, type RuntimeState } from './globe/GlobeApp'

const BOOKMARK_KEY = 'doom-map.camera-bookmark.v1'
const QUALITY_MODE_KEY = 'doom-map.quality-mode.v1'
const IDLE_DELAY_MS = 2600

function requiredElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector)
  if (!element) throw new Error(`Doom Map application shell is missing ${selector}.`)
  return element
}

function isQualityTier(value: unknown): value is QualityTier {
  return value === 'high' || value === 'balanced' || value === 'low' || value === 'safe'
}

function isQualityMode(value: unknown): value is QualityMode {
  return value === 'auto' || isQualityTier(value)
}

function isCameraBookmark(value: unknown): value is CameraBookmark {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<CameraBookmark>
  return candidate.version === 1
    && Array.isArray(candidate.camera)
    && candidate.camera.length === 3
    && candidate.camera.every((item) => typeof item === 'number' && Number.isFinite(item))
    && Array.isArray(candidate.target)
    && candidate.target.length === 3
    && candidate.target.every((item) => typeof item === 'number' && Number.isFinite(item))
    && (!candidate.up || (candidate.up.length === 3 && candidate.up.every((item) => typeof item === 'number' && Number.isFinite(item))))
    && isQualityTier(candidate.qualityTier)
}

const canvas = requiredElement<HTMLCanvasElement>('#globe')
const chrome = requiredElement<HTMLElement>('#chrome')
const brandButton = requiredElement<HTMLButtonElement>('#brand-button')
const status = requiredElement<HTMLElement>('#status')
const statusDot = requiredElement<HTMLElement>('#status-dot')
const targetChip = requiredElement<HTMLElement>('#target-chip')
const targetSummary = requiredElement<HTMLElement>('#target-summary')
const targetFocus = requiredElement<HTMLButtonElement>('#target-focus')
const targetCopy = requiredElement<HTMLButtonElement>('#target-copy')
const targetClear = requiredElement<HTMLButtonElement>('#target-clear')
const commandButton = requiredElement<HTMLButtonElement>('#command-button')
const commandDialog = requiredElement<HTMLDialogElement>('#command-dialog')
const commandSearch = requiredElement<HTMLInputElement>('#command-search')
const commandList = requiredElement<HTMLElement>('#command-list')
const coordinateAction = requiredElement<HTMLElement>('#coordinate-action')
const coordinateGo = requiredElement<HTMLButtonElement>('#coordinate-go')
const coordinatePreview = requiredElement<HTMLElement>('#coordinate-preview')
const closeCommand = requiredElement<HTMLButtonElement>('#close-command')
const telemetryPanel = requiredElement<HTMLElement>('#telemetry-panel')
const lat = requiredElement<HTMLElement>('#lat')
const lon = requiredElement<HTMLElement>('#lon')
const alt = requiredElement<HTMLElement>('#alt')
const orientation = requiredElement<HTMLElement>('#orientation')
const qualityReadout = requiredElement<HTMLElement>('#quality-readout')
const performanceReadout = requiredElement<HTMLElement>('#performance')
const scaleMeter = requiredElement<HTMLElement>('#scale-meter')
const scaleLine = requiredElement<HTMLElement>('#scale-line')
const scaleLabel = requiredElement<HTMLElement>('#scale-label')
const showUi = requiredElement<HTMLButtonElement>('#show-ui')
const toast = requiredElement<HTMLElement>('#toast')
const fatalPanel = requiredElement<HTMLElement>('#fatal-panel')
const fatalMessage = requiredElement<HTMLElement>('#fatal-message')
const helpDialog = requiredElement<HTMLDialogElement>('#help-dialog')
const closeHelp = requiredElement<HTMLButtonElement>('#close-help')
const aboutDialog = requiredElement<HTMLDialogElement>('#about-dialog')
const closeAbout = requiredElement<HTMLButtonElement>('#close-about')

const commandButtons = Array.from(commandList.querySelectorAll<HTMLButtonElement>('[data-command]'))
const searchableCommands: SearchableCommand[] = commandButtons.map((button) => ({
  id: button.dataset.command ?? '',
  label: button.querySelector('span')?.textContent ?? button.textContent ?? '',
  keywords: (button.dataset.keywords ?? '').split(/\s+/).filter(Boolean)
}))

const formatAltitude = (meters: number): string => {
  if (meters >= 1_000_000) return `${(meters / 1_000_000).toFixed(2)} Mm`
  if (meters >= 1_000) return `${(meters / 1_000).toFixed(1)} km`
  return `${meters.toFixed(0)} m`
}

const formatCoordinate = (value: number, positive: string, negative: string, digits = 3): string => {
  const suffix = value >= 0 ? positive : negative
  return `${Math.abs(value).toFixed(digits)}°${suffix}`
}

const formatOrientation = (azimuthDeg: number | null, tiltDeg: number | null): string => {
  if (azimuthDeg === null || tiltDeg === null) return 'AZ / TILT --'
  return `AZ ${azimuthDeg.toFixed(0)}° / TILT ${tiltDeg.toFixed(0)}°`
}

let toastTimer = 0
function showToast(message: string, durationMs = 2200): void {
  window.clearTimeout(toastTimer)
  toast.textContent = message
  toast.hidden = false
  toast.dataset.visible = 'true'
  toastTimer = window.setTimeout(() => {
    toast.dataset.visible = 'false'
    window.setTimeout(() => { toast.hidden = true }, 180)
  }, durationMs)
}

function setRuntimeStatus(state: RuntimeState, message: string): void {
  status.textContent = message
  statusDot.dataset.state = state
  brandButton.setAttribute('aria-label', `Doom Map commands. ${message}`)
  if (state !== 'ready') showToast(message, 4000)
}

function safeGet(key: string): string | null {
  try { return localStorage.getItem(key) } catch { return null }
}

function safeSet(key: string, value: string): boolean {
  try { localStorage.setItem(key, value); return true } catch { return false }
}

function safeRemove(key: string): void {
  try { localStorage.removeItem(key) } catch { /* storage unavailable */ }
}

async function copyText(value: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(value)
    return true
  } catch {
    try {
      const input = document.createElement('textarea')
      input.value = value
      input.setAttribute('readonly', '')
      input.style.position = 'fixed'
      input.style.opacity = '0'
      document.body.append(input)
      input.select()
      const copied = document.execCommand('copy')
      input.remove()
      return copied
    } catch {
      return false
    }
  }
}

const preferredInitialTier = chooseInitialQuality({
  devicePixelRatio: window.devicePixelRatio || 1,
  hardwareConcurrency: navigator.hardwareConcurrency || 4,
  reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches
})

const storedQualityMode = safeGet(QUALITY_MODE_KEY)
let qualityMode: QualityMode = isQualityMode(storedQualityMode) ? storedQualityMode : 'auto'
const initialTier = qualityMode === 'auto' ? preferredInitialTier : qualityMode
const autoQuality = new AutoQualityGovernor()
const viewHistory = new SnapshotHistory<CameraBookmark>(48)
let suppressHistory = false
let app: GlobeApp | null = null
let referenceData: ReferenceDataController | null = null
let lastPerformance: PerformanceTelemetry | null = null
let uiHidden = false
let telemetryVisible = false
let idleTimer = 0
const networkState = new NetworkState(navigator.onLine, performance.now())

function bookmarkKey(bookmark: CameraBookmark): string {
  const compact = [...bookmark.camera, ...bookmark.target, ...(bookmark.up ?? [0, 0, 1])]
    .map((value) => Math.round(value * 10) / 10)
  return `${compact.join(',')}|${bookmark.qualityTier}`
}

function recordBookmark(bookmark: CameraBookmark): void {
  if (suppressHistory) return
  viewHistory.push(bookmark, bookmarkKey(bookmark))
  syncCommandAvailability()
}

function applyBookmark(bookmark: CameraBookmark): boolean {
  if (!app) return false
  suppressHistory = true
  const restored = app.restoreCameraBookmark(bookmark)
  suppressHistory = false
  if (restored) syncCommandAvailability()
  return restored
}

function qualityLabel(): string {
  const tier = app?.getQualityTier() ?? initialTier
  return qualityMode === 'auto' ? `QUALITY AUTO · ${tier.toUpperCase()}` : `QUALITY ${tier.toUpperCase()}`
}

function updateQualityReadout(): void {
  qualityReadout.textContent = qualityLabel()
  for (const button of commandButtons) {
    const command = button.dataset.command
    if (!command?.startsWith('quality-')) continue
    const active = command === `quality-${qualityMode}`
    button.dataset.active = active ? 'true' : 'false'
    button.setAttribute('aria-pressed', String(active))
  }
}

function setQualityMode(mode: QualityMode): void {
  if (!app) return
  qualityMode = mode
  safeSet(QUALITY_MODE_KEY, mode)
  autoQuality.reset(performance.now())
  const tier = mode === 'auto' ? preferredInitialTier : mode
  app.setQualityTier(tier)
  updateQualityReadout()
  showToast(mode === 'auto' ? `Adaptive quality enabled · ${tier}` : `Quality set to ${tier}`)
}

function setUiHidden(hidden: boolean): void {
  uiHidden = hidden
  document.body.dataset.uiHidden = hidden ? 'true' : 'false'
  showUi.hidden = !hidden
  if (!hidden) markUiActive()
}

function setTelemetryVisible(visible: boolean): void {
  telemetryVisible = visible
  telemetryPanel.hidden = !visible
  if (visible) markUiActive()
}

function markUiActive(): void {
  document.body.dataset.uiIdle = 'false'
  window.clearTimeout(idleTimer)
  if (uiHidden || commandDialog.open || helpDialog.open || aboutDialog.open) return
  const delay = window.matchMedia('(pointer: coarse)').matches ? 4200 : IDLE_DELAY_MS
  idleTimer = window.setTimeout(() => {
    if (!chrome.matches(':focus-within') && !commandDialog.open && !helpDialog.open && !aboutDialog.open) {
      document.body.dataset.uiIdle = 'true'
    }
  }, delay)
}

function openDialog(dialog: HTMLDialogElement): void {
  if (!dialog.open) dialog.showModal()
  document.body.dataset.uiIdle = 'false'
}

function openCommands(prefill = ''): void {
  openDialog(commandDialog)
  commandSearch.value = prefill
  filterCommandList()
  window.requestAnimationFrame(() => commandSearch.focus())
}

function closeCommands(): void {
  if (commandDialog.open) commandDialog.close()
  canvas.focus({ preventScroll: true })
  markUiActive()
}

function buildShareState(): ShareableViewState | null {
  if (!app) return null
  const bookmark = app.getCameraBookmark()
  return {
    version: 1,
    camera: bookmark.camera,
    target: bookmark.target,
    up: bookmark.up ?? [0, 0, 1],
    qualityMode,
    selected: app.getSelection(),
    hudHidden: uiHidden
  }
}

function applyShareState(state: ShareableViewState): boolean {
  if (!app) return false
  qualityMode = state.qualityMode
  safeSet(QUALITY_MODE_KEY, qualityMode)
  const tier = qualityMode === 'auto' ? preferredInitialTier : qualityMode
  const restored = applyBookmark({
    version: 1,
    camera: state.camera,
    target: state.target,
    up: state.up,
    qualityTier: tier
  })
  if (!restored) return false
  app.setSelection(state.selected)
  setUiHidden(state.hudHidden)
  updateQualityReadout()
  return true
}

function getSavedBookmark(): CameraBookmark | null {
  const raw = safeGet(BOOKMARK_KEY)
  if (!raw) return null
  try {
    const parsed: unknown = JSON.parse(raw)
    return isCameraBookmark(parsed) ? parsed : null
  } catch {
    return null
  }
}

function syncCommandAvailability(): void {
  const selection = app?.getSelection() ?? null
  const states: Record<string, boolean> = {
    'focus-target': selection !== null,
    'copy-target': selection !== null,
    'history-back': viewHistory.canBack(),
    'history-forward': viewHistory.canForward(),
    'restore-view': getSavedBookmark() !== null
  }
  for (const button of commandButtons) {
    const command = button.dataset.command ?? ''
    if (command in states) button.disabled = !states[command]
  }
}

function updateTargetUi(): void {
  const selection = app?.getSelection() ?? null
  targetChip.hidden = selection === null
  if (!selection) {
    targetSummary.textContent = 'TARGET --'
  } else {
    targetSummary.textContent = `${formatCoordinate(selection.latitudeDeg, 'N', 'S', 4)} · ${formatCoordinate(selection.longitudeDeg, 'E', 'W', 4)}`
  }
  syncCommandAvailability()
}

function formatCoordinatePreview(): string {
  const point = parseCoordinateInput(commandSearch.value)
  if (!point) return ''
  return `${formatCoordinate(point.latitudeDeg, 'N', 'S', 4)} · ${formatCoordinate(point.longitudeDeg, 'E', 'W', 4)}`
}

function filterCommandList(): void {
  const query = commandSearch.value
  const coordinate = parseCoordinateInput(query)
  coordinateAction.hidden = coordinate === null
  coordinatePreview.textContent = coordinate ? formatCoordinatePreview() : ''

  const matches = new Set(filterCommands(searchableCommands, coordinate ? '' : query).map((command) => command.id))
  for (const button of commandButtons) {
    button.hidden = !matches.has(button.dataset.command ?? '')
  }
}

async function executeCommand(command: string): Promise<void> {
  if (!app) return
  switch (command) {
    case 'home': app.resetView(); break
    case 'focus-target': app.focusOnSelection(); break
    case 'north-up': app.orientNorthUp(); break
    case 'history-back': {
      const view = viewHistory.back()
      if (view) applyBookmark(view)
      break
    }
    case 'history-forward': {
      const view = viewHistory.forward()
      if (view) applyBookmark(view)
      break
    }
    case 'save-view': {
      if (safeSet(BOOKMARK_KEY, JSON.stringify(app.getCameraBookmark()))) showToast('View saved locally.')
      else showToast('This browser blocked local view storage.')
      syncCommandAvailability()
      break
    }
    case 'restore-view': {
      const bookmark = getSavedBookmark()
      if (!bookmark || !applyBookmark(bookmark)) {
        safeRemove(BOOKMARK_KEY)
        showToast('Saved view was invalid and has been cleared.')
      } else showToast('Saved view restored.')
      syncCommandAvailability()
      break
    }
    case 'copy-target': {
      const selection = app.getSelection()
      if (!selection) break
      const value = `${selection.latitudeDeg.toFixed(6)}, ${selection.longitudeDeg.toFixed(6)}`
      showToast(await copyText(value) ? 'Target coordinates copied.' : 'Clipboard unavailable.')
      break
    }
    case 'share-view': {
      const state = buildShareState()
      if (!state) break
      const url = new URL(window.location.href)
      url.hash = serializeViewState(state).slice(1)
      showToast(await copyText(url.toString()) ? 'Share link copied.' : 'Clipboard unavailable.')
      break
    }
    case 'toggle-telemetry': setTelemetryVisible(!telemetryVisible); break
    case 'quality-auto': setQualityMode('auto'); break
    case 'quality-high': setQualityMode('high'); break
    case 'quality-balanced': setQualityMode('balanced'); break
    case 'quality-low': setQualityMode('low'); break
    case 'quality-safe': setQualityMode('safe'); break
    case 'fullscreen': {
      try {
        if (document.fullscreenElement) await document.exitFullscreen()
        else await document.documentElement.requestFullscreen()
      } catch { showToast('Fullscreen is unavailable in this browser.') }
      break
    }
    case 'hide-ui': setUiHidden(true); break
    case 'copy-diagnostics': {
      const diagnostics = JSON.stringify({
        capturedAt: new Date().toISOString(),
        qualityMode,
        performance: lastPerformance,
        globe: app.getDiagnostics(),
        connectivity: networkState.snapshot(),
        foundation: auditFoundation(),
        streaming: referenceData?.diagnostics() ?? null
      }, null, 2)
      showToast(await copyText(diagnostics) ? 'Diagnostics copied.' : 'Clipboard unavailable.')
      break
    }
    case 'help': closeCommands(); openDialog(helpDialog); return
    case 'about': closeCommands(); openDialog(aboutDialog); return
  }
  if (commandDialog.open && command !== 'help' && command !== 'about') closeCommands()
  markUiActive()
}

try {
  app = new GlobeApp(canvas, {
    onTelemetry: (telemetry) => {
      lat.textContent = `LAT ${formatCoordinate(telemetry.latitudeDeg, 'N', 'S')}`
      lon.textContent = `LON ${formatCoordinate(telemetry.longitudeDeg, 'E', 'W')}`
      alt.textContent = `ALT ${formatAltitude(telemetry.altitudeM)}`
      orientation.textContent = formatOrientation(telemetry.azimuthDeg, telemetry.tiltDeg)
    },
    onPerformance: (telemetry) => {
      lastPerformance = telemetry
      performanceReadout.textContent = `${telemetry.fps.toFixed(0)} FPS · ${telemetry.frameMs.toFixed(1)} ms · ${telemetry.drawCalls} calls · ${Math.round(telemetry.triangles / 1000)}k tri`
      if (qualityMode === 'auto' && app) {
        const nextTier = autoQuality.observe(telemetry.frameMs, app.getQualityTier(), performance.now(), preferredInitialTier)
        if (nextTier) {
          app.setQualityTier(nextTier)
          updateQualityReadout()
          showToast(`Adaptive quality → ${nextTier}`)
        }
      }
    },
    onSelection: () => updateTargetUi(),
    onStatus: setRuntimeStatus,
    onScale: (value) => {
      scaleMeter.hidden = value === null
      if (!value) return
      scaleLine.style.width = `${Math.max(24, Math.min(150, value.widthPx))}px`
      scaleLabel.textContent = value.label
    },
    onViewSettled: recordBookmark
  }, initialTier)

  updateQualityReadout()
  app.start()
  recordBookmark(app.getCameraBookmark())

  referenceData = new ReferenceDataController(import.meta.env.BASE_URL, resourceBudgetFor(app.getQualityTier()))
  void referenceData.load().then((layer) => {
    if (!app) {
      layer.dispose()
      return
    }
    app.setDataLayer('reference-regions', layer)
  }).catch((error: unknown) => {
    if (error instanceof DOMException && error.name === 'AbortError') return
    console.warn('Reference geodata layer failed to load.', error)
  })
  const initialState = parseViewState(window.location.hash)
  if (initialState && !applyShareState(initialState)) showToast('The shared view state was invalid.')
  updateTargetUi()
} catch (error) {
  const message = error instanceof Error ? error.message : 'Unknown renderer initialization failure.'
  fatalMessage.textContent = message
  fatalPanel.hidden = false
  setRuntimeStatus('context-lost', 'Unable to start the Three.js renderer.')
  console.error(error)
}

coordinateGo.addEventListener('click', () => {
  const point = parseCoordinateInput(commandSearch.value)
  if (!point || !app) return
  app.goToGeodetic(point)
  closeCommands()
  showToast(`Flying to ${formatCoordinate(point.latitudeDeg, 'N', 'S', 3)} ${formatCoordinate(point.longitudeDeg, 'E', 'W', 3)}`)
})

commandSearch.addEventListener('input', filterCommandList)
commandSearch.addEventListener('keydown', (event) => {
  if (event.key !== 'Enter') return
  const point = parseCoordinateInput(commandSearch.value)
  if (point) {
    event.preventDefault()
    coordinateGo.click()
    return
  }
  const visible = commandButtons.filter((button) => !button.hidden && !button.disabled)
  if (visible.length === 1) {
    event.preventDefault()
    visible[0]?.click()
  }
})

for (const button of commandButtons) {
  button.addEventListener('click', () => { void executeCommand(button.dataset.command ?? '') })
}

brandButton.addEventListener('click', () => openCommands())
commandButton.addEventListener('click', () => openCommands())
closeCommand.addEventListener('click', closeCommands)
closeHelp.addEventListener('click', () => helpDialog.close())
closeAbout.addEventListener('click', () => aboutDialog.close())
targetFocus.addEventListener('click', () => app?.focusOnSelection())
targetCopy.addEventListener('click', () => { void executeCommand('copy-target') })
targetClear.addEventListener('click', () => app?.clearSelection())
showUi.addEventListener('click', () => setUiHidden(false))

window.addEventListener('keydown', (event) => {
  const target = event.target
  const editing = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault(); openCommands(); return
  }
  if (!editing && event.key === '/') {
    event.preventDefault(); openCommands(); return
  }
  if (editing || commandDialog.open || helpDialog.open || aboutDialog.open) return
  if (event.key === '?') { event.preventDefault(); openDialog(helpDialog); return }
  if (event.key.toLowerCase() === 'h') { event.preventDefault(); setUiHidden(!uiHidden); return }
  if (event.key.toLowerCase() === 'i') { event.preventDefault(); setTelemetryVisible(!telemetryVisible); return }
  if (event.key === '[') { event.preventDefault(); void executeCommand('history-back'); return }
  if (event.key === ']') { event.preventDefault(); void executeCommand('history-forward') }
})

window.addEventListener('hashchange', () => {
  const state = parseViewState(window.location.hash)
  if (state && applyShareState(state)) showToast('Shared view restored.')
})

window.addEventListener('resize', () => app?.refreshDisplayScale(), { passive: true })
window.addEventListener('storage', syncCommandAvailability)
window.addEventListener('online', () => {
  const before = networkState.snapshot().state
  const after = networkState.observe(true, performance.now())
  if (before !== after.state) showToast('Network connection restored.')
})
window.addEventListener('offline', () => {
  const before = networkState.snapshot().state
  const after = networkState.observe(false, performance.now())
  if (before !== after.state) showToast('Offline mode · cached shell remains available.')
})
window.addEventListener('pointermove', markUiActive, { passive: true })
window.addEventListener('touchstart', markUiActive, { passive: true })
window.addEventListener('keydown', markUiActive, { passive: true })
window.addEventListener('focusin', markUiActive)
canvas.addEventListener('pointerdown', () => { document.body.dataset.interacting = 'true' })
window.addEventListener('pointerup', () => { delete document.body.dataset.interacting; markUiActive() }, { passive: true })
window.addEventListener('pointercancel', () => { delete document.body.dataset.interacting; markUiActive() }, { passive: true })
window.addEventListener('pagehide', () => { referenceData?.dispose(); app?.dispose() }, { once: true })

for (const dialog of [commandDialog, helpDialog, aboutDialog]) {
  dialog.addEventListener('close', markUiActive)
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close()
  })
}

syncCommandAvailability()
updateQualityReadout()
markUiActive()

void registerOfflineShell()
