import { parseScenario, type ScenarioDefinition } from './types'

const DB_NAME = 'doom-map-scenarios'
const STORE_NAME = 'scenarios'

export class ScenarioVault {
  private open(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1)
      req.onupgradeneeded = () => {
        const db = req.result
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' })
        }
      }
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
  }

  async save(scenario: ScenarioDefinition): Promise<void> {
    const validated = parseScenario(scenario)
    const db = await this.open()
    try {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite')
        tx.objectStore(STORE_NAME).put(validated)
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
        tx.onabort = () => reject(tx.error)
      })
    } finally {
      db.close()
    }
  }

  async load(id: string): Promise<ScenarioDefinition | null> {
    const db = await this.open()
    try {
      return await new Promise<ScenarioDefinition | null>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly')
        const req = tx.objectStore(STORE_NAME).get(id)
        tx.oncomplete = () => {
          if (!req.result) resolve(null)
          else {
            try { resolve(parseScenario(req.result)) }
            catch { resolve(null) }
          }
        }
        tx.onerror = () => reject(tx.error)
      })
    } finally {
      db.close()
    }
  }

  async list(): Promise<ScenarioDefinition[]> {
    const db = await this.open()
    try {
      return await new Promise<ScenarioDefinition[]>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly')
        const req = tx.objectStore(STORE_NAME).getAll()
        tx.oncomplete = () => {
          const list = (req.result || [])
            .map(item => {
              try { return parseScenario(item) }
              catch { return null }
            })
            .filter((s): s is ScenarioDefinition => s !== null)
          resolve(list)
        }
        tx.onerror = () => reject(tx.error)
      })
    } finally {
      db.close()
    }
  }

  async delete(id: string): Promise<void> {
    const db = await this.open()
    try {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite')
        tx.objectStore(STORE_NAME).delete(id)
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
      })
    } finally {
      db.close()
    }
  }

  exportJson(scenario: ScenarioDefinition): string {
    const validated = parseScenario(scenario)
    return JSON.stringify(validated, null, 2)
  }

  importJson(jsonStr: string): ScenarioDefinition {
    const parsed = JSON.parse(jsonStr)
    return parseScenario(parsed)
  }
}
