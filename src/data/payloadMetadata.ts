import { checksumCanonical } from '../sim/canonical'

export interface PayloadMetadata {
  bytes: number
  contentHash: string
}

export function measureJsonPayload(value: unknown): PayloadMetadata {
  const encoded = new TextEncoder().encode(JSON.stringify(value))
  return {
    bytes: encoded.byteLength,
    contentHash: checksumCanonical(value)
  }
}
