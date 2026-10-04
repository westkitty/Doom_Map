import type { HazardCategory, HazardManifest } from './manifest'
import { validateHazardManifest } from './manifest'

export class HazardRegistry {
  private readonly byId = new Map<string, HazardManifest>()

  constructor(manifests: readonly HazardManifest[] = []) {
    for (const manifest of manifests) this.register(manifest)
  }

  register(manifest: HazardManifest): void {
    const issues = validateHazardManifest(manifest)
    if (issues.length > 0) throw new Error(`Invalid hazard ${manifest.id || '<unknown>'}: ${issues.join('; ')}`)
    if (this.byId.has(manifest.id)) throw new Error(`Duplicate hazard id: ${manifest.id}`)
    this.byId.set(manifest.id, manifest)
  }

  get(id: string): HazardManifest | null { return this.byId.get(id) ?? null }
  has(id: string): boolean { return this.byId.has(id) }
  size(): number { return this.byId.size }
  list(): HazardManifest[] { return [...this.byId.values()] }
  listByCategory(category: HazardCategory): HazardManifest[] { return this.list().filter((manifest) => manifest.category === category) }
  flagship(): HazardManifest[] { return this.list().filter((manifest) => manifest.flagship === true) }
}
