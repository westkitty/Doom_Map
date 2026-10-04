export interface ScaleBarResult {
  meters: number
  widthPx: number
  label: string
}

function formatDistance(meters: number): string {
  if (meters >= 1_000_000) return `${(meters / 1_000_000).toFixed(meters >= 10_000_000 ? 0 : 1)} Mm`
  if (meters >= 1_000) return `${(meters / 1_000).toFixed(meters >= 10_000 ? 0 : 1)} km`
  return `${Math.round(meters)} m`
}

export function chooseScaleBar(metersPerPixel: number, targetWidthPx = 120): ScaleBarResult | null {
  if (!Number.isFinite(metersPerPixel) || metersPerPixel <= 0 || targetWidthPx <= 0) return null
  const targetMeters = metersPerPixel * targetWidthPx
  const exponent = Math.floor(Math.log10(targetMeters))
  const base = Math.pow(10, exponent)
  const candidates = [1, 2, 5, 10].map((factor) => factor * base)
  const meters = candidates.filter((candidate) => candidate <= targetMeters).at(-1) ?? base
  return { meters, widthPx: meters / metersPerPixel, label: formatDistance(meters) }
}
