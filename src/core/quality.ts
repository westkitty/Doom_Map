export const QUALITY = {
  Ultra: { dpr: 2, atmosphere: true, grid: true },
  High: { dpr: 1.75, atmosphere: true, grid: true },
  Balanced: { dpr: 1.5, atmosphere: true, grid: true },
  Low: { dpr: 1, atmosphere: false, grid: true },
  Safe: { dpr: 1, atmosphere: false, grid: false }
} as const
export type QualityTier = keyof typeof QUALITY
