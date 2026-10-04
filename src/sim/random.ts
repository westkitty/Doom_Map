export function hashStringToSeed(value: string): number {
  let hash = 0x811c9dc5
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}

export class SeededRandom {
  private state: number

  constructor(seed: number) {
    if (!Number.isSafeInteger(seed) || seed < 0) throw new RangeError('Seed must be a non-negative safe integer.')
    this.state = seed >>> 0
  }

  nextUint32(): number {
    let value = this.state || 0x6d2b79f5
    value ^= value << 13
    value ^= value >>> 17
    value ^= value << 5
    this.state = value >>> 0
    return this.state
  }

  next(): number {
    return this.nextUint32() / 0x1_0000_0000
  }

  nextRange(min: number, max: number): number {
    if (!Number.isFinite(min) || !Number.isFinite(max) || max < min) throw new RangeError('Invalid random range.')
    return min + (max - min) * this.next()
  }

  fork(label: string): SeededRandom {
    return new SeededRandom((this.state ^ hashStringToSeed(label)) >>> 0)
  }

  snapshot(): number {
    return this.state >>> 0
  }
}
