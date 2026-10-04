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


import type { HazardModule as RuntimeHazardModule, HazardCategory as RuntimeHazardCategory } from './types'

class RuntimeHazardRegistryCompat {
  private readonly modules = new Map<string, RuntimeHazardModule>()

  register(module: RuntimeHazardModule): void {
    if (!this.modules.has(module.id)) this.modules.set(module.id, module)
  }

  clear(): void { this.modules.clear() }
  get(id: string): RuntimeHazardModule | undefined { return this.modules.get(id) }
  list(): RuntimeHazardModule[] { return [...this.modules.values()] }
  listByCategory(category: RuntimeHazardCategory): RuntimeHazardModule[] {
    return this.list().filter((module) => module.category === category)
  }
  count(): number { return this.modules.size }
}

export const globalHazardRegistry = new RuntimeHazardRegistryCompat()
