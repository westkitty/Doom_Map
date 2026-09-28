import type { HazardState } from '../hazards/types'
import { LifelineGraph, type LifelineType } from './LifelineGraph'

export interface DamageBreakdown {
  nonePct: number
  slightPct: number
  moderatePct: number
  extensivePct: number
  completePct: number
}

export interface ConsequenceReport {
  timestampMs: number
  hazardId: string
  peakIntensity: number
  totalFootprintAreaKm2: number
  exposedPopulation: number
  structuralDamage: DamageBreakdown
  economicLossMillionUsd: number
  lifelineOperability: number
  lifelineDetails: Record<LifelineType, number>
  recoveryProgressPct: number
  summary: string
}

export class ConsequenceEngine {
  private readonly lifelines = new LifelineGraph()

  evaluate(hazardState: HazardState, hazardId: string, timeElapsedMs: number): ConsequenceReport {
    const footprint = hazardState.footprint
    const peakAreaKm2 = Math.PI * (footprint.radiusM / 1000) ** 2

    // Baseline regional population density assumption (~1200 people/km² in urban/suburban zone)
    const basePopDensity = 1200
    const exposedPopulation = Math.round(peakAreaKm2 * basePopDensity)

    // Calculate structural damage distribution from footprint bands
    let extremeArea = 0, severeArea = 0, moderateArea = 0
    for (const band of footprint.bands) {
      const area = Math.PI * (band.radiusM / 1000) ** 2
      if (band.severity === 'extreme') extremeArea = area
      else if (band.severity === 'severe') severeArea = Math.max(0, area - extremeArea)
      else if (band.severity === 'moderate') moderateArea = Math.max(0, area - extremeArea - severeArea)
    }

    const totalArea = Math.max(1, peakAreaKm2)
    const completePct = Math.min(100, (extremeArea / totalArea) * 90)
    const extensivePct = Math.min(100 - completePct, (severeArea / totalArea) * 75)
    const moderatePct = Math.min(100 - completePct - extensivePct, (moderateArea / totalArea) * 55)
    const slightPct = Math.min(100 - completePct - extensivePct - moderatePct, 30)
    const nonePct = Math.max(0, 100 - completePct - extensivePct - moderatePct - slightPct)

    // Apply damage to lifeline graph
    const severeFraction = (completePct + extensivePct) / 100
    this.lifelines.applyDamage({
      grid_substation: severeFraction * 1.0,
      transport_bridge: severeFraction * 0.75,
      water_treatment: severeFraction * 0.85,
      telecom_tower: severeFraction * 0.65,
      regional_hospital: severeFraction * 0.40
    })

    const lifelineSummary = this.lifelines.summary()

    // Capital direct asset replacement: ~$150,000 per damaged structure unit (~0.3 structures/person)
    const damagedUnits = exposedPopulation * 0.3 * (completePct * 1.0 + extensivePct * 0.6 + moderatePct * 0.2) / 100
    const directCapitalLossM = (damagedUnits * 150000) / 1000000
    // Indirect loss factor from lifeline outage duration
    const indirectLossM = directCapitalLossM * (1 - lifelineSummary.overallOperability) * 0.5
    const totalLossM = Number((directCapitalLossM + indirectLossM).toFixed(1))

    // Recovery modeling over time (logistic recovery with 30-day characteristic time)
    const daysElapsed = timeElapsedMs / 86400000
    const recoveryProgressPct = daysElapsed > 0
      ? Math.min(100, Number((100 / (1 + Math.exp(-0.15 * (daysElapsed - 14)))).toFixed(1)))
      : 0

    return {
      timestampMs: timeElapsedMs,
      hazardId,
      peakIntensity: hazardState.peakIntensity,
      totalFootprintAreaKm2: Number(peakAreaKm2.toFixed(1)),
      exposedPopulation,
      structuralDamage: {
        nonePct: Number(nonePct.toFixed(1)),
        slightPct: Number(slightPct.toFixed(1)),
        moderatePct: Number(moderatePct.toFixed(1)),
        extensivePct: Number(extensivePct.toFixed(1)),
        completePct: Number(completePct.toFixed(1))
      },
      economicLossMillionUsd: totalLossM,
      lifelineOperability: Number((lifelineSummary.overallOperability * 100).toFixed(1)),
      lifelineDetails: lifelineSummary.details,
      recoveryProgressPct,
      summary: `Estimated ${exposedPopulation.toLocaleString()} exposed, $${totalLossM.toLocaleString()}M direct/indirect capital loss, ${lifelineSummary.failedCount} lifelines failed.`
    }
  }
}
