import * as THREE from 'three'
import { TileScheduler } from '../data/TileScheduler'
import { NaturalEarthProvider, regionalRequests } from '../data/providers/NaturalEarth'
import { geodeticToEcef, toRenderRelative } from '../core/coordinates'

/** Owns only GPU presentation; authoritative decoded geographic values stay Float64. */
export class RegionalGeography {
  readonly group = new THREE.Group()
  private readonly layers = new Map<string, THREE.LineSegments>()
  private readonly scheduler: TileScheduler<Float64Array>
  private region = ''
  private error = ''

  constructor() {
    this.scheduler = new TileScheduler(new NaturalEarthProvider(), {
      concurrency: 3, maxTiles: 12, maxBytes: 2_000_000, retries: 1, retryDelayMs: 250,
      onLoad: (id, tile) => {
        const [x, y] = id.split('-').map(Number) as [number, number]
        const anchor = geodeticToEcef({ longitudeDeg: x * 30 - 165, latitudeDeg: y * 30 - 75, heightM: 1000 })
        const positions: number[] = []
        for (let i = 0; i < tile.data.length; i += 4) {
          const lon = tile.data[i]!, lat = tile.data[i + 1]!, lon2 = tile.data[i + 2]!, lat2 = tile.data[i + 3]!
          const steps = Math.max(1, Math.ceil(Math.max(Math.abs(lon2 - lon), Math.abs(lat2 - lat))))
          for (let j = 0; j < steps; j++) for (const t of [j / steps, (j + 1) / steps]) {
            const point = geodeticToEcef({ longitudeDeg: lon + (lon2 - lon) * t, latitudeDeg: lat + (lat2 - lat) * t, heightM: 1000 })
            const local = toRenderRelative(point, anchor)
            positions.push(local.x, local.y, local.z)
          }
        }
        const geometry = new THREE.BufferGeometry()
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
        const layer = new THREE.LineSegments(geometry, new THREE.LineBasicMaterial({ color: 0x9ac7b6, transparent: true, opacity: 0.8 }))
        layer.position.copy(anchor)
        this.layers.set(id, layer)
        this.group.add(layer)
      },
      onUnload: id => {
        const layer = this.layers.get(id)
        if (!layer) return
        this.group.remove(layer)
        layer.geometry.dispose()
        ;(layer.material as THREE.Material).dispose()
        this.layers.delete(id)
      },
      onError: (id, error) => { this.error = `${id}: ${String(error)}` }
    })
  }

  update(latitude: number, longitude: number, altitude: number): void {
    const enabled = altitude >= 200_000 && altitude < 3_000_000
    const requests = enabled ? regionalRequests(latitude, longitude) : []
    const key = requests.map(r => r.id).join(',')
    if (key !== this.region) {
      this.region = key
      this.error = ''
      this.scheduler.update(requests)
    }
    const stats = this.scheduler.snapshot()
    // Atomic replacement prevents duplicate coastline brightness; global fallback remains until ready.
    this.group.visible = enabled && stats.active === 0 && stats.queued === 0 && stats.failed === 0 && stats.resident > 0
  }

  snapshot() { return { ...this.scheduler.snapshot(), error: this.error, gpuTiles: this.layers.size, visible: this.group.visible } }
  dispose(): void { this.scheduler.dispose() }
}
