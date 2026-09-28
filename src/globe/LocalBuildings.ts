import * as THREE from 'three'
import { TileScheduler } from '../data/TileScheduler'
import { BuildingProvider, localBuildingRequests, type BuildingFeature, type BuildingTile, type BuildingUse } from '../data/providers/buildings'
import { geodeticToEcef, enuFrame, ecefToEnu, type GeodeticPoint } from '../core/coordinates'
import type { TileDelivery } from '../data/providers/types'

const USE_COLORS: Record<BuildingUse, { wall: number; roof: number }> = {
  commercial: { wall: 0x4a7c99, roof: 0x72a5c4 },
  residential: { wall: 0x9e6848, roof: 0xc28f6e },
  civic: { wall: 0x7b8087, roof: 0xa8adb5 },
  industrial: { wall: 0x73654f, roof: 0x9c8c72 },
  infrastructure: { wall: 0x4f6e62, roof: 0x729687 },
  unknown: { wall: 0x616970, roof: 0x828c94 }
}

interface TileMeshRecord {
  group: THREE.Group
  buildings: BuildingFeature[]
  meshes: THREE.Mesh[]
}

/** Owns GPU presentation of local 3D building extrusions and truth metadata. */
export class LocalBuildings {
  readonly group = new THREE.Group()
  private readonly provider = new BuildingProvider()
  private readonly scheduler: TileScheduler<BuildingTile>
  private readonly tiles = new Map<string, TileMeshRecord>()
  private readonly delivery = new Map<string, TileDelivery>()
  private region = ''
  private error = ''

  constructor() {
    this.scheduler = new TileScheduler(this.provider, {
      concurrency: 3,
      maxTiles: 12,
      maxBytes: 4_000_000,
      retries: 1,
      retryDelayMs: 250,
      onLoad: (id, tile) => {
        if (tile.delivery) this.delivery.set(id, tile.delivery)
        const tileData = tile.data
        if (!tileData.buildings || tileData.buildings.length === 0) return

        const centerLon = (tileData.bounds.west + tileData.bounds.east) / 2
        const centerLat = (tileData.bounds.south + tileData.bounds.north) / 2
        const anchorGeo: GeodeticPoint = { longitudeDeg: centerLon, latitudeDeg: centerLat, heightM: 0 }
        const frame = enuFrame(anchorGeo)

        const tileGroup = new THREE.Group()
        // Orientation basis from ENU vectors
        const rotMatrix = new THREE.Matrix4().makeBasis(
          new THREE.Vector3(frame.east.x, frame.east.y, frame.east.z),
          new THREE.Vector3(frame.north.x, frame.north.y, frame.north.z),
          new THREE.Vector3(frame.up.x, frame.up.y, frame.up.z)
        )
        tileGroup.quaternion.setFromRotationMatrix(rotMatrix)
        tileGroup.position.copy(frame.origin)

        const tileMeshes: THREE.Mesh[] = []

        for (const b of tileData.buildings) {
          const colors = USE_COLORS[b.use] || USE_COLORS.unknown
          const enuCoords: { east: number; north: number; up: number }[] = []

          for (const [lon, lat] of b.footprint) {
            const ecef = geodeticToEcef({ longitudeDeg: lon, latitudeDeg: lat, heightM: 0 })
            const enu = ecefToEnu(ecef, frame)
            enuCoords.push({ east: enu.eastM, north: enu.northM, up: enu.upM })
          }

          const n = enuCoords.length
          if (n < 3) continue

          const positions: number[] = []
          const normals: number[] = []
          const h = b.heightM

          // 1. Side walls
          for (let i = 0; i < n; i++) {
            const next = (i + 1) % n
            const p1 = enuCoords[i]!
            const p2 = enuCoords[next]!

            // Edge direction and wall normal in ENU (east, north, up)
            const dx = p2.east - p1.east
            const dy = p2.north - p1.north
            const len = Math.hypot(dx, dy)
            const nx = len > 1e-6 ? dy / len : 0
            const ny = len > 1e-6 ? -dx / len : 0

            // Quad vertices: p1_base, p2_base, p2_top, p1_top
            // Triangle 1: p1_base, p2_base, p2_top
            positions.push(p1.east, p1.north, p1.up)
            normals.push(nx, ny, 0)
            positions.push(p2.east, p2.north, p2.up)
            normals.push(nx, ny, 0)
            positions.push(p2.east, p2.north, p2.up + h)
            normals.push(nx, ny, 0)

            // Triangle 2: p1_base, p2_top, p1_top
            positions.push(p1.east, p1.north, p1.up)
            normals.push(nx, ny, 0)
            positions.push(p2.east, p2.north, p2.up + h)
            normals.push(nx, ny, 0)
            positions.push(p1.east, p1.north, p1.up + h)
            normals.push(nx, ny, 0)
          }

          // 2. Roof polygon triangulation
          const vec2Pts = enuCoords.map(c => new THREE.Vector2(c.east, c.north))
          let triangles: number[][] = []
          try {
            triangles = THREE.ShapeUtils.triangulateShape(vec2Pts, [])
          } catch {
            // Convex fan fallback if triangulation fails
            for (let i = 1; i < n - 1; i++) triangles.push([0, i, i + 1])
          }

          for (const tri of triangles) {
            for (const idx of tri) {
              const pt = enuCoords[idx]!
              positions.push(pt.east, pt.north, pt.up + h)
              normals.push(0, 0, 1)
            }
          }

          const geometry = new THREE.BufferGeometry()
          geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
          geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3))

          const material = new THREE.MeshLambertMaterial({
            color: colors.roof,
            polygonOffset: true,
            polygonOffsetFactor: 1,
            polygonOffsetUnits: 1
          })

          const mesh = new THREE.Mesh(geometry, material)
          mesh.userData = { building: b }
          tileGroup.add(mesh)
          tileMeshes.push(mesh)

          // 3. Crisp roof edge outlines
          const linePositions: number[] = []
          for (let i = 0; i < n; i++) {
            const next = (i + 1) % n
            const p1 = enuCoords[i]!
            const p2 = enuCoords[next]!
            linePositions.push(p1.east, p1.north, p1.up + h + 0.1)
            linePositions.push(p2.east, p2.north, p2.up + h + 0.1)
          }
          const lineGeom = new THREE.BufferGeometry()
          lineGeom.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3))
          const lineMat = new THREE.LineBasicMaterial({ color: 0x223344, transparent: true, opacity: 0.6 })
          tileGroup.add(new THREE.LineSegments(lineGeom, lineMat))
        }

        this.tiles.set(id, { group: tileGroup, buildings: tileData.buildings, meshes: tileMeshes })
        this.group.add(tileGroup)
      },
      onUnload: id => {
        this.delivery.delete(id)
        const record = this.tiles.get(id)
        if (!record) return
        this.group.remove(record.group)
        record.group.traverse(obj => {
          if (obj instanceof THREE.Mesh || obj instanceof THREE.LineSegments) {
            obj.geometry.dispose()
            if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose())
            else obj.material.dispose()
          }
        })
        this.tiles.delete(id)
      },
      onError: (id, error) => {
        this.error = `${id}: ${String(error)}`
      }
    })
  }

  update(latitude: number, longitude: number, altitude: number): void {
    const enabled = altitude < 15_000
    const requests = enabled ? localBuildingRequests(latitude, longitude) : []
    const key = requests.map(r => r.id).join(',')
    if (key !== this.region) {
      this.region = key
      this.error = ''
      this.scheduler.update(requests)
    }
    this.group.visible = enabled && this.tiles.size > 0
  }

  pick(raycaster: THREE.Raycaster): BuildingFeature | null {
    if (!this.group.visible) return null
    const allMeshes: THREE.Mesh[] = []
    for (const record of this.tiles.values()) {
      allMeshes.push(...record.meshes)
    }
    const intersects = raycaster.intersectObjects(allMeshes, false)
    if (intersects.length > 0 && intersects[0]?.object.userData.building) {
      return intersects[0].object.userData.building as BuildingFeature
    }
    return null
  }

  snapshot() {
    return {
      ...this.scheduler.snapshot(),
      error: this.error,
      persistent: this.provider.cacheStatus(),
      gpuTiles: this.tiles.size,
      visible: this.group.visible,
      buildingCount: [...this.tiles.values()].reduce((sum, t) => sum + t.buildings.length, 0)
    }
  }

  dispose(): void {
    this.scheduler.dispose()
  }
}
