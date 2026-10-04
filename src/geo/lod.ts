export interface LodDecisionInput {
  geometricErrorM: number
  distanceM: number
  viewportHeightPx: number
  verticalFovDeg: number
  maximumScreenSpaceErrorPx: number
  wasRefined: boolean
  hysteresis?: number
}

export function screenSpaceErrorPx(geometricErrorM: number, distanceM: number, viewportHeightPx: number, verticalFovDeg: number): number {
  if (![geometricErrorM, distanceM, viewportHeightPx, verticalFovDeg].every(Number.isFinite)) throw new RangeError('LOD inputs must be finite.')
  if (geometricErrorM < 0 || distanceM <= 0 || viewportHeightPx <= 0 || verticalFovDeg <= 0 || verticalFovDeg >= 180) throw new RangeError('LOD inputs are outside valid ranges.')
  const denominator = 2 * distanceM * Math.tan(verticalFovDeg * Math.PI / 360)
  return geometricErrorM * viewportHeightPx / denominator
}

export function shouldRefineLod(input: LodDecisionInput): boolean {
  const sse = screenSpaceErrorPx(input.geometricErrorM, input.distanceM, input.viewportHeightPx, input.verticalFovDeg)
  const hysteresis = input.hysteresis ?? 0.15
  if (!Number.isFinite(input.maximumScreenSpaceErrorPx) || input.maximumScreenSpaceErrorPx <= 0) throw new RangeError('Maximum screen-space error must be positive.')
  if (!Number.isFinite(hysteresis) || hysteresis < 0 || hysteresis >= 1) throw new RangeError('LOD hysteresis must be between 0 and 1.')
  const threshold = input.wasRefined
    ? input.maximumScreenSpaceErrorPx * (1 - hysteresis)
    : input.maximumScreenSpaceErrorPx * (1 + hysteresis)
  return sse > threshold
}
