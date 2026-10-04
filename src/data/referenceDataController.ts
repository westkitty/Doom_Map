import { ProviderFailoverChain } from './providerChain'
import { createStaticReferenceProvider, type GeoJsonFeatureCollection } from './staticGeoJsonProvider'
import type { FetchLike } from './httpJsonProvider'
import { GeoTileStore } from './tileStore'
import { ViewEpochController } from './viewEpoch'
import { GeoJsonPointLayer } from '../globe/geoJsonPointLayer'
import type { ResourceBudget } from './resourceBudget'

export interface ReferenceDataDiagnostics {
  epoch: number
  attribution: string
  store: ReturnType<GeoTileStore<GeoJsonFeatureCollection>['stats']>
}

export class ReferenceDataController {
  private readonly epoch = new ViewEpochController()
  private readonly store: GeoTileStore<GeoJsonFeatureCollection>

  constructor(baseUrl: string, budget: ResourceBudget, fetchImpl?: FetchLike) {
    const provider = createStaticReferenceProvider(baseUrl, fetchImpl)
    this.store = new GeoTileStore(
      new ProviderFailoverChain([provider]),
      Math.min(budget.maxResidentBytes, 8 * 1024 * 1024),
      Math.max(1, Math.min(budget.maxConcurrentRequests, 4)),
      { maxAgeMs: 60 * 60_000, staleWhileRevalidateMs: 24 * 60 * 60_000 }
    )
  }

  async load(): Promise<GeoJsonPointLayer> {
    const generation = this.epoch.begin()
    const shared = this.store.acquire({ z: 0, x: 0, y: 0 }, 1_000_000, generation)
    const untrack = this.epoch.track(generation, shared.release)
    try {
      const payload = await shared.promise
      if (!this.epoch.isCurrent(generation)) throw new DOMException('Reference data load became stale.', 'AbortError')
      return new GeoJsonPointLayer(payload.data, { sizePx: 7, opacity: 0.82 })
    } finally {
      untrack()
      shared.release()
    }
  }

  diagnostics(): ReferenceDataDiagnostics {
    return {
      epoch: this.epoch.current(),
      attribution: this.store.attributionText(),
      store: this.store.stats()
    }
  }

  dispose(): void {
    this.epoch.cancelCurrent()
  }
}
