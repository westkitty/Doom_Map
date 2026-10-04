export type FidelityClass = 'A' | 'B' | 'C' | 'D'
export type SourceKind = 'reference' | 'dataset' | 'feed' | 'model' | 'derived'
export interface SourceReference { id: string; title: string; kind: SourceKind; url?: string; version?: string; timestamp?: string }
export interface ProvenanceRecord { id: string; version: string; fidelity: FidelityClass; sources: SourceReference[]; assumptions: string[]; limitations: string[]; uncertainty: string }
const FIDELITY = new Set<FidelityClass>(['A','B','C','D'])
const SOURCE_KINDS = new Set<SourceKind>(['reference','dataset','feed','model','derived'])
export function validateProvenanceRecord(record: ProvenanceRecord): string[] {
  const issues: string[] = []
  if (!record.id.trim()) issues.push('id is required')
  if (!record.version.trim()) issues.push('version is required')
  if (!FIDELITY.has(record.fidelity)) issues.push('fidelity must be A, B, C, or D')
  if (record.sources.length === 0) issues.push('at least one source is required')
  if (!record.uncertainty.trim()) issues.push('uncertainty statement is required')
  if (record.limitations.length === 0) issues.push('at least one limitation is required')
  const sourceIds = new Set<string>()
  for (const source of record.sources) {
    if (!source.id.trim()) issues.push('source id is required')
    if (!source.title.trim()) issues.push(`source ${source.id || '<unknown>'} title is required`)
    if (!SOURCE_KINDS.has(source.kind)) issues.push(`source ${source.id || '<unknown>'} kind is invalid`)
    if (sourceIds.has(source.id)) issues.push(`duplicate source id: ${source.id}`)
    sourceIds.add(source.id)
  }
  return issues
}
