import type { ScenarioEnvelope } from '../core/scenario'
import { ConsequenceGraph, type ConsequenceNode } from '../consequences/graph'
import type { HazardModule } from '../hazards/module'
import { normalizeHazardParameters } from '../hazards/parameters'
import { checksumCanonical } from '../sim/canonical'
import { CheckpointStore } from '../sim/checkpoints'
import { SimulationClock, type ClockState } from '../sim/clock'
import { EventQueue, type ScheduledEvent } from '../sim/eventQueue'
import { SeededRandom } from '../sim/random'
import { validateModelCompatibility } from './compatibility'
import { RuntimeInputJournal, type RuntimeInputEntry } from './inputJournal'

export interface ScenarioRuntimeSnapshot {
  timeMs: number
  clock: ClockState
  hazardState: unknown
  randomState: number
  emissions: unknown[]
  queuedEvents: ScheduledEvent<unknown>[]
  consequences: ConsequenceNode<unknown>[]
  journal: RuntimeInputEntry<unknown>[]
  fingerprint: string
}

export class ScenarioRuntime<S, P extends Record<string, unknown>, E = unknown> {
  private readonly clock: SimulationClock
  private readonly random: SeededRandom
  private state: S
  private readonly eventQueue = new EventQueue<E>()
  private readonly graph = new ConsequenceGraph<unknown>()
  private readonly emissions: unknown[] = []
  private readonly journal = new RuntimeInputJournal<E>()
  private readonly checkpoints = new CheckpointStore<ScenarioRuntimeSnapshot>(64)
  private lastStepTimeMs: number

  constructor(
    readonly scenario: ScenarioEnvelope,
    private readonly module: HazardModule<S, P, E>,
    fixedStepMs = 1000 / 30
  ) {
    if (module.manifest.id !== scenario.hazardType) throw new Error('Scenario hazard type does not match runtime module.')
    const compatibilityIssues = validateModelCompatibility(scenario, module)
    if (compatibilityIssues.length > 0) throw new Error(`Scenario/runtime compatibility failed: ${compatibilityIssues.join('; ')}`)
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
    this.journal.record(id, timeMs, type, payload)
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

  restoreCheckpoint(timeMs: number): boolean {
    const checkpoint = this.checkpoints.nearestAtOrBefore(timeMs)
    if (!checkpoint) return false
    this.restore(checkpoint.state)
    return true
  }

  restore(snapshot: ScenarioRuntimeSnapshot): void {
    const { fingerprint, ...payload } = snapshot
    if (checksumCanonical(payload) !== fingerprint) throw new Error('Scenario runtime checkpoint fingerprint mismatch.')

    this.clock.restore(snapshot.clock)
    this.random.restore(snapshot.randomState)
    this.state = structuredClone(snapshot.hazardState) as S
    this.emissions.splice(0, this.emissions.length, ...structuredClone(snapshot.emissions))
    this.eventQueue.restore(snapshot.queuedEvents as ScheduledEvent<E>[])
    this.graph.restore(snapshot.consequences)
    this.journal.restore(snapshot.journal as RuntimeInputEntry<E>[])
    this.lastStepTimeMs = snapshot.timeMs
  }

  inputJournal(): RuntimeInputEntry<E>[] { return this.journal.snapshot() }

  snapshot(): ScenarioRuntimeSnapshot {
    const clock = this.clock.snapshot()
    const payload = {
      timeMs: clock.timeMs,
      clock,
      hazardState: structuredClone(this.state),
      randomState: this.random.snapshot(),
      emissions: structuredClone(this.emissions),
      queuedEvents: this.eventQueue.snapshot() as ScheduledEvent<unknown>[],
      consequences: this.graph.snapshot(),
      journal: this.journal.snapshot() as RuntimeInputEntry<unknown>[]
    }
    return { ...payload, fingerprint: checksumCanonical(payload) }
  }

  consequenceOrder(): string[] {
    return this.graph.topologicalOrder().map((node) => node.id)
  }
}
