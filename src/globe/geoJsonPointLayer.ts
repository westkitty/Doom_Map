import * as THREE from 'three'
import { geodeticToEcef } from '../core/coordinates'
import type { GeoJsonFeatureCollection } from '../data/staticGeoJsonProvider'

export interface ParsedGeoJsonPoint {
  longitudeDeg: number
  latitudeDeg: number
  heightM: number
  properties: Record<string, unknown>
}

export interface GlobeDataLayer {
  readonly object3d: THREE.Object3D
  dispose(): void
  setOpacity?(opacity: number): void
}

export function extractGeoJsonPoints(collection: GeoJsonFeatureCollection): ParsedGeoJsonPoint[] {
  const points: ParsedGeoJsonPoint[] = []
  for (const feature of collection.features) {
    if (!feature || typeof feature !== 'object') continue
    const candidate = feature as {
      geometry?: { type?: unknown; coordinates?: unknown }
      properties?: unknown
    }
    if (candidate.geometry?.type !== 'Point' || !Array.isArray(candidate.geometry.coordinates)) continue
    const [longitudeDeg, latitudeDeg, height = 0] = candidate.geometry.coordinates
    if (typeof longitudeDeg !== 'number' || typeof latitudeDeg !== 'number' || typeof height !== 'number') continue
    if (![longitudeDeg, latitudeDeg, height].every(Number.isFinite)) continue
    if (longitudeDeg < -180 || longitudeDeg > 180 || latitudeDeg < -90 || latitudeDeg > 90) continue
    points.push({
      longitudeDeg,
      latitudeDeg,
      heightM: height,
      properties: candidate.properties && typeof candidate.properties === 'object'
        ? { ...(candidate.properties as Record<string, unknown>) }
        : {}
    })
  }
  return points
}

export class GeoJsonPointLayer implements GlobeDataLayer {
  readonly object3d: THREE.Points
  private readonly material: THREE.PointsMaterial
  private readonly geometry: THREE.BufferGeometry

  constructor(collection: GeoJsonFeatureCollection, options: { sizePx?: number; opacity?: number; color?: number } = {}) {
    const positions: THREE.Vector3[] = []
    for (const point of extractGeoJsonPoints(collection)) {
      const ecef = geodeticToEcef({
        latitudeDeg: point.latitudeDeg,
        longitudeDeg: point.longitudeDeg,
        heightM: point.heightM + 12_000
      })
      positions.push(new THREE.Vector3(ecef.x, ecef.y, ecef.z))
    }

    this.geometry = new THREE.BufferGeometry().setFromPoints(positions)
    this.material = new THREE.PointsMaterial({
      color: options.color ?? 0xffc857,
      size: options.sizePx ?? 8,
      sizeAttenuation: false,
      transparent: true,
      opacity: options.opacity ?? 0.9,
      depthTest: true,
      depthWrite: false
    })
    this.object3d = new THREE.Points(this.geometry, this.material)
    this.object3d.renderOrder = 4
  }

  setOpacity(opacity: number): void {
    if (!Number.isFinite(opacity) || opacity < 0 || opacity > 1) throw new RangeError('Layer opacity must be between 0 and 1.')
    this.material.opacity = opacity
  }

  dispose(): void {
    this.geometry.dispose()
    this.material.dispose()
  }
}
