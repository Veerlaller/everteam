import type { Brain, BrainInput, BrainOutput } from './index'
import { MockBrain } from './mock'

/**
 * Gemini-backed brain. Calls the Butterbase `eve` edge function, which holds the
 * Gemini key server-side, builds a system prompt from the carrier profile +
 * recalled memories, calls Gemini, extracts any new preference, and returns the
 * reply (+ any new memory). On any failure it degrades to the mock brain so the
 * UI never breaks (graceful runtime fallback).
 */
export class GeminiBrain implements Brain {
  readonly name = 'gemini' as const
  private fallback = new MockBrain()
  private baseUrl: string

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
  }

  async chat(input: BrainInput): Promise<BrainOutput> {
    try {
      const base = this.baseUrl === '/' ? '' : this.baseUrl.replace(/\/$/, '')
      const res = await fetch(`${base}/eve`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          agent: input.agent,
          message: input.userText,
          memories: input.memories,
        }),
      })
      if (!res.ok) throw new Error(`eve ${res.status}`)
      const data = (await res.json()) as BrainOutput
      if (!data?.text) throw new Error('empty reply')
      return data
    } catch (e) {
      console.warn('[everteam] Gemini brain failed, using mock fallback:', e)
      return this.fallback.chat(input)
    }
  }
}
