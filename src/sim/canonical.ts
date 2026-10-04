function canonicalize(value: unknown, seen: Set<object>): string {
  if (value === null) return 'null'
  if (typeof value === 'string') return JSON.stringify(value)
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new TypeError('Canonical JSON cannot encode non-finite numbers.')
    return JSON.stringify(Object.is(value, -0) ? 0 : value)
  }
  if (Array.isArray(value)) return `[${value.map((item) => canonicalize(item, seen)).join(',')}]`
  if (typeof value === 'object') {
    const object = value as Record<string, unknown>
    if (seen.has(object)) throw new TypeError('Canonical JSON cannot encode cyclic objects.')
    seen.add(object)
    const result = `{${Object.keys(object).sort().map((key) => `${JSON.stringify(key)}:${canonicalize(object[key], seen)}`).join(',')}}`
    seen.delete(object)
    return result
  }
  throw new TypeError(`Canonical JSON does not support ${typeof value}.`)
}

export function stableStringify(value: unknown): string {
  return canonicalize(value, new Set())
}

export function checksumCanonical(value: unknown): string {
  const input = stableStringify(value)
  let hash = 0x811c9dc5
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}
