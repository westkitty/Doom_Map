import type { HazardModule, HazardCategory } from './types'

export class HazardRegistry {
  private readonly modules = new Map<string, HazardModule>()

  register(module: HazardModule): void {
    if (this.modules.has(module.id)) {
      return
    }
    this.modules.set(module.id, module)
  }

  clear(): void {
    this.modules.clear()
  }

  get(id: string): HazardModule | undefined {
    return this.modules.get(id)
  }

  list(): HazardModule[] {
    return [...this.modules.values()]
  }

  listByCategory(category: HazardCategory): HazardModule[] {
    return this.list().filter(m => m.category === category)
  }

  count(): number {
    return this.modules.size
  }
}

export const globalHazardRegistry = new HazardRegistry()
