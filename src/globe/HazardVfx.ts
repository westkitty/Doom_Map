import * as THREE from 'three'
import type { VfxHint } from '../hazards/types'
import { geodeticToEcef, enuFrame } from '../core/coordinates'

export class HazardVfx {
  readonly group = new THREE.Group()
  private readonly meshes: THREE.Object3D[] = []

  update(hints: VfxHint[]): void {
    this.clear()
    if (!hints || hints.length === 0) return

    for (const hint of hints) {
      const anchor = geodeticToEcef({ ...hint.origin, heightM: hint.heightM || 10 })
      const frame = enuFrame(hint.origin)
      const basis = new THREE.Matrix4().makeBasis(
        new THREE.Vector3(frame.east.x, frame.east.y, frame.east.z),
        new THREE.Vector3(frame.north.x, frame.north.y, frame.north.z),
        new THREE.Vector3(frame.up.x, frame.up.y, frame.up.z)
      )

      if (hint.type === 'shockwave' || hint.type === 'wave_ring' || hint.type === 'crater') {
        const outerR = Math.max(10, hint.radiusM)
        const innerR = hint.type === 'crater' ? 0 : outerR * 0.85
        const geom = new THREE.RingGeometry(innerR, outerR, 64)
        const mat = new THREE.MeshBasicMaterial({
          color: hint.colorHex,
          transparent: true,
          opacity: hint.opacity,
          side: THREE.DoubleSide,
          depthWrite: false
        })
        const ring = new THREE.Mesh(geom, mat)
        ring.quaternion.setFromRotationMatrix(basis)
        ring.position.copy(anchor)
        this.group.add(ring)
        this.meshes.push(ring)
      } else if (hint.type === 'fireball') {
        const geom = new THREE.SphereGeometry(Math.max(10, hint.radiusM), 32, 16)
        const mat = new THREE.MeshBasicMaterial({
          color: hint.colorHex,
          transparent: true,
          opacity: hint.opacity,
          depthWrite: false
        })
        const sphere = new THREE.Mesh(geom, mat)
        sphere.position.copy(anchor)
        this.group.add(sphere)
        this.meshes.push(sphere)
      } else if (hint.type === 'plume') {
        const height = hint.heightM || hint.radiusM * 0.5
        const geom = new THREE.CylinderGeometry(hint.radiusM * 0.8, hint.radiusM * 0.2, height, 32, 1, true)
        const mat = new THREE.MeshBasicMaterial({
          color: hint.colorHex,
          transparent: true,
          opacity: hint.opacity * 0.6,
          side: THREE.DoubleSide,
          depthWrite: false
        })
        const cyl = new THREE.Mesh(geom, mat)
        cyl.quaternion.setFromRotationMatrix(basis)
        cyl.position.copy(anchor)
        this.group.add(cyl)
        this.meshes.push(cyl)
      } else if (hint.type === 'vortex' || hint.type === 'fire_front') {
        const r = Math.max(10, hint.radiusM)
        const geom = new THREE.RingGeometry(r * 0.9, r, 64)
        const mat = new THREE.MeshBasicMaterial({
          color: hint.colorHex,
          transparent: true,
          opacity: hint.opacity,
          side: THREE.DoubleSide,
          depthWrite: false
        })
        const mesh = new THREE.Mesh(geom, mat)
        mesh.quaternion.setFromRotationMatrix(basis)
        mesh.position.copy(anchor)
        this.group.add(mesh)
        this.meshes.push(mesh)
      }
    }
  }

  clear(): void {
    while (this.meshes.length > 0) {
      const obj = this.meshes.pop()!
      this.group.remove(obj)
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose()
        if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose())
        else obj.material.dispose()
      }
    }
  }

  dispose(): void {
    this.clear()
  }
}
