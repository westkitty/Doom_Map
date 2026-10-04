import type { ScenarioEnvelope } from '../core/scenario'
import { ConsequenceGraph } from '../consequences/graph'
import type { HazardModule } from '../hazards/module'
import { normalizeHazardParameters } from '../hazards/parameters'
import { checksumCanonical } from '../sim/canonical'
import { CheckpointStore } from '../sim/checkpoints'
import { SimulationClock } from '../sim/clock'
import { EventQueue } from '../sim/eventQueue'
import { SeededRandom } from '../sim/random'

export interface ScenarioRuntimeSnapshot {
  timeMs: number
  hazardState: unknown
  randomState: number
  emissions: unknown[]
  fingerprint: string
}

export class ScenarioRuntime<S, P extends Record<string, unknown>, E = unknown> {
  private readonly clock: SimulationClock
  private readonly random: SeededRandom
  private state: S
  private readonly eventQueue = new EventQueue<E>()
  private readonly graph = new ConsequenceGraph<unknown>()
  private readonly emissions: unknown[] = []
  private readonly checkpoints = new CheckpointStore<ScenarioRuntimeSnapshot>(64)
  private lastStepTimeMs: number

  constructor(
    readonly scenario: ScenarioEnvelope,
    private readonly module: HazardModule<S, P, E>,
    fixedStepMs = 1000 / 30
  ) {
    if (module.manifest.id !== scenario.hazardType) throw new Error('Scenario hazard type does not match runtime module.')
    const normalized = normalizeHazardParameters(module.manifest, scenario.parameters)
    if (normalized.issues.length > 0) throw new Error(`Invalid hazard parameters: ${normalized.issues.join('; ')}`)
    const startTimeMs = Date.parse(scenario.startTime)
    this.clock = new SimulationClock(startTimeMs, fixedStepMs)
    this.random = new SeededRandom(scenario.seed)
    this.lastStepTimeMs = startTimeMs
    this.state = module.initialize(normalized.values as P, {
      scenarioId: scenario.id,
      startTimeMs,
      seed: scenario.seed
    })
    this.checkpoint()
  }

  play(): void { this.clock.play() }
  pause(): void { this.clock.pause() }
  setSpeed(speed: number): void { this.clock.setSpeed(speed) }

  scheduleEvent(id: string, timeMs: number, type: string, payload: E): void {
    this.eventQueue.schedule({ id, timeMs, type, payload })
  }

  advance(realDeltaMs: number): number {
    for (const timeMs of this.clock.advance(realDeltaMs)) {
      const dueEvents = this.eventQueue.drainThrough(timeMs).map((event) => event.payload)
      const result = this.module.advance(this.state, {
        timeMs,
        deltaMs: timeMs - this.lastStepTimeMs,
        random: this.random,
        events: dueEvents
      })
      this.lastStepTimeMs = timeMs
      this.state = result.state
      for (const emission of result.emissions) {
        this.graph.add({
          id: emission.id,
          parentIds: emission.parentIds,
          startTimeMs: emission.timeMs,
          severity: emission.severity,
          confidence: emission.confidence,
          payload: emission.payload
        })
        this.emissions.push(emission)
      }
    }
    return this.clock.snapshot().timeMs
  }

  checkpoint(): ScenarioRuntimeSnapshot {
    const snapshot = this.snapshot()
    this.checkpoints.put({ timeMs: snapshot.timeMs, state: structuredClone(snapshot) })
    return snapshot
  }

  seekFromCheckpoint(timeMs: number): ScenarioRuntimeSnapshot | null {
    const checkpoint = this.checkpoints.nearestAtOrBefore(timeMs)
    return checkpoint ? structuredClone(checkpoint.state) : null
  }

  snapshot(): ScenarioRuntimeSnapshot {
    const timeMs = this.clock.snapshot().timeMs
    const state = structuredClone(this.state)
    const emissions = structuredClone(this.emissions)
    const payload = {
      scenarioChecksum: checksumCanonical(this.scenario),
      timeMs,
      hazardState: state,
      randomState: this.random.snapshot(),
      emissions
    }
    return { ...payload, fingerprint: checksumCanonical(payload) }
  }

  consequenceOrder(): string[] {
    return this.graph.topologicalOrder().map((node) => node.id)
  }
}
