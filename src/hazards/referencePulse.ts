import type { HazardModule } from './module'
import type { HazardManifest } from './manifest'

interface ReferencePulseState {
  elapsedMs: number
  emitted: boolean
}

export interface ReferencePulseParameters extends Record<string, unknown> {
  delayMs: number
  severity: number
}

export const REFERENCE_PULSE_MANIFEST: HazardManifest = Object.freeze({
  id: 'reference_pulse_fixture',
  label: 'Reference Pulse Fixture',
  category: 'compound-cascading',
  fidelity: 'D',
  implementationState: 'stub',
  parameters: Object.freeze({
    delayMs: Object.freeze({ type: 'number', min: 0, max: 60_000, default: 1000, unit: 'ms' }),
    severity: Object.freeze({ type: 'number', min: 0, max: 1, default: 0.25 })
  }),
  consequenceTypes: Object.freeze(['reference_pulse']),
  limitations: Object.freeze(['Deterministic engineering fixture only; it does not represent a physical disaster model.'])
})

export function createReferencePulseModule(parameters: ReferencePulseParameters): HazardModule<ReferencePulseState, ReferencePulseParameters> {
  return {
    manifest: REFERENCE_PULSE_MANIFEST,
    modelVersion: '1.0.0',
    initialize: () => ({ elapsedMs: 0, emitted: false }),
    advance: (state, context) => {
      const next: ReferencePulseState = { elapsedMs: state.elapsedMs + context.deltaMs, emitted: state.emitted }
      if (next.emitted || next.elapsedMs + 1e-9 < parameters.delayMs) return { state: next, emissions: [] }
      next.emitted = true
      return {
        state: next,
        emissions: [{
          id: `reference-pulse-${Math.round(context.timeMs)}`,
          parentIds: [],
          type: 'reference_pulse',
          timeMs: context.timeMs,
          severity: parameters.severity,
          confidence: 1,
          payload: { fixture: true }
        }]
      }
    }
  }
}
