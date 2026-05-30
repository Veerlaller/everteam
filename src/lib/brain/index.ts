import type { AgentId, Memory } from '../../types'
import type { HuntResult } from '../scoring'

export interface BrainInput {
  agent: AgentId
  userText: string
  memories: Memory[]
  lastHunt?: HuntResult | null
}

export interface BrainOutput {
  text: string
  newMemory?: Memory
}

export interface Brain {
  readonly name: 'gemini' | 'mock'
  chat(input: BrainInput): Promise<BrainOutput>
}

import { GeminiBrain } from './gemini'
import { MockBrain } from './mock'

const env = import.meta.env

/**
 * Use the Gemini-backed brain (via the Butterbase edge function) when a backend
 * URL is configured; otherwise the local mock brain — same interface, so the UI
 * never changes. Logged for visibility.
 */
export function resolveBrain(): Brain {
  const base = env.VITE_BUTTERBASE_BASE_URL as string | undefined
  const brain: Brain = base ? new GeminiBrain(base) : new MockBrain()
  console.info(`[everteam] agent brain: ${brain.name}`)
  return brain
}
