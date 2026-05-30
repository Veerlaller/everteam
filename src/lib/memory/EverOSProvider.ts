import { SEED_MEMORIES } from '../../data/carrier'
import type { Memory } from '../../types'
import type { MemoryProvider } from './types'

const USER_ID = 'valle-verde-trucking'

/**
 * EverOS self-hosted REST provider.
 *   POST /api/v1/memories            { message_id, create_time, sender, content }
 *   GET  /api/v1/memories/search     { query, user_id, memory_types, retrieve_method:"hybrid" }
 * server: http://localhost:1995 (configurable via VITE_EVEROS_BASE_URL)
 *
 * The full Memory object is JSON-encoded into `content` so structured rules
 * survive the round-trip. Throws on transport failure so the resolver can fall
 * through to the local provider.
 */
export class EverOSProvider implements MemoryProvider {
  readonly name = 'everos' as const
  private baseUrl: string
  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
  }

  static async healthy(baseUrl: string, timeoutMs = 1200): Promise<boolean> {
    try {
      const ctrl = new AbortController()
      const t = setTimeout(() => ctrl.abort(), timeoutMs)
      const res = await fetch(`${baseUrl}/api/v1/memories/search?query=ping&user_id=${USER_ID}&retrieve_method=hybrid`, {
        signal: ctrl.signal,
      })
      clearTimeout(t)
      return res.ok
    } catch {
      return false
    }
  }

  private async post(memory: Memory) {
    await fetch(`${this.baseUrl}/api/v1/memories`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        message_id: memory.id,
        create_time: memory.createdAt || Date.now(),
        sender: memory.source,
        content: JSON.stringify(memory),
      }),
    })
  }

  private parse(rows: unknown[]): Memory[] {
    const out: Memory[] = []
    for (const r of rows) {
      const content = (r as { content?: string }).content
      if (!content) continue
      try {
        out.push(JSON.parse(content) as Memory)
      } catch {
        /* skip non-everteam rows */
      }
    }
    return out
  }

  async load(): Promise<Memory[]> {
    const found = await this.search('reefer carrier rule load')
    if (found.length === 0) {
      for (const m of SEED_MEMORIES) await this.post(m)
      return [...SEED_MEMORIES]
    }
    return found
  }

  async store(memory: Memory): Promise<void> {
    await this.post(memory)
  }

  async search(query: string): Promise<Memory[]> {
    const url = new URL(`${this.baseUrl}/api/v1/memories/search`)
    url.searchParams.set('query', query || 'memory')
    url.searchParams.set('user_id', USER_ID)
    url.searchParams.set('retrieve_method', 'hybrid')
    const res = await fetch(url.toString())
    if (!res.ok) throw new Error(`EverOS search ${res.status}`)
    const data = await res.json()
    const rows = Array.isArray(data) ? data : (data.results ?? data.memories ?? [])
    return this.parse(rows)
  }

  async remove(): Promise<void> {
    /* EverOS retains history; deletion is a no-op at this tier. */
  }
}
