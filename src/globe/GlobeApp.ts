import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { WGS84, ecefToGeodetic } from '../core/coordinates'

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
  private readonly onTelemetry: (value: GlobeTelemetry) => void
  private animationFrame = 0

  constructor(canvas: HTMLCanvasElement, onTelemetry: (value: GlobeTelemetry) => void) {
    this.onTelemetry = onTelemetry
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    this.renderer.outputColorSpace = THREE.SRGBColorSpace

    this.camera.position.set(EARTH_A * 2.35, EARTH_A * 0.65, EARTH_A * 1.65)

    this.controls = new OrbitControls(this.camera, canvas)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.055
    this.controls.enablePan = true
    this.controls.screenSpacePanning = false
    this.controls.minDistance = EARTH_A * 1.01
    this.controls.maxDistance = EARTH_A * 9
    this.controls.zoomSpeed = 0.75
    this.controls.rotateSpeed = 0.5
    this.controls.panSpeed = 0.35

    this.scene.add(new THREE.AmbientLight(0x6c8391, 0.55))
    const sun = new THREE.DirectionalLight(0xffffff, 2.6)
    sun.position.set(EARTH_A * 4, EARTH_A * 1.5, EARTH_A * 3)
    this.scene.add(sun)

    this.buildEarth()
    this.scene.add(this.earth)

    this.resize()
    window.addEventListener('resize', this.resize)
    this.renderer.domElement.addEventListener('webglcontextlost', this.onContextLost)
    this.renderer.domElement.addEventListener('webglcontextrestored', this.onContextRestored)
  }

  start(): void {
    const frame = (): void => {
      this.controls.update()
      this.updateTelemetry()
      this.renderer.render(this.scene, this.camera)
      this.animationFrame = requestAnimationFrame(frame)
    }
    frame()
  }

  dispose(): void {
    cancelAnimationFrame(this.animationFrame)
    window.removeEventListener('resize', this.resize)
    this.renderer.domElement.removeEventListener('webglcontextlost', this.onContextLost)
    this.renderer.domElement.removeEventListener('webglcontextrestored', this.onContextRestored)
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
  }

  private buildEarth(): void {
    const globeGeometry = new THREE.SphereGeometry(EARTH_A, 128, 64)
    globeGeometry.scale(1, 1, EARTH_B / EARTH_A)
    const globeMaterial = new THREE.MeshStandardMaterial({
      color: 0x173e57,
      roughness: 0.84,
      metalness: 0.02
    })
    this.earth.add(new THREE.Mesh(globeGeometry, globeMaterial))

    const atmosphereGeometry = new THREE.SphereGeometry(EARTH_A * 1.016, 96, 48)
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
  }

  private makeGrid(): THREE.Group {
    const group = new THREE.Group()
    const material = new THREE.LineBasicMaterial({
      color: 0x87a6b6,
      transparent: true,
      opacity: 0.15
    })

    for (let lat = -75; lat <= 75; lat += 15) {
      const points: THREE.Vector3[] = []
      const latRad = THREE.MathUtils.degToRad(lat)
      const radius = EARTH_A * Math.cos(latRad)
      const z = EARTH_B * Math.sin(latRad)
      for (let lon = 0; lon <= 360; lon += 3) {
        const lonRad = THREE.MathUtils.degToRad(lon)
        points.push(new THREE.Vector3(
          radius * Math.cos(lonRad),
          radius * Math.sin(lonRad),
          z
        ))
      }
      group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), material))
    }

    for (let lon = 0; lon < 360; lon += 15) {
      const points: THREE.Vector3[] = []
      const lonRad = THREE.MathUtils.degToRad(lon)
      for (let lat = -90; lat <= 90; lat += 3) {
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
  }

  private readonly onContextRestored = (): void => {
    delete document.body.dataset.webgl
  }
}
