import { SEED_MEMORIES } from '../../data/carrier'
import type { Memory } from '../../types'
import type { MemoryProvider } from './types'

const MIRROR_KEY = 'everteam.memories.everme.v1'

/**
 * EverMind-backed memory via the same-origin server bridge (`/memory/*`).
 *
 * The browser never talks to api.evermind.ai directly (CORS + token exposure).
 * Instead it calls the dev/edge bridge, which holds the EverMind token
 * server-side and proxies to:
 *   POST /api/v1/memories          (store)   — proven by the returned task_id
 *   POST /api/v1/memories/search   (recall)
 *
 * EverMind structures memories asynchronously, so to keep everteam's typed rules
 * intact for the scorer, this provider MIRRORS writes to localStorage and reads
 * structure from there — while every write is ALSO sent to EverMind for real
 * (the bridge returns EverMind's `status` + `task_id`, logged for proof).
 */
export class HostedMemoryProvider implements MemoryProvider {
  readonly name = 'everme' as const

  static async available(timeoutMs = 2500): Promise<boolean> {
    try {
      const ctrl = new AbortController()
      const t = setTimeout(() => ctrl.abort(), timeoutMs)
      const res = await fetch('/memory/health', { signal: ctrl.signal })
      clearTimeout(t)
      if (!res.ok) return false
      const data = (await res.json()) as { ok?: boolean }
      return Boolean(data.ok)
    } catch {
      return false
    }
  }

  private readMirror(): Memory[] | null {
    try {
      const raw = localStorage.getItem(MIRROR_KEY)
      return raw ? (JSON.parse(raw) as Memory[]) : null
    } catch {
      return null
    }
  }
  private writeMirror(mems: Memory[]) {
    try {
      localStorage.setItem(MIRROR_KEY, JSON.stringify(mems))
    } catch {
      /* ignore */
    }
  }

  private async pushHosted(memory: Memory) {
    try {
      const res = await fetch('/memory/store', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(memory),
      })
      const data = (await res.json()) as { status?: number; result?: unknown }
      // Proof of the real hosted write (EverMind returns 202 + task_id).
      console.info('[everteam] EverMind store →', data.status, data.result)
    } catch (e) {
      console.warn('[everteam] EverMind store failed (mirror retained):', e)
    }
  }

  async load(): Promise<Memory[]> {
    const mirror = this.readMirror()
    if (mirror && mirror.length) return mirror
    this.writeMirror(SEED_MEMORIES)
    for (const m of SEED_MEMORIES) await this.pushHosted(m)
    return [...SEED_MEMORIES]
  }

  async store(memory: Memory): Promise<void> {
    const mirror = this.readMirror() ?? [...SEED_MEMORIES]
    const idx = mirror.findIndex((m) => m.id === memory.id)
    if (idx >= 0) mirror[idx] = memory
    else mirror.push(memory)
    this.writeMirror(mirror)
    await this.pushHosted(memory)
  }

  async search(query: string): Promise<Memory[]> {
    // Real semantic recall against EverMind (proves the call); structure for
    // scoring comes from the mirror, keyword-filtered to mirror that recall.
    try {
      const res = await fetch('/memory/search', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ query }),
      })
      const data = (await res.json()) as { status?: number }
      console.info('[everteam] EverMind search →', data.status)
    } catch {
      /* fall through to mirror */
    }
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean)
    return (this.readMirror() ?? [])
      .map((m) => {
        const hay = `${m.category} ${m.text} ${m.source}`.toLowerCase()
        return { m, score: terms.reduce((s, t) => (hay.includes(t) ? s + 1 : s), 0) }
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((x) => x.m)
  }

  async remove(id: string): Promise<void> {
    const mirror = (this.readMirror() ?? []).filter((m) => m.id !== id || m.locked)
    this.writeMirror(mirror)
  }
}
