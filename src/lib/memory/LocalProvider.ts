import { SEED_MEMORIES } from '../../data/carrier'
import type { Memory } from '../../types'
import type { MemoryProvider } from './types'

const KEY = 'everteam.memories.v1'

/**
 * Browser-local provider (localStorage). This is the bottom of the fallback
 * chain and the dev default. It makes the store -> recall -> re-rank loop and
 * page-reload persistence genuinely real with zero backend.
 */
export class LocalProvider implements MemoryProvider {
  readonly name = 'local' as const

  private read(): Memory[] {
    try {
      const raw = localStorage.getItem(KEY)
      if (!raw) {
        this.write(SEED_MEMORIES)
        return [...SEED_MEMORIES]
      }
      return JSON.parse(raw) as Memory[]
    } catch {
      return [...SEED_MEMORIES]
    }
  }

  private write(mems: Memory[]) {
    try {
      localStorage.setItem(KEY, JSON.stringify(mems))
    } catch {
      /* storage full / unavailable — degrade silently */
    }
  }

  async load(): Promise<Memory[]> {
    return this.read()
  }

  async store(memory: Memory): Promise<void> {
    const mems = this.read()
    const idx = mems.findIndex((m) => m.id === memory.id)
    if (idx >= 0) mems[idx] = memory
    else mems.push(memory)
    this.write(mems)
  }

  async search(query: string): Promise<Memory[]> {
    const q = query.toLowerCase()
    const terms = q.split(/\s+/).filter(Boolean)
    return this.read()
      .map((m) => {
        const hay = `${m.category} ${m.text} ${m.source}`.toLowerCase()
        const score = terms.reduce((s, t) => (hay.includes(t) ? s + 1 : s), 0)
        return { m, score }
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((x) => x.m)
  }

  async remove(id: string): Promise<void> {
    const mems = this.read().filter((m) => m.id !== id || m.locked)
    this.write(mems)
  }
}
