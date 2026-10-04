import { describe, expect, it } from 'vitest'
import { checksumCanonical, stableStringify } from '../src/sim/canonical'
import { CheckpointStore } from '../src/sim/checkpoints'
import { SimulationClock } from '../src/sim/clock'
import { EventQueue } from '../src/sim/eventQueue'
import { SeededRandom, hashStringToSeed } from '../src/sim/random'
import { ScenarioBranchGraph } from '../src/scenario/branchGraph'

describe('deterministic simulation primitives', () => {
  it('replays seeded random streams exactly', () => {
    const a = new SeededRandom(hashStringToSeed('doom-map-fixture'))
    const b = new SeededRandom(hashStringToSeed('doom-map-fixture'))
    expect([a.next(), a.next(), a.next()]).toEqual([b.next(), b.next(), b.next()])
  })

  it('advances a fixed-step clock independent of input chunking', () => {
    const a = new SimulationClock(0, 10)
    const b = new SimulationClock(0, 10)
    a.play(); b.play()
    expect(a.advance(35)).toEqual([10, 20, 30])
    b.advance(15); b.advance(20)
    expect(b.snapshot().timeMs).toBe(a.snapshot().timeMs)
  })

  it('orders simultaneous events by stable insertion sequence', () => {
    const queue = new EventQueue<number>()
    queue.schedule({ id: 'b', timeMs: 5, type: 'x', payload: 2 })
    queue.schedule({ id: 'a', timeMs: 5, type: 'x', payload: 1 })
    expect(queue.drainThrough(5).map((event) => event.id)).toEqual(['b', 'a'])
  })

  it('keeps bounded seek checkpoints and finds nearest prior state', () => {
    const store = new CheckpointStore<string>(2)
    store.put({ timeMs: 0, state: 'zero' }); store.put({ timeMs: 10, state: 'ten' }); store.put({ timeMs: 20, state: 'twenty' })
    expect(store.list().map((item) => item.timeMs)).toEqual([10, 20])
    expect(store.nearestAtOrBefore(17)?.state).toBe('ten')
  })

  it('canonicalizes object key order and yields stable checksums', () => {
    expect(stableStringify({ b: 2, a: 1 })).toBe('{"a":1,"b":2}')
    expect(checksumCanonical({ b: 2, a: 1 })).toBe(checksumCanonical({ a: 1, b: 2 }))
  })

  it('tracks scenario branch lineage and leaves', () => {
    const graph = new ScenarioBranchGraph()
    graph.add({ id: 'root', parentId: null, label: 'Root', scenarioChecksum: 'a', createdAt: '2026-10-04T00:00:00Z' })
    graph.add({ id: 'alt-a', parentId: 'root', label: 'Alt A', scenarioChecksum: 'b', createdAt: '2026-10-04T00:01:00Z' })
    graph.add({ id: 'alt-b', parentId: 'root', label: 'Alt B', scenarioChecksum: 'c', createdAt: '2026-10-04T00:02:00Z' })
    expect(graph.lineage('alt-a').map((branch) => branch.id)).toEqual(['root', 'alt-a'])
    expect(graph.leaves().map((branch) => branch.id)).toEqual(['alt-a', 'alt-b'])
  })
})
