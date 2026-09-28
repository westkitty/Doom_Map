import * as THREE from 'three'
import { polygonRings } from '../data/geojson'
import { geodeticToEcef } from '../core/coordinates'

/** Low-LOD context only. Subdivide long cartographic edges to follow the ellipsoid. */
export async function loadGeography(signal: AbortSignal): Promise<THREE.LineSegments> {
  const response = await fetch(`${import.meta.env.BASE_URL}data/ne_110m_land.geojson`, { signal })
  if (!response.ok) throw new Error(`Natural Earth HTTP ${response.status}`)
  const text = await response.text()
  if (text.length > 1_000_000) throw new Error('Natural Earth byte budget exceeded')
  const rings = polygonRings(JSON.parse(text))
  signal.throwIfAborted()
  const positions: number[] = []
  for (const ring of rings) {
    for (let i = 1; i < ring.length; i++) {
      const a = ring[i - 1]!, b = ring[i]!
      const deltaLon = ((b[0] - a[0] + 540) % 360) - 180
      const steps = Math.max(1, Math.ceil(Math.max(Math.abs(deltaLon), Math.abs(b[1] - a[1]))))
      for (let j = 0; j < steps; j++) {
        for (const t of [j / steps, (j + 1) / steps]) {
          const p = geodeticToEcef({ longitudeDeg: a[0] + deltaLon * t, latitudeDeg: a[1] + (b[1] - a[1]) * t, heightM: 1000 })
          positions.push(p.x, p.y, p.z)
        }
      }
    }
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  const lines = new THREE.LineSegments(geometry, new THREE.LineBasicMaterial({ color: 0x9ac7b6, transparent: true, opacity: 0.8 }))
  lines.name = 'natural-earth'
  return lines
}
