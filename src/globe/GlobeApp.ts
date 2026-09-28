import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { FrameStatistics } from '../core/performance'
import { QUALITY, type QualityTier } from '../core/quality'
import { type CameraBookmark, validBookmark } from '../core/bookmarks'
import { WGS84, ecefToGeodetic, geodeticToEcef, enuFrame, intersectEllipsoid, type GeodeticPoint } from '../core/coordinates'

const EARTH_A = WGS84.semiMajorAxis
const EARTH_B = WGS84.semiMinorAxis

export interface GlobeTelemetry {
  latitudeDeg: number
  longitudeDeg: number
  altitudeM: number
}

export class GlobeApp {
  private readonly renderer: THREE.WebGLRenderer
  private readonly scene = new THREE.Scene()
  private readonly camera = new THREE.PerspectiveCamera(38, 1, 10_000, 1_000_000_000)
  private readonly controls: OrbitControls
  private readonly earth = new THREE.Group()
  private readonly world = new THREE.Group()
  private readonly renderCamera = new THREE.PerspectiveCamera()
  private readonly marker = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 8), new THREE.MeshBasicMaterial({ color: 0xffb46a }))
  private quality: QualityTier = 'Balanced'
  private selection: GeodeticPoint | null = null
  private pointerStart = { x: 0, y: 0 }
  private lastTap = 0
  private flight: { start: number; from: GeodeticPoint; to: GeodeticPoint; target: THREE.Vector3 } | null = null
  private readonly onTelemetry: (value: GlobeTelemetry) => void
  private animationFrame = 0
  private running = false
  private disposed = false
  private readonly geographyAbort = new AbortController()
  private geography: THREE.LineSegments | undefined
  private readonly statistics = new FrameStatistics()

  constructor(canvas: HTMLCanvasElement, onTelemetry: (value: GlobeTelemetry) => void) {
    this.onTelemetry = onTelemetry
    canvas.dataset.geography = 'loading'
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    this.renderer.outputColorSpace = THREE.SRGBColorSpace

    this.camera.up.set(0, 0, 1)
    this.camera.position.set(EARTH_A * 2.35, EARTH_A * 0.65, EARTH_A * 1.65)

    this.controls = new OrbitControls(this.camera, canvas)
    this.controls.enableDamping = !matchMedia('(prefers-reduced-motion: reduce)').matches
    this.controls.dampingFactor = 0.055
    this.controls.enablePan = true
    this.controls.screenSpacePanning = false
    this.controls.minDistance = 30
    this.controls.maxDistance = EARTH_A * 9
    this.controls.zoomSpeed = 0.75
    this.controls.rotateSpeed = 0.5
    this.controls.panSpeed = 0.35

    this.world.add(new THREE.AmbientLight(0x6c8391, 0.55))
    const sun = new THREE.DirectionalLight(0xffffff, 2.6)
    sun.position.set(EARTH_A * 4, EARTH_A * 1.5, EARTH_A * 3)
    this.world.add(sun, sun.target)

    this.buildEarth()
    this.world.add(this.earth, this.marker)
    this.marker.visible = false
    this.scene.add(this.world)
    this.setQuality('Balanced')
    void import('./geography').then(module => module.loadGeography(this.geographyAbort.signal)).then(layer => {
      if (this.disposed) { layer.geometry.dispose(); (layer.material as THREE.Material).dispose(); return }
      this.geography = layer
      this.world.add(layer)
      canvas.dataset.geography = 'loaded'
      canvas.dispatchEvent(new CustomEvent('geography-status', { detail: 'Natural Earth 1:110m · C / data-driven · snapshot 2022-06-02' }))
    }).catch(error => {
      if (this.disposed) return
      canvas.dataset.geography = 'unavailable'
      canvas.dispatchEvent(new CustomEvent('geography-status', { detail: `Geography unavailable: ${String(error)}. Ellipsoid/grid only; no substitute data.` }))
    })
    canvas.addEventListener('pointerdown', this.onPointerDown)
    canvas.addEventListener('pointerup', this.onPointerUp)
    canvas.addEventListener('dblclick', this.onDoubleClick)
    canvas.addEventListener('wheel', this.cancelFlight)
    canvas.addEventListener('keydown', this.onKeyDown)

    this.resize()
    window.addEventListener('resize', this.resize)
    this.renderer.domElement.addEventListener('webglcontextlost', this.onContextLost)
    this.renderer.domElement.addEventListener('webglcontextrestored', this.onContextRestored)
  }

  start(): void {
    if (this.running || this.disposed) return
    this.running = true
    this.renderer.domElement.dataset.lifecycle = JSON.stringify({ state: 'running' })
    const frame = (): void => {
      if (!this.running) return
      this.updateFlight()
      this.controls.update()
      const geo = ecefToGeodetic(this.camera.position)
      if (geo.heightM < 30) this.camera.position.copy(new THREE.Vector3().copy(geodeticToEcef({ ...geo, heightM: 30 })))
      this.camera.near = Math.max(0.1, Math.min(10_000, geo.heightM / 1000))
      this.camera.updateProjectionMatrix()
      this.camera.updateMatrixWorld()
      this.updateTelemetry()
      if (this.geography) this.geography.visible = geo.heightM >= 200_000
      // Orbit camera remains in double-precision ECEF. Only render copies are rebased.
      this.renderCamera.copy(this.camera)
      this.renderCamera.position.set(0, 0, 0)
      this.world.position.copy(this.camera.position).negate()
      if (this.selection) this.marker.scale.setScalar(Math.max(0.1, Math.max(30, geo.heightM) * 0.006))
      this.renderer.render(this.scene, this.renderCamera)
      if (this.geography) this.renderer.domElement.dataset.geography = 'ready'
      this.statistics.record(performance.now())
      const info = this.renderer.info
      this.renderer.domElement.dataset.runtime = JSON.stringify({
        ...this.statistics.snapshot(), calls: info.render.calls,
        triangles: info.render.triangles, geometries: info.memory.geometries,
        textures: info.memory.textures, frame: info.render.frame,
        camera: this.camera.position.toArray(), target: this.controls.target.toArray(),
        aspect: this.camera.aspect, quality: this.quality, renderOrigin: this.camera.position.toArray(),
        renderCamera: this.renderCamera.position.toArray(), selection: this.selection
      })
      this.animationFrame = requestAnimationFrame(frame)
    }
    frame()
  }

  dispose(): void {
    if (this.disposed) return
    this.disposed = true
    this.geographyAbort.abort()
    this.running = false
    cancelAnimationFrame(this.animationFrame)
    window.removeEventListener('resize', this.resize)
    this.renderer.domElement.removeEventListener('webglcontextlost', this.onContextLost)
    this.renderer.domElement.removeEventListener('webglcontextrestored', this.onContextRestored)
    const canvas = this.renderer.domElement
    canvas.removeEventListener('pointerdown', this.onPointerDown)
    canvas.removeEventListener('pointerup', this.onPointerUp)
    canvas.removeEventListener('dblclick', this.onDoubleClick)
    canvas.removeEventListener('wheel', this.cancelFlight)
    canvas.removeEventListener('keydown', this.onKeyDown)
    this.controls.dispose()
    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh || object instanceof THREE.Line) {
        object.geometry.dispose()
        const material = object.material
        if (Array.isArray(material)) material.forEach((item) => item.dispose())
        else material.dispose()
      }
    })
    this.renderer.dispose()
    this.renderer.domElement.dataset.lifecycle = JSON.stringify({ state: 'disposed',
      geometries: this.renderer.info.memory.geometries, textures: this.renderer.info.memory.textures })
  }

  private buildEarth(): void {
    const globeGeometry = new THREE.SphereGeometry(1, 128, 64)
    const globeMaterial = new THREE.MeshStandardMaterial({
      color: 0x173e57,
      roughness: 0.84,
      metalness: 0.02
    })
    const globe = new THREE.Mesh(globeGeometry, globeMaterial)
    globe.scale.set(EARTH_A, EARTH_A, EARTH_B)
    this.earth.add(globe)

    const atmosphereGeometry = new THREE.SphereGeometry(1, 96, 48)
    const atmosphereMaterial = new THREE.MeshBasicMaterial({
      color: 0x5ba3cc,
      transparent: true,
      opacity: 0.055,
      side: THREE.BackSide,
      depthWrite: false
    })
    const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial)
    atmosphere.name = 'atmosphere'
    atmosphere.scale.set(EARTH_A * 1.016, EARTH_A * 1.016, EARTH_B * 1.016)
    this.earth.add(atmosphere)
    this.earth.add(this.makeGrid())
  }

  private makeGrid(): THREE.Group {
    const group = new THREE.Group()
    group.name = 'grid'
    const material = new THREE.LineBasicMaterial({
      color: 0x87a6b6,
      transparent: true,
      opacity: 0.15
    })

    for (let lat = -75; lat <= 75; lat += 15) {
      const points: THREE.Vector3[] = []
      for (let lon = 0; lon <= 360; lon += 3) {
        points.push(new THREE.Vector3().copy(geodeticToEcef({ latitudeDeg: lat, longitudeDeg: lon, heightM: 100 })))
      }
      group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), material))
    }

    for (let lon = 0; lon < 360; lon += 15) {
      const points: THREE.Vector3[] = []
      for (let lat = -90; lat <= 90; lat += 3) {
        points.push(new THREE.Vector3().copy(geodeticToEcef({ latitudeDeg: lat, longitudeDeg: lon, heightM: 100 })))
      }
      group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), material))
    }

    return group
  }

  setQuality(tier: QualityTier): void {
    this.quality = tier
    const config = QUALITY[tier]
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, config.dpr))
    this.earth.getObjectByName('atmosphere')!.visible = config.atmosphere
    this.earth.getObjectByName('grid')!.visible = config.grid
    this.resize()
  }

  bookmark(): CameraBookmark {
    return { position: this.camera.position.toArray(), target: this.controls.target.toArray() }
  }

  restoreBookmark(bookmark: CameraBookmark): void {
    if (!validBookmark(bookmark)) throw new Error('Invalid camera bookmark')
    this.cancelFlight()
    this.camera.position.fromArray(bookmark.position)
    this.controls.target.fromArray(bookmark.target)
    this.controls.update()
  }

  flyTo(point: GeodeticPoint): void {
    if (![point.latitudeDeg, point.longitudeDeg, point.heightM].every(Number.isFinite) ||
        Math.abs(point.latitudeDeg) > 90 || Math.abs(point.longitudeDeg) > 180 || point.heightM < 30 || point.heightM > 50_000_000) {
      throw new Error('Location requires latitude ±90°, longitude ±180°, altitude 30–50,000,000 m')
    }
    this.select({ ...point, heightM: 0 })
    this.flight = { start: performance.now(), from: ecefToGeodetic(this.camera.position),
      to: { ...point }, target: this.controls.target.clone() }
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) this.updateFlight(1)
  }

  private updateFlight(force?: number): void {
    if (!this.flight) return
    const { start, from, to, target } = this.flight
    const t = force ?? Math.min(1, (performance.now() - start) / 900)
    const smooth = t * t * (3 - 2 * t)
    const lonDelta = ((to.longitudeDeg - from.longitudeDeg + 540) % 360) - 180
    this.camera.position.copy(geodeticToEcef({ latitudeDeg: from.latitudeDeg + (to.latitudeDeg - from.latitudeDeg) * smooth,
      longitudeDeg: from.longitudeDeg + lonDelta * smooth, heightM: from.heightM + (to.heightM - from.heightM) * smooth }))
    this.controls.target.copy(target).lerp(new THREE.Vector3().copy(geodeticToEcef({ ...to, heightM: 0 })), smooth)
    if (t === 1) this.flight = null
  }

  private select(point: GeodeticPoint): void {
    this.selection = point
    this.marker.position.copy(geodeticToEcef(point))
    this.marker.visible = true
    this.renderer.domElement.dispatchEvent(new CustomEvent('globe-selection', { detail: { ...point } }))
  }

  private pick(x: number, y: number): GeodeticPoint | null {
    const rect = this.renderer.domElement.getBoundingClientRect()
    this.camera.updateMatrixWorld()
    const ray = new THREE.Raycaster()
    ray.setFromCamera(new THREE.Vector2((x - rect.left) / rect.width * 2 - 1, -(y - rect.top) / rect.height * 2 + 1), this.camera)
    const hit = intersectEllipsoid(ray.ray.origin, ray.ray.direction)
    return hit ? { ...ecefToGeodetic(hit), heightM: 0 } : null
  }

  private readonly cancelFlight = (): void => { this.flight = null }
  private readonly onPointerDown = (event: PointerEvent): void => {
    this.cancelFlight()
    this.pointerStart = { x: event.clientX, y: event.clientY }
  }
  private readonly onPointerUp = (event: PointerEvent): void => {
    if (event.button !== 0 || Math.hypot(event.clientX - this.pointerStart.x, event.clientY - this.pointerStart.y) > 5) return
    const point = this.pick(event.clientX, event.clientY)
    if (!point) return
    this.select(point)
    if (event.pointerType === 'touch') {
      const now = performance.now()
      if (now - this.lastTap < 350) this.flyTo({ ...point, heightM: 100_000 })
      this.lastTap = now
    }
  }
  private readonly onDoubleClick = (event: MouseEvent): void => {
    const point = this.pick(event.clientX, event.clientY)
    if (point) this.flyTo({ ...point, heightM: 100_000 })
  }
  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', '+', '=', '-', 'Enter', 'Home'].includes(event.key)) return
    event.preventDefault()
    this.cancelFlight()
    const offset = this.camera.position.clone().sub(this.controls.target)
    if (event.key === 'Home') {
      this.controls.target.set(0, 0, 0)
      this.camera.position.set(EARTH_A * 2.35, EARTH_A * 0.65, EARTH_A * 1.65)
    } else if (event.key === 'Enter') {
      const rect = this.renderer.domElement.getBoundingClientRect()
      const point = this.pick(rect.left + rect.width / 2, rect.top + rect.height / 2)
      if (point) this.select(point)
    } else if (['+', '=', '-'].includes(event.key)) {
      this.camera.position.copy(this.controls.target).add(offset.multiplyScalar(event.key === '-' ? 1.2 : 1 / 1.2))
    } else if (event.shiftKey) {
      const frame = enuFrame(ecefToGeodetic(this.camera.position))
      const axis = event.key === 'ArrowLeft' || event.key === 'ArrowRight' ? frame.east : frame.north
      const sign = event.key === 'ArrowLeft' || event.key === 'ArrowDown' ? -1 : 1
      const delta = new THREE.Vector3().copy(axis).multiplyScalar(offset.length() * 0.03 * sign)
      this.camera.position.add(delta)
      this.controls.target.add(delta)
    } else {
      const axis = event.key === 'ArrowLeft' || event.key === 'ArrowRight'
        ? this.camera.up : new THREE.Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion)
      const sign = event.key === 'ArrowLeft' || event.key === 'ArrowDown' ? 1 : -1
      this.camera.position.copy(this.controls.target).add(offset.applyAxisAngle(axis, sign * 0.08))
    }
    this.controls.update()
  }

  private updateTelemetry(): void {
    const position = this.camera.position
    const geo = ecefToGeodetic({ x: position.x, y: position.y, z: position.z })
    this.onTelemetry({
      latitudeDeg: geo.latitudeDeg,
      longitudeDeg: geo.longitudeDeg,
      altitudeM: Math.max(0, geo.heightM)
    })
  }

  private readonly resize = (): void => {
    const { clientWidth, clientHeight } = this.renderer.domElement
    const width = Math.max(1, clientWidth)
    const height = Math.max(1, clientHeight)
    this.renderer.setSize(width, height, false)
    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
  }

  private readonly onContextLost = (event: Event): void => {
    event.preventDefault()
    document.body.dataset.webgl = 'lost'
    this.running = false
    cancelAnimationFrame(this.animationFrame)
    this.renderer.domElement.dispatchEvent(new CustomEvent('globe-status', { detail: 'Graphics context lost. Waiting for recovery.' }))
  }

  private readonly onContextRestored = (): void => {
    delete document.body.dataset.webgl
    this.renderer.domElement.dispatchEvent(new CustomEvent('globe-status', { detail: 'Graphics restored · model systems pending' }))
    this.start()
  }
}
