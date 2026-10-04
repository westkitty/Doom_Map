import type { GeodeticPoint } from './coordinates'
import type { QualityTier } from './quality'
export type QualityMode = 'auto' | QualityTier
export interface CameraState { camera: [number, number, number]; target: [number, number, number]; up: [number, number, number] }
export interface ShareableViewState extends CameraState { version: 1; qualityMode: QualityMode; selected: GeodeticPoint | null; hudHidden: boolean }
const QUALITY_MODES: readonly QualityMode[] = ['auto','high','balanced','low','safe']
function parseVector(value: string | null): [number, number, number] | null {
  if (!value) return null
  const values = value.split(',').map(Number)
  if (values.length !== 3 || !values.every(Number.isFinite)) return null
  return [values[0]!, values[1]!, values[2]!]
}
function formatVector(value: [number, number, number]): string { return value.map((item) => item.toFixed(3)).join(',') }
export function serializeViewState(state: ShareableViewState): string {
  const params = new URLSearchParams()
  params.set('v', String(state.version)); params.set('c', formatVector(state.camera)); params.set('t', formatVector(state.target)); params.set('u', formatVector(state.up)); params.set('q', state.qualityMode)
  if (state.selected) params.set('s', `${state.selected.latitudeDeg.toFixed(6)},${state.selected.longitudeDeg.toFixed(6)}`)
  if (state.hudHidden) params.set('h', '1')
  return `#${params.toString()}`
}
export function parseViewState(hash: string): ShareableViewState | null {
  const trimmed = hash.startsWith('#') ? hash.slice(1) : hash
  if (!trimmed) return null
  const params = new URLSearchParams(trimmed)
  if (params.get('v') !== '1') return null
  const camera = parseVector(params.get('c')); const target = parseVector(params.get('t')); const up = parseVector(params.get('u')); const qualityMode = params.get('q') as QualityMode | null
  if (!camera || !target || !up || !qualityMode || !QUALITY_MODES.includes(qualityMode)) return null
  let selected: GeodeticPoint | null = null
  const rawSelected = params.get('s')
  if (rawSelected) {
    const values = rawSelected.split(',').map(Number)
    if (values.length !== 2 || !values.every(Number.isFinite) || values[0]! < -90 || values[0]! > 90 || values[1]! < -180 || values[1]! > 180) return null
    selected = { latitudeDeg: values[0]!, longitudeDeg: values[1]!, heightM: 0 }
  }
  return { version: 1, camera, target, up, qualityMode, selected, hudHidden: params.get('h') === '1' }
}
