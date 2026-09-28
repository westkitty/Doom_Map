/** Deterministic Mulberry32 PRNG for reproducible scenario simulations. */
export class PRNG {
  private state: number

  constructor(seed: number) {
    this.state = (seed ^ 0x6d2b79f5) >>> 0
    // Warm up state
    this.next()
    this.next()
  }

  next(): number {
    let z = (this.state += 0x6d2b79f5)
    z = Math.imul(z ^ (z >>> 15), z | 1)
    z ^= z + Math.imul(z ^ (z >>> 7), z | 61)
    return ((z ^ (z >>> 14)) >>> 0) / 4294967296
  }

  nextRange(min: number, max: number): number {
    return min + this.next() * (max - min)
  }

  nextInt(min: number, max: number): number {
    return Math.floor(this.nextRange(min, max + 1))
  }

  /** Box-Muller transform for standard normal distribution. */
  nextGaussian(mean = 0, stdDev = 1): number {
    const u1 = Math.max(1e-15, this.next())
    const u2 = this.next()
    const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2)
    return mean + z0 * stdDev
  }
}
