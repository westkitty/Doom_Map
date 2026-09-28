import './style.css'
import { GlobeApp } from './globe/GlobeApp'

const canvas = document.querySelector<HTMLCanvasElement>('#globe')
const lat = document.querySelector<HTMLElement>('#lat')
const lon = document.querySelector<HTMLElement>('#lon')
const alt = document.querySelector<HTMLElement>('#alt')

if (!canvas || !lat || !lon || !alt) {
  throw new Error('Doom Map application shell is incomplete.')
}

const formatAltitude = (meters: number): string => {
  if (meters >= 1_000_000) return (meters / 1_000_000).toFixed(2) + ' Mm'
  if (meters >= 1_000) return (meters / 1_000).toFixed(1) + ' km'
  return meters.toFixed(0) + ' m'
}

const status = document.querySelector<HTMLElement>('#status')!
canvas.addEventListener('globe-status', (event) => {
  status.textContent = (event as CustomEvent<string>).detail
})
let app: GlobeApp | undefined
function mount(): void {
  try {
    app = new GlobeApp(canvas!, (telemetry) => {
      lat!.textContent = 'LAT ' + telemetry.latitudeDeg.toFixed(3) + '°'
      lon!.textContent = 'LON ' + telemetry.longitudeDeg.toFixed(3) + '°'
      alt!.textContent = 'ALT ' + formatAltitude(telemetry.altitudeM)
    })
    app.start()
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
