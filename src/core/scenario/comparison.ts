import type { ScenarioDefinition } from './types'
import { ConsequenceEngine, type ConsequenceReport } from '../../consequence/ConsequenceEngine'
import { globalHazardRegistry } from '../../hazards/registry'

export interface ScenarioComparison {
  scenarioA: ScenarioDefinition
  scenarioB: ScenarioDefinition
  reportA: ConsequenceReport
  reportB: ConsequenceReport
  deltas: {
    exposedPopulationDelta: number
    economicLossDeltaM: number
    lifelineOperabilityDelta: number
    summary: string
  }
}

export function compareScenarios(a: ScenarioDefinition, b: ScenarioDefinition, timeOffsetMs = 0): ScenarioComparison {
  const engine = new ConsequenceEngine()
  const modA = globalHazardRegistry.get(a.hazardType)
  const modB = globalHazardRegistry.get(b.hazardType)

  const stateA = modA ? modA.evaluate(a.origin, a.parameters, timeOffsetMs, a.seed) : null
  const stateB = modB ? modB.evaluate(b.origin, b.parameters, timeOffsetMs, b.seed) : null

  const reportA = stateA ? engine.evaluate(stateA, a.hazardType, timeOffsetMs) : createEmptyReport(a.hazardType)
  const reportB = stateB ? engine.evaluate(stateB, b.hazardType, timeOffsetMs) : createEmptyReport(b.hazardType)

  const popDiff = reportB.exposedPopulation - reportA.exposedPopulation
  const lossDiff = reportB.economicLossMillionUsd - reportA.economicLossMillionUsd
  const lifelineDiff = reportB.lifelineOperability - reportA.lifelineOperability

  const summary = popDiff > 0
    ? `Scenario B exposes ${popDiff.toLocaleString()} more people with $${lossDiff.toLocaleString()}M additional capital loss.`
    : `Scenario B reduces exposed population by ${Math.abs(popDiff).toLocaleString()} and loss by $${Math.abs(lossDiff).toLocaleString()}M.`

  return {
    scenarioA: a,
    scenarioB: b,
    reportA,
    reportB,
    deltas: {
      exposedPopulationDelta: popDiff,
      economicLossDeltaM: lossDiff,
      lifelineOperabilityDelta: lifelineDiff,
      summary
    }
  }
}

export function forkScenario(base: ScenarioDefinition, newName: string, paramOverrides: Record<string, number | string | boolean>): ScenarioDefinition {
  return {
    ...base,
    id: `${base.id}-fork-${Date.now().toString(36)}`,
    name: newName,
    description: `Forked from "${base.name}" with modified parameters.`,
    createdAt: new Date().toISOString(),
    parameters: {
      ...base.parameters,
      ...paramOverrides
    }
  }
}

function createEmptyReport(hazardId: string): ConsequenceReport {
  return {
    timestampMs: 0,
    hazardId,
    peakIntensity: 0,
    totalFootprintAreaKm2: 0,
    exposedPopulation: 0,
    structuralDamage: { nonePct: 100, slightPct: 0, moderatePct: 0, extensivePct: 0, completePct: 0 },
    economicLossMillionUsd: 0,
    lifelineOperability: 100,
    lifelineDetails: { power: 1, water: 1, telecom: 1, transport: 1, healthcare: 1 },
    recoveryProgressPct: 100,
    summary: 'No active consequences.'
  }
}
