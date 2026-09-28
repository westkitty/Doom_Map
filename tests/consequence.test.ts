import { describe, expect, it } from 'vitest'
import { LifelineGraph } from '../src/consequence/LifelineGraph'
import { ConsequenceEngine } from '../src/consequence/ConsequenceEngine'
import { NuclearAirburstSolver } from '../src/hazards/solvers/NuclearAirburstSolver'

describe('Lifeline Graph & Cascading Failure', () => {
  it('initializes fully operational lifeline infrastructure', () => {
    const graph = new LifelineGraph()
    const summary = graph.summary()
    expect(summary.overallOperability).toBe(1.0)
    expect(summary.failedCount).toBe(0)
  })

  it('propagates power outage failure to dependent water and healthcare nodes', () => {
    const graph = new LifelineGraph()
    graph.applyDamage({ grid_substation: 1.0 }) // 100% direct damage to power grid
    const summary = graph.summary()
    expect(summary.details.power).toBe(0)
    expect(summary.details.water).toBe(0) // Water requires power
    expect(summary.details.healthcare).toBeLessThan(0.3) // Hospital reduced to emergency backup generator
    expect(summary.failedCount).toBeGreaterThan(1)
  })
})

describe('Consequence Engine', () => {
  it('computes exposure, HAZUS damage states, and economic loss from hazard state', () => {
    const solver = new NuclearAirburstSolver()
    const origin = { latitudeDeg: 40.7128, longitudeDeg: -74.0060, heightM: 0 }
    const state = solver.evaluate(origin, { yieldKt: 500 }, 5000, 42)

    const engine = new ConsequenceEngine()
    const report = engine.evaluate(state, 'nuclear_airburst', 5000)

    expect(report.exposedPopulation).toBeGreaterThan(10000)
    expect(report.totalFootprintAreaKm2).toBeGreaterThan(100)
    expect(report.economicLossMillionUsd).toBeGreaterThan(100)
    expect(report.structuralDamage.completePct + report.structuralDamage.extensivePct).toBeGreaterThan(0)
  })
})
