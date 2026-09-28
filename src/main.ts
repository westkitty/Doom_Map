import './style.css'
import models from '../data/models.json'
import providers from '../data/providers.json'
import { parseManifest } from './data/provenance'
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

const records = [...parseManifest(models, 'model'), ...parseManifest(providers, 'provider')]
const science = document.querySelector<HTMLElement>('#science-content')!
for (const record of records) {
  const heading = document.createElement('h2')
  heading.textContent = `${record.title} · ${record.fidelity}`
  const description = document.createElement('p')
  description.textContent = `${record.id}@${record.version}. ${record.uncertainty} ${record.limitations.join(' ')} ${record.assumptions.join(' ')} Coverage: ${record.coverage} Timestamp: ${record.timestamp ?? 'not applicable / unknown'}. ${record.attribution} License: ${record.license}`
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
