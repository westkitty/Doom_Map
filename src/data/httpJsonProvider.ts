import type { GeoDataPayload, GeoDataProvider, GeoDataQuery } from './geoProvider'
import { measureJsonPayload } from './payloadMetadata'
import { RetryPolicy } from './retryPolicy'

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>

export interface HttpJsonProviderOptions<T> {
  id: string
  attribution: string
  urlForQuery: (query: GeoDataQuery) => string
  validate?: (value: unknown) => T
  datasetVersion?: string
  retryPolicy?: RetryPolicy
  fetchImpl?: FetchLike
}

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException('Request aborted', 'AbortError'))
      return
    }
    const timer = setTimeout(resolve, ms)
    signal.addEventListener('abort', () => {
      clearTimeout(timer)
      reject(new DOMException('Request aborted', 'AbortError'))
    }, { once: true })
  })
}

export class HttpJsonProvider<T = unknown> implements GeoDataProvider<T> {
  readonly id: string
  readonly attribution: string
  private readonly fetchImpl: FetchLike
  private readonly retryPolicy: RetryPolicy

  constructor(private readonly options: HttpJsonProviderOptions<T>) {
    if (!options.id.trim() || !options.attribution.trim()) throw new Error('Provider id and attribution are required.')
    this.id = options.id
    this.attribution = options.attribution
    this.fetchImpl = options.fetchImpl ?? fetch
    this.retryPolicy = options.retryPolicy ?? new RetryPolicy()
  }

  async fetch(query: GeoDataQuery, signal: AbortSignal): Promise<GeoDataPayload<T>> {
    let lastError: unknown = null

    for (let attempt = 1; attempt <= this.retryPolicy.maxAttempts; attempt += 1) {
      let response: Response
      try {
        response = await this.fetchImpl(this.options.urlForQuery(query), { signal })
      } catch (error) {
        if (signal.aborted) throw error
        lastError = error
        if (!this.retryPolicy.shouldRetry(attempt)) throw error
        if (attempt < this.retryPolicy.maxAttempts) await sleep(this.retryPolicy.delayMs(attempt, 0.5), signal)
        continue
      }

      if (!response.ok) {
        const error = new Error(`Provider ${this.id} returned HTTP ${response.status}.`)
        if (!this.retryPolicy.shouldRetry(attempt, response.status)) throw error
        lastError = error
        if (attempt < this.retryPolicy.maxAttempts) await sleep(this.retryPolicy.delayMs(attempt, 0.5), signal)
        continue
      }

      const raw: unknown = await response.json()
      const data = this.options.validate ? this.options.validate(raw) : raw as T
      const metadata = measureJsonPayload(data)
      return {
        providerId: this.id,
        data,
        bytes: metadata.bytes,
        contentHash: metadata.contentHash,
        fetchedAt: new Date().toISOString(),
        attribution: this.attribution,
        ...(this.options.datasetVersion ? { datasetVersion: this.options.datasetVersion } : {})
      }
    }

    throw lastError ?? new Error(`Provider ${this.id} failed without an error.`)
  }
}
