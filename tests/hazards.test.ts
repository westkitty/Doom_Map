import { describe, expect, it, beforeAll } from 'vitest'
import { globalHazardRegistry } from '../src/hazards/registry'
import { initHazardRegistry } from '../src/hazards/catalog'

beforeAll(() => {
  initHazardRegistry()
})

describe('Hazard Registry & Catalog', () => {
  it('registers all 100 distinct runnable disaster modules from catalog', () => {
    expect(globalHazardRegistry.count()).toBe(100)
  })

  it('covers all 8 disaster categories', () => {
    const categories = ['explosive_impact', 'seismic', 'ocean_coastal', 'volcanic', 'atmospheric', 'hydrological_wildfire', 'infrastructure_industrial', 'space_compound'] as const
    for (const cat of categories) {
      const list = globalHazardRegistry.listByCategory(cat)
      expect(list.length).toBeGreaterThan(0)
    }
  })

  it('validates Glasstone & Dolan nuclear airburst physics scaling', () => {
    const nuclear = globalHazardRegistry.get('nuclear_airburst')!
    expect(nuclear).toBeDefined()
    expect(nuclear.provenance.fidelity).toBe('A')

    const origin = { latitudeDeg: 40.7128, longitudeDeg: -74.0060, heightM: 0 }
    const state = nuclear.evaluate(origin, { yieldKt: 1000 }, 5000, 42)
    expect(state.peakIntensity).toBe(20)
    expect(state.footprint.bands).toHaveLength(4)
    // 20 psi radius for 1000 kt should be ~6.5 km (6500 m)
    const band20 = state.footprint.bands.find(b => b.intensity === 20)!
    expect(band20.radiusM).toBeCloseTo(6500, -2)

    const sample = nuclear.sample(origin, { latitudeDeg: 40.75, longitudeDeg: -74.0060, heightM: 0 }, { yieldKt: 1000 }, 5000)
    expect(sample.intensity).toBeGreaterThan(0)
    expect(sample.unit).toBe('psi')
  })

  it('validates Collins et al. asteroid impact crater scaling', () => {
    const asteroid = globalHazardRegistry.get('asteroid_land_impact')!
    expect(asteroid.provenance.fidelity).toBe('A')

    const origin = { latitudeDeg: 35.0, longitudeDeg: 140.0, heightM: 0 }
    const state = asteroid.evaluate(origin, { diameterM: 500, velocityKms: 20 }, 1000, 42)
    expect(state.peakIntensity).toBeGreaterThan(100) // MT
    expect(state.footprint.bands[0]!.severity).toBe('extreme')
  })

  it('validates Boore-Atkinson earthquake GMPE attenuation', () => {
    const eq = globalHazardRegistry.get('earthquake_point_source')!
    expect(eq.provenance.fidelity).toBe('A')

    const origin = { latitudeDeg: 37.7749, longitudeDeg: -122.4194, heightM: 0 }
    const state = eq.evaluate(origin, { magnitudeMw: 7.5, depthKm: 10 }, 2000, 42)
    expect(state.footprint.radiusM).toBeGreaterThan(50000)

    const near = eq.sample(origin, { latitudeDeg: 37.78, longitudeDeg: -122.4194, heightM: 0 }, { magnitudeMw: 7.5, depthKm: 10 }, 2000)
    const far = eq.sample(origin, { latitudeDeg: 38.50, longitudeDeg: -122.4194, heightM: 0 }, { magnitudeMw: 7.5, depthKm: 10 }, 2000)
    expect(near.intensity).toBeGreaterThan(far.intensity)
  })

  it('every registered module provides valid parameters, evaluation, and samples', () => {
    const modules = globalHazardRegistry.list()
    const testOrigin = { latitudeDeg: 0, longitudeDeg: 0, heightM: 0 }
    const testTarget = { latitudeDeg: 0.1, longitudeDeg: 0.1, heightM: 0 }

    for (const mod of modules) {
      const validParams = mod.validateParameters({})
      const state = mod.evaluate(testOrigin, validParams, 1000, 123)
      expect(state.footprint).toBeDefined()
      expect(state.footprint.bands.length).toBeGreaterThan(0)
      expect(state.emissions.length).toBeGreaterThan(0)

      const sample = mod.sample(testOrigin, testTarget, validParams, 1000)
      expect(Number.isFinite(sample.intensity)).toBe(true)
      expect(sample.unit.length).toBeGreaterThan(0)
    }
  })
})
