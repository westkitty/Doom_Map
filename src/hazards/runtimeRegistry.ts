import type { HazardModule } from './module'
import { validateHazardManifest } from './manifest'

export class HazardRuntimeRegistry {
  private readonly modules = new Map<string, HazardModule>()

  register(module: HazardModule): void {
    const issues = validateHazardManifest(module.manifest)
    if (issues.length > 0) throw new Error(`Invalid runtime hazard ${module.manifest.id}: ${issues.join('; ')}`)
    if (!module.modelVersion.trim()) throw new Error('Hazard model version is required.')
    if (module.manifest.implementationState === 'catalogued') throw new Error('Runtime modules cannot remain catalogued-only.')
    if (this.modules.has(module.manifest.id)) throw new Error(`Duplicate runtime hazard: ${module.manifest.id}`)
    this.modules.set(module.manifest.id, module)
  }

  get(id: string): HazardModule | null { return this.modules.get(id) ?? null }
  has(id: string): boolean { return this.modules.has(id) }
  list(): HazardModule[] { return [...this.modules.values()] }
}
