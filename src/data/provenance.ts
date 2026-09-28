/** Presentation cannot promote illustrative output into calculated science. */
export type Fidelity = 'A' | 'B' | 'C' | 'D'
export interface Provenance {
  id: string
  version: string
  kind: 'model' | 'provider'
  title: string
  fidelity: Fidelity
  sources: string[]
  timestamp: string | null
  assumptions: string[]
  uncertainty: string
  limitations: string[]
  attribution: string
  license: string
  coverage: string
}

const nonempty = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0
const strings = (value: unknown): value is string[] => Array.isArray(value) && value.length > 0 && value.every(nonempty)

/** Validates untrusted manifests before they enter UI/provider/model registries. */
export function parseProvenance(value: unknown): Provenance {
  if (!value || typeof value !== 'object') throw new Error('Provenance must be an object')
  const v = value as Record<string, unknown>
  for (const key of ['id', 'version', 'title', 'uncertainty', 'attribution', 'license', 'coverage']) {
    if (!nonempty(v[key])) throw new Error(`Missing provenance ${key}`)
  }
  if (!/^[a-z][a-z0-9.-]*$/.test(v.id as string)) throw new Error('Invalid provenance id')
  if (v.kind !== 'model' && v.kind !== 'provider') throw new Error('Invalid provenance kind')
  if (!['A', 'B', 'C', 'D'].includes(v.fidelity as string)) throw new Error('Invalid fidelity')
  for (const key of ['sources', 'assumptions', 'limitations']) {
    if (!strings(v[key])) throw new Error(`Missing provenance ${key}`)
  }
  for (const source of v.sources as string[]) {
    if (!/^https:\/\//.test(source)) throw new Error('Source must be an HTTPS URL')
    new URL(source)
  }
  if (v.timestamp !== null && (typeof v.timestamp !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}T.*Z$/.test(v.timestamp) || !Number.isFinite(Date.parse(v.timestamp)))) {
    throw new Error('Timestamp must be UTC ISO date or explicitly null')
  }
  return structuredClone(v) as unknown as Provenance
}

export function parseManifest(value: unknown, kind: Provenance['kind']): Provenance[] {
  if (!value || typeof value !== 'object') throw new Error('Invalid manifest')
  const manifest = value as { schemaVersion?: unknown; records?: unknown }
  if (manifest.schemaVersion !== 1 || !Array.isArray(manifest.records)) throw new Error('Unsupported manifest schema')
  const records = manifest.records.map(parseProvenance)
  const ids = new Set<string>()
  for (const record of records) {
    if (record.kind !== kind || ids.has(record.id)) throw new Error('Wrong kind or duplicate manifest ID')
    ids.add(record.id)
  }
  return records
}
