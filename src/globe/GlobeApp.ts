import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import {
  WGS84,
  ecefToEnu,
  ecefToGeodetic,
  geodeticToEcef,
  type GeodeticPoint
} from '../core/coordinates'
import { intersectWgs84Ellipsoid, localBasisAtGeodetic } from '../core/ellipsoid'
import { QUALITY_PROFILES, type QualityTier } from '../core/quality'
import { chooseScaleBar, type ScaleBarResult } from '../core/scale'
import type { GlobeDataLayer } from './geoJsonPointLayer'

const EARTH_A = WGS84.semiMajorAxis
const EARTH_B = WGS84.semiMinorAxis
const BOOKMARK_VERSION = 1
const GLOBAL_NORTH = new THREE.Vector3(0, 0, 1)

export interface GlobeTelemetry {
  latitudeDeg: number
  longitudeDeg: number
  altitudeM: number
  azimuthDeg: number | null
  tiltDeg: number | null
  targetDistanceM: number
}

export interface PerformanceTelemetry {
  fps: number
  frameMs: number
  drawCalls: number
  triangles: number
  geometries: number
  textures: number
  qualityTier: QualityTier
}

export type RuntimeState = 'ready' | 'suspended' | 'context-lost'

export interface GlobeCallbacks {
  onTelemetry?: (value: GlobeTelemetry) => void
  onPerformance?: (value: PerformanceTelemetry) => void
  onSelection?: (value: GeodeticPoint | null) => void
  onStatus?: (state: RuntimeState, message: string) => void
  onScale?: (value: ScaleBarResult | null) => void
  onViewSettled?: (value: CameraBookmark) => void
}

export interface CameraBookmark {
  version: 1
  camera: [number, number, number]
  target: [number, number, number]
  up?: [number, number, number]
  qualityTier: QualityTier
}

export interface GlobeDiagnostics {
  qualityTier: QualityTier
  camera: CameraBookmark
  selection: GeodeticPoint | null
  contextLost: boolean
  dataLayers: string[]
  canvas: { width: number; height: number; pixelRatio: number }
  renderer: {
    webglVersion: 1 | 2
    maxTextureSize: number
    maxRenderbufferSize: number
    maxTextureImageUnits: number
    drawCalls: number
    triangles: number
    geometries: number
    textures: number
  }
}

interface FlyState {
  startedAtMs: number
  durationMs: number
  fromCamera: THREE.Vector3
  toCamera: THREE.Vector3
  fromTarget: THREE.Vector3
  toTarget: THREE.Vector3
  fromUp: THREE.Vector3
  toUp: THREE.Vector3
}

interface PickResult {
  point: THREE.Vector3
  geodetic: GeodeticPoint
}

interface PointerGesture {
  pointerId: number
  x: number
  y: number
}

function isQualityTier(value: unknown): value is QualityTier {
  return value === 'high' || value === 'balanced' || value === 'low' || value === 'safe'
}

function easeInOutCubic(value: number): number {
  return value < 0.5
    ? 4 * value * value * value
    : 1 - Math.pow(-2 * value + 2, 3) / 2
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function normalizeDegrees(value: number): number {
  return ((value % 360) + 360) % 360
}

export class GlobeApp {
  private readonly renderer: THREE.WebGLRenderer
  private readonly scene = new THREE.Scene()
  private readonly camera = new THREE.PerspectiveCamera(38, 1, 10_000, 1_000_000_000)
  private readonly controls: OrbitControls
  private readonly callbacks: GlobeCallbacks
  private readonly raycaster = new THREE.Raycaster()
  private readonly pointer = new THREE.Vector2()
  private readonly homeCameraPosition = new THREE.Vector3()
  private readonly homeTarget = new THREE.Vector3()
  private readonly selectionMarker: THREE.Points
  private readonly resizeObserver: ResizeObserver | null
  private readonly dataLayers = new Map<string, GlobeDataLayer>()
  private earth = new THREE.Group()
  private selectedGeodetic: GeodeticPoint | null = null
  private started = false
  private disposed = false
  private contextLost = false
  private qualityTier: QualityTier
  private flyState: FlyState | null = null
  private pointerDown: PointerGesture | null = null
  private lastFrameAtMs = 0
  private performanceWindowStartedAtMs = 0
  private accumulatedFrameMs = 0
  private accumulatedFrames = 0
  private lastTelemetryAtMs = 0
  private lastScaleAtMs = 0
  private lastClipNear = this.camera.near
  private lastClipFar = this.camera.far

  constructor(canvas: HTMLCanvasElement, callbacks: GlobeCallbacks, qualityTier: QualityTier = 'balanced') {
    this.callbacks = callbacks
    this.qualityTier = qualityTier

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: qualityTier !== 'safe',
      alpha: true,
      powerPreference: 'high-performance'
    })
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.05
    this.applyPixelRatio()

    this.camera.position.set(EARTH_A * 2.35, EARTH_A * 0.65, EARTH_A * 1.65)
    this.camera.up.copy(GLOBAL_NORTH)
    this.homeCameraPosition.copy(this.camera.position)
    this.homeTarget.set(0, 0, 0)

    this.controls = new OrbitControls(this.camera, canvas)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.055
    this.controls.enablePan = true
    this.controls.screenSpacePanning = false
    this.controls.minDistance = EARTH_A * 1.003
    this.controls.maxDistance = EARTH_A * 9
    this.controls.zoomSpeed = 0.78
    this.controls.rotateSpeed = 0.5
    this.controls.panSpeed = 0.4
    this.controls.keyPanSpeed = 14
    this.controls.keyRotateSpeed = 1.15
    this.controls.zoomToCursor = true
    this.controls.maxTargetRadius = EARTH_A * 1.05
    this.controls.listenToKeyEvents(canvas)
    this.controls.addEventListener('end', this.onControlsEnd)
    this.controls.saveState()

    this.scene.add(new THREE.AmbientLight(0x607989, 0.52))
    const sun = new THREE.DirectionalLight(0xffffff, 2.7)
    sun.position.set(EARTH_A * 4, EARTH_A * 1.5, EARTH_A * 3)
    this.scene.add(sun)

    const markerGeometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0)])
    const markerMaterial = new THREE.PointsMaterial({
      color: 0xff514d,
      size: 11,
      sizeAttenuation: false,
      depthTest: false,
      transparent: true,
      opacity: 0.96
    })
    this.selectionMarker = new THREE.Points(markerGeometry, markerMaterial)
    this.selectionMarker.visible = false
    this.selectionMarker.renderOrder = 10
    this.scene.add(this.selectionMarker)

    this.buildEarth()
    this.resize()

    this.resizeObserver = typeof ResizeObserver === 'function'
      ? new ResizeObserver(this.resize)
      : null
    this.resizeObserver?.observe(canvas)

    canvas.addEventListener('pointerdown', this.onPointerDown)
    canvas.addEventListener('pointerup', this.onPointerUp)
    canvas.addEventListener('pointercancel', this.onPointerCancel)
    canvas.addEventListener('dblclick', this.onDoubleClick)
    canvas.addEventListener('keydown', this.onKeyDown)
    canvas.addEventListener('webglcontextlost', this.onContextLost)
    canvas.addEventListener('webglcontextrestored', this.onContextRestored)
    document.addEventListener('visibilitychange', this.onVisibilityChange)

    this.callbacks.onStatus?.('ready', 'Globe ready. No disaster model is active.')
  }

  start(): void {
    if (this.disposed || this.started) return
    this.started = true
    this.lastFrameAtMs = performance.now()
    this.performanceWindowStartedAtMs = this.lastFrameAtMs
    this.renderer.setAnimationLoop(this.frame)
  }

  dispose(): void {
    if (this.disposed) return
    this.disposed = true
    this.started = false
    this.renderer.setAnimationLoop(null)
    this.resizeObserver?.disconnect()
    this.renderer.domElement.removeEventListener('pointerdown', this.onPointerDown)
    this.renderer.domElement.removeEventListener('pointerup', this.onPointerUp)
    this.renderer.domElement.removeEventListener('pointercancel', this.onPointerCancel)
    this.renderer.domElement.removeEventListener('dblclick', this.onDoubleClick)
    this.renderer.domElement.removeEventListener('keydown', this.onKeyDown)
    this.renderer.domElement.removeEventListener('webglcontextlost', this.onContextLost)
    this.renderer.domElement.removeEventListener('webglcontextrestored', this.onContextRestored)
    document.removeEventListener('visibilitychange', this.onVisibilityChange)
    this.controls.removeEventListener('end', this.onControlsEnd)
    this.controls.stopListenToKeyEvents()
    this.controls.dispose()
    this.clearDataLayers()
    this.disposeHierarchy(this.scene)
    this.renderer.dispose()
  }

  resetView(): void {
    this.flyState = null
    this.camera.position.copy(this.homeCameraPosition)
    this.camera.up.copy(GLOBAL_NORTH)
    this.controls.target.copy(this.homeTarget)
    this.controls.update()
    this.notifyViewSettled()
  }

  clearSelection(): void {
    this.setSelection(null)
  }

  setSelection(point: GeodeticPoint | null): void {
    if (!point) {
      this.selectedGeodetic = null
      this.selectionMarker.visible = false
      this.callbacks.onSelection?.(null)
      return
    }

    const surface = geodeticToEcef({ ...point, heightM: 0 })
    this.selectedGeodetic = { ...point, heightM: 0 }
    this.selectionMarker.position.set(surface.x, surface.y, surface.z)
    this.selectionMarker.visible = true
    this.callbacks.onSelection?.({ ...this.selectedGeodetic })
  }

  getSelection(): GeodeticPoint | null {
    return this.selectedGeodetic ? { ...this.selectedGeodetic } : null
  }

  focusOnSelection(): boolean {
    if (!this.selectedGeodetic) return false

    const cameraGeo = ecefToGeodetic({
      x: this.camera.position.x,
      y: this.camera.position.y,
      z: this.camera.position.z
    })
    const destinationAltitude = clamp(cameraGeo.heightM * 0.32, 150_000, 2_500_000)
    this.flyToGeodetic(this.selectedGeodetic, destinationAltitude)
    return true
  }

  goToGeodetic(point: GeodeticPoint, altitudeM = 450_000): void {
    this.setSelection(point)
    this.flyToGeodetic(point, clamp(altitudeM, 25, 5_000_000))
  }

  orientNorthUp(): void {
    const origin = this.selectedGeodetic ?? this.getTargetGeodetic() ?? (() => {
      const geo = ecefToGeodetic({
        x: this.camera.position.x,
        y: this.camera.position.y,
        z: this.camera.position.z
      })
      return { ...geo, heightM: 0 }
    })()

    const surface = geodeticToEcef({ ...origin, heightM: 0 })
    const basis = localBasisAtGeodetic(origin)
    const target = new THREE.Vector3(surface.x, surface.y, surface.z)
    const distance = Math.max(25, this.camera.position.distanceTo(this.controls.target))
    const up = new THREE.Vector3(basis.up.x, basis.up.y, basis.up.z)
    const north = new THREE.Vector3(basis.north.x, basis.north.y, basis.north.z)

    this.flyState = null
    this.camera.position.copy(target).addScaledVector(up, distance)
    this.camera.up.copy(north)
    this.controls.target.copy(target)
    this.controls.update()
    this.notifyViewSettled()
  }

  getCameraBookmark(): CameraBookmark {
    return {
      version: BOOKMARK_VERSION,
      camera: [this.camera.position.x, this.camera.position.y, this.camera.position.z],
      target: [this.controls.target.x, this.controls.target.y, this.controls.target.z],
      up: [this.camera.up.x, this.camera.up.y, this.camera.up.z],
      qualityTier: this.qualityTier
    }
  }

  restoreCameraBookmark(bookmark: CameraBookmark): boolean {
    if (bookmark.version !== BOOKMARK_VERSION || !isQualityTier(bookmark.qualityTier)) return false
    if (bookmark.camera.length !== 3 || bookmark.target.length !== 3) return false
    if (![...bookmark.camera, ...bookmark.target].every(Number.isFinite)) return false
    if (bookmark.up && (bookmark.up.length !== 3 || !bookmark.up.every(Number.isFinite))) return false

    this.flyState = null
    this.setQualityTier(bookmark.qualityTier)
    this.camera.position.fromArray(bookmark.camera)
    this.controls.target.fromArray(bookmark.target)
    this.camera.up.fromArray(bookmark.up ?? [0, 0, 1]).normalize()
    this.controls.update()
    return true
  }

  setQualityTier(tier: QualityTier): void {
    if (tier === this.qualityTier) {
      this.applyPixelRatio()
      return
    }

    this.qualityTier = tier
    this.applyPixelRatio()
    this.rebuildEarth()
    this.resize()
    this.callbacks.onStatus?.('ready', `Quality set to ${tier}.`)
  }

  getQualityTier(): QualityTier {
    return this.qualityTier
  }

  refreshDisplayScale(): void {
    this.applyPixelRatio()
    this.resize()
  }

  setDataLayer(id: string, layer: GlobeDataLayer): void {
    if (!id.trim()) throw new Error('Data layer id is required.')
    this.removeDataLayer(id)
    this.dataLayers.set(id, layer)
    this.scene.add(layer.object3d)
  }

  removeDataLayer(id: string): boolean {
    const layer = this.dataLayers.get(id)
    if (!layer) return false
    this.scene.remove(layer.object3d)
    layer.dispose()
    this.dataLayers.delete(id)
    return true
  }

  clearDataLayers(): void {
    for (const id of [...this.dataLayers.keys()]) this.removeDataLayer(id)
  }

  dataLayerIds(): string[] {
    return [...this.dataLayers.keys()].sort()
  }

  getDiagnostics(): GlobeDiagnostics {
    const gl = this.renderer.getContext()
    const webglVersion: 1 | 2 = typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext ? 2 : 1
    return {
      qualityTier: this.qualityTier,
      camera: this.getCameraBookmark(),
      selection: this.getSelection(),
      contextLost: this.contextLost,
      dataLayers: this.dataLayerIds(),
      canvas: {
        width: this.renderer.domElement.width,
        height: this.renderer.domElement.height,
        pixelRatio: this.renderer.getPixelRatio()
      },
      renderer: {
        webglVersion,
        maxTextureSize: Number(gl.getParameter(gl.MAX_TEXTURE_SIZE)),
        maxRenderbufferSize: Number(gl.getParameter(gl.MAX_RENDERBUFFER_SIZE)),
        maxTextureImageUnits: Number(gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS)),
        drawCalls: this.renderer.info.render.calls,
        triangles: this.renderer.info.render.triangles,
        geometries: this.renderer.info.memory.geometries,
        textures: this.renderer.info.memory.textures
      }
    }
  }

  private buildEarth(): void {
    const profile = QUALITY_PROFILES[this.qualityTier]
    this.earth = new THREE.Group()

    const globeGeometry = new THREE.SphereGeometry(
      EARTH_A,
      profile.globeWidthSegments,
      profile.globeHeightSegments
    )
    globeGeometry.scale(1, 1, EARTH_B / EARTH_A)
    const globeMaterial = new THREE.MeshStandardMaterial({
      color: 0x173e57,
      roughness: 0.84,
      metalness: 0.02
    })
    this.earth.add(new THREE.Mesh(globeGeometry, globeMaterial))

    const atmosphereGeometry = new THREE.SphereGeometry(
      EARTH_A * 1.016,
      profile.atmosphereWidthSegments,
      profile.atmosphereHeightSegments
    )
    atmosphereGeometry.scale(1, 1, EARTH_B / EARTH_A)
    const atmosphereMaterial = new THREE.MeshBasicMaterial({
      color: 0x5ba3cc,
      transparent: true,
      opacity: 0.055,
      side: THREE.BackSide,
      depthWrite: false
    })
    this.earth.add(new THREE.Mesh(atmosphereGeometry, atmosphereMaterial))
    this.earth.add(this.makeGrid())
    this.scene.add(this.earth)
  }

  private rebuildEarth(): void {
    this.scene.remove(this.earth)
    this.disposeHierarchy(this.earth)
    this.buildEarth()
  }

  private makeGrid(): THREE.Group {
    const profile = QUALITY_PROFILES[this.qualityTier]
    const group = new THREE.Group()
    const material = new THREE.LineBasicMaterial({
      color: 0x87a6b6,
      transparent: true,
      opacity: profile.gridOpacity
    })

    for (let lat = -90 + profile.gridStepDeg; lat < 90; lat += profile.gridStepDeg) {
      const points: THREE.Vector3[] = []
      const latRad = THREE.MathUtils.degToRad(lat)
      const radius = EARTH_A * Math.cos(latRad)
      const z = EARTH_B * Math.sin(latRad)
      for (let lon = 0; lon <= 360; lon += profile.gridSampleDeg) {
        const lonRad = THREE.MathUtils.degToRad(lon)
        points.push(new THREE.Vector3(
          radius * Math.cos(lonRad),
          radius * Math.sin(lonRad),
          z
        ))
      }
      group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), material))
    }

    for (let lon = 0; lon < 360; lon += profile.gridStepDeg) {
      const points: THREE.Vector3[] = []
      const lonRad = THREE.MathUtils.degToRad(lon)
      for (let lat = -90; lat <= 90; lat += profile.gridSampleDeg) {
        const latRad = THREE.MathUtils.degToRad(lat)
        points.push(new THREE.Vector3(
          EARTH_A * Math.cos(latRad) * Math.cos(lonRad),
          EARTH_A * Math.cos(latRad) * Math.sin(lonRad),
          EARTH_B * Math.sin(latRad)
        ))
      }
      group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), material))
    }

    return group
  }

  private applyPixelRatio(): void {
    const profile = QUALITY_PROFILES[this.qualityTier]
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, profile.maxDpr))
  }

  private readonly frame = (nowMs: number): void => {
    if (!this.started || this.disposed || this.contextLost || document.hidden) return

    const deltaMs = clamp(nowMs - this.lastFrameAtMs, 0, 100)
    const deltaSeconds = deltaMs / 1000
    this.lastFrameAtMs = nowMs

    const flyFinished = this.updateFly(nowMs)
    this.updateControlBounds()
    this.controls.update(deltaSeconds)
    this.enforceCameraAboveSurface()
    this.updateCameraClipping()
    this.updateTelemetry(nowMs)
    this.renderer.render(this.scene, this.camera)
    this.updatePerformance(nowMs, deltaMs)
    this.updateScale(nowMs)

    if (flyFinished) this.notifyViewSettled()
  }

  private updateControlBounds(): void {
    const targetRadius = this.controls.target.length()
    this.controls.minDistance = targetRadius > EARTH_A * 0.25
      ? 25
      : EARTH_A * 1.003

    if (targetRadius < EARTH_A * 0.25 && this.camera.up.distanceToSquared(GLOBAL_NORTH) > 1e-8) {
      this.camera.up.copy(GLOBAL_NORTH)
    }
  }

  private enforceCameraAboveSurface(): void {
    const geo = ecefToGeodetic({
      x: this.camera.position.x,
      y: this.camera.position.y,
      z: this.camera.position.z
    })
    if (geo.heightM >= 25) return

    const safe = geodeticToEcef({ ...geo, heightM: 25 })
    this.camera.position.set(safe.x, safe.y, safe.z)
  }

  private updateCameraClipping(): void {
    const geo = ecefToGeodetic({
      x: this.camera.position.x,
      y: this.camera.position.y,
      z: this.camera.position.z
    })
    const altitude = Math.max(25, geo.heightM)
    const near = clamp(altitude * 0.00025, 0.5, 20_000)
    const far = Math.max(EARTH_A * 4, this.camera.position.length() + EARTH_A * 2.5)
    const nearChanged = Math.abs(near - this.lastClipNear) / Math.max(1, this.lastClipNear) > 0.08
    const farChanged = Math.abs(far - this.lastClipFar) / Math.max(1, this.lastClipFar) > 0.08
    if (!nearChanged && !farChanged) return

    this.camera.near = near
    this.camera.far = far
    this.camera.updateProjectionMatrix()
    this.lastClipNear = near
    this.lastClipFar = far
  }

  private updateTelemetry(nowMs: number): void {
    if (nowMs - this.lastTelemetryAtMs < 100) return
    this.lastTelemetryAtMs = nowMs

    const position = this.camera.position
    const geo = ecefToGeodetic({ x: position.x, y: position.y, z: position.z })
    const targetGeo = this.getTargetGeodetic()
    const targetDistanceM = this.camera.position.distanceTo(this.controls.target)
    let azimuthDeg: number | null = null
    let tiltDeg: number | null = null

    if (targetGeo) {
      const local = ecefToEnu(
        { x: position.x, y: position.y, z: position.z },
        { ...targetGeo, heightM: 0 }
      )
      const horizontal = Math.hypot(local.eastM, local.northM)
      azimuthDeg = normalizeDegrees(Math.atan2(local.eastM, local.northM) * 180 / Math.PI)
      tiltDeg = Math.atan2(horizontal, Math.max(0.000001, local.upM)) * 180 / Math.PI
    }

    this.callbacks.onTelemetry?.({
      latitudeDeg: geo.latitudeDeg,
      longitudeDeg: geo.longitudeDeg,
      altitudeM: Math.max(0, geo.heightM),
      azimuthDeg,
      tiltDeg,
      targetDistanceM
    })
  }

  private updatePerformance(nowMs: number, deltaMs: number): void {
    this.accumulatedFrameMs += deltaMs
    this.accumulatedFrames += 1
    const elapsed = nowMs - this.performanceWindowStartedAtMs
    if (elapsed < 750 || this.accumulatedFrames === 0) return

    this.callbacks.onPerformance?.({
      fps: (this.accumulatedFrames * 1000) / elapsed,
      frameMs: this.accumulatedFrameMs / this.accumulatedFrames,
      drawCalls: this.renderer.info.render.calls,
      triangles: this.renderer.info.render.triangles,
      geometries: this.renderer.info.memory.geometries,
      textures: this.renderer.info.memory.textures,
      qualityTier: this.qualityTier
    })

    this.performanceWindowStartedAtMs = nowMs
    this.accumulatedFrameMs = 0
    this.accumulatedFrames = 0
  }

  private updateScale(nowMs: number): void {
    if (nowMs - this.lastScaleAtMs < 250) return
    this.lastScaleAtMs = nowMs
    const height = this.renderer.domElement.clientHeight
    if (height <= 0) {
      this.callbacks.onScale?.(null)
      return
    }

    const distance = Math.max(1, this.camera.position.distanceTo(this.controls.target))
    const visibleHeight = 2 * distance * Math.tan(THREE.MathUtils.degToRad(this.camera.fov) / 2)
    this.callbacks.onScale?.(chooseScaleBar(visibleHeight / height))
  }

  private getTargetGeodetic(): GeodeticPoint | null {
    const radius = this.controls.target.length()
    if (radius < EARTH_A * 0.5) return null
    try {
      const geo = ecefToGeodetic({
        x: this.controls.target.x,
        y: this.controls.target.y,
        z: this.controls.target.z
      })
      return { ...geo, heightM: 0 }
    } catch {
      return null
    }
  }

  private pick(clientX: number, clientY: number): PickResult | null {
    const rect = this.renderer.domElement.getBoundingClientRect()
    if (rect.width <= 0 || rect.height <= 0) return null

    this.pointer.set(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1
    )
    this.raycaster.setFromCamera(this.pointer, this.camera)
    const hit = intersectWgs84Ellipsoid(
      {
        x: this.raycaster.ray.origin.x,
        y: this.raycaster.ray.origin.y,
        z: this.raycaster.ray.origin.z
      },
      {
        x: this.raycaster.ray.direction.x,
        y: this.raycaster.ray.direction.y,
        z: this.raycaster.ray.direction.z
      }
    )
    if (!hit) return null

    const point = new THREE.Vector3(hit.x, hit.y, hit.z)
    const geo = ecefToGeodetic(hit)
    return {
      point,
      geodetic: {
        latitudeDeg: geo.latitudeDeg,
        longitudeDeg: geo.longitudeDeg,
        heightM: 0
      }
    }
  }

  private selectAt(clientX: number, clientY: number): PickResult | null {
    const result = this.pick(clientX, clientY)
    if (!result) return null
    this.setSelection(result.geodetic)
    return result
  }

  private flyToGeodetic(target: GeodeticPoint, altitudeM: number): void {
    const surface = geodeticToEcef({ ...target, heightM: 0 })
    const camera = geodeticToEcef({ ...target, heightM: altitudeM })
    const toTarget = new THREE.Vector3(surface.x, surface.y, surface.z)
    const toCamera = new THREE.Vector3(camera.x, camera.y, camera.z)
    const basis = localBasisAtGeodetic(target)
    const toUp = new THREE.Vector3(basis.north.x, basis.north.y, basis.north.z)

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.camera.position.copy(toCamera)
      this.camera.up.copy(toUp)
      this.controls.target.copy(toTarget)
      this.controls.update()
      this.notifyViewSettled()
      return
    }

    this.flyState = {
      startedAtMs: performance.now(),
      durationMs: 950,
      fromCamera: this.camera.position.clone(),
      toCamera,
      fromTarget: this.controls.target.clone(),
      toTarget,
      fromUp: this.camera.up.clone(),
      toUp
    }
  }

  private updateFly(nowMs: number): boolean {
    if (!this.flyState) return false
    const progress = clamp((nowMs - this.flyState.startedAtMs) / this.flyState.durationMs, 0, 1)
    const eased = easeInOutCubic(progress)
    this.camera.position.lerpVectors(this.flyState.fromCamera, this.flyState.toCamera, eased)
    this.controls.target.lerpVectors(this.flyState.fromTarget, this.flyState.toTarget, eased)
    this.camera.up.lerpVectors(this.flyState.fromUp, this.flyState.toUp, eased).normalize()

    if (progress < 1) return false
    this.flyState = null
    return true
  }

  private disposeHierarchy(root: THREE.Object3D): void {
    const geometries = new Set<THREE.BufferGeometry>()
    const materials = new Set<THREE.Material>()

    root.traverse((object) => {
      if (object instanceof THREE.Mesh || object instanceof THREE.Line || object instanceof THREE.Points) {
        geometries.add(object.geometry)
        const material = object.material
        if (Array.isArray(material)) material.forEach((item) => materials.add(item))
        else materials.add(material)
      }
    })

    geometries.forEach((geometry) => geometry.dispose())
    materials.forEach((material) => material.dispose())
  }

  private notifyViewSettled(): void {
    this.callbacks.onViewSettled?.(this.getCameraBookmark())
  }

  private readonly resize = (): void => {
    const { clientWidth, clientHeight } = this.renderer.domElement
    const width = Math.max(1, clientWidth)
    const height = Math.max(1, clientHeight)
    this.applyPixelRatio()
    this.renderer.setSize(width, height, false)
    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
  }

  private readonly onPointerDown = (event: PointerEvent): void => {
    if (event.button !== 0) return
    this.pointerDown = { pointerId: event.pointerId, x: event.clientX, y: event.clientY }
    this.renderer.domElement.setPointerCapture?.(event.pointerId)
    this.renderer.domElement.focus({ preventScroll: true })
  }

  private readonly onPointerUp = (event: PointerEvent): void => {
    if (!this.pointerDown || event.pointerId !== this.pointerDown.pointerId) return
    const distance = Math.hypot(event.clientX - this.pointerDown.x, event.clientY - this.pointerDown.y)
    const pointerId = this.pointerDown.pointerId
    this.pointerDown = null
    if (this.renderer.domElement.hasPointerCapture?.(pointerId)) {
      this.renderer.domElement.releasePointerCapture(pointerId)
    }
    if (distance <= 6) this.selectAt(event.clientX, event.clientY)
  }

  private readonly onPointerCancel = (event: PointerEvent): void => {
    if (this.pointerDown?.pointerId !== event.pointerId) return
    this.pointerDown = null
    if (this.renderer.domElement.hasPointerCapture?.(event.pointerId)) {
      this.renderer.domElement.releasePointerCapture(event.pointerId)
    }
  }

  private readonly onDoubleClick = (event: MouseEvent): void => {
    event.preventDefault()
    const picked = this.selectAt(event.clientX, event.clientY)
    if (picked) this.focusOnSelection()
  }

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Home') {
      event.preventDefault()
      this.resetView()
      return
    }

    if (event.key === 'Escape') {
      event.preventDefault()
      this.clearSelection()
      return
    }

    if (event.key === 'Enter' && this.selectedGeodetic) {
      event.preventDefault()
      this.focusOnSelection()
      return
    }

    if (event.key.toLowerCase() === 'n') {
      event.preventDefault()
      this.orientNorthUp()
      return
    }

    if (event.key === '+' || event.key === '=') {
      event.preventDefault()
      this.controls.dollyIn(1.18)
      this.controls.update()
      return
    }

    if (event.key === '-' || event.key === '_') {
      event.preventDefault()
      this.controls.dollyOut(1.18)
      this.controls.update()
    }
  }

  private readonly onControlsEnd = (): void => {
    if (!this.flyState) this.notifyViewSettled()
  }

  private readonly onVisibilityChange = (): void => {
    if (document.hidden) {
      this.callbacks.onStatus?.('suspended', 'Rendering paused while the page is hidden.')
      return
    }

    this.lastFrameAtMs = performance.now()
    this.performanceWindowStartedAtMs = this.lastFrameAtMs
    this.accumulatedFrameMs = 0
    this.accumulatedFrames = 0
    this.callbacks.onStatus?.('ready', 'Globe ready. Rendering resumed.')
  }

  private readonly onContextLost = (event: Event): void => {
    event.preventDefault()
    this.contextLost = true
    document.body.dataset.webgl = 'lost'
    this.callbacks.onStatus?.('context-lost', 'WebGL context lost. Waiting for the browser to restore it.')
  }

  private readonly onContextRestored = (): void => {
    this.contextLost = false
    delete document.body.dataset.webgl
    this.applyPixelRatio()
    this.resize()
    this.lastFrameAtMs = performance.now()
    this.performanceWindowStartedAtMs = this.lastFrameAtMs
    this.accumulatedFrameMs = 0
    this.accumulatedFrames = 0
    this.callbacks.onStatus?.('ready', 'WebGL context restored.')
  }
}
