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

const app = new GlobeApp(canvas, (telemetry) => {
  lat.textContent = 'LAT ' + telemetry.latitudeDeg.toFixed(3) + '°'
  lon.textContent = 'LON ' + telemetry.longitudeDeg.toFixed(3) + '°'
  alt.textContent = 'ALT ' + formatAltitude(telemetry.altitudeM)
})

app.start()

window.addEventListener('pagehide', () => app.dispose(), { once: true })
