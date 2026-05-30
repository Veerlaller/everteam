import { create } from 'zustand'
import { MOCK_LOADS } from '../data/loads'
import type { AgentId, ChatMessage, Memory, ProviderName, ScoredLoad } from '../types'
import { resolveBrain, type Brain } from '../lib/brain'
import { extractRule, newMemory } from '../lib/brain/extract'
import { resolveProvider, type MemoryProvider } from '../lib/memory'
import { activeRules, runHunt, type HuntResult } from '../lib/scoring'

export interface ReasoningStep {
  id: string
  text: string
  tone: 'info' | 'cut' | 'good'
}

type HuntPhase = 'idle' | 'thinking' | 'results'

export type ReasonChip = 'too much deadhead' | 'rate too low' | 'bad lane' | 'broker'

interface AppState {
  ready: boolean
  providerName: ProviderName
  brainName: Brain['name']
  memories: Memory[]
  messages: ChatMessage[]
  activeAgent: AgentId
  thinking: boolean

  // hunt / working panel
  workingOpen: boolean
  huntPhase: HuntPhase
  runId: number
  steps: ReasoningStep[]
  result: HuntResult | null
  picking: { chosen: ScoredLoad; rejected?: ScoredLoad } | null

  // ui feedback
  flashMemoryId: string | null
  toast: string | null

  init: () => Promise<void>
  setAgent: (id: AgentId) => void
  send: (text: string) => Promise<void>
  startHunt: () => void
  finishThinking: () => void
  choose: (chosen: ScoredLoad, rejected?: ScoredLoad) => void
  learn: (reason: ReasonChip | string) => Promise<void>
  closeWorking: () => void
  dismissToast: () => void
}

let provider: MemoryProvider
let brain: Brain
let msgSeq = 0
const mid = (s: string) => `${s}-${Date.now()}-${msgSeq++}`

function buildSteps(memories: Memory[], result: HuntResult): ReasoningStep[] {
  const rules = activeRules(memories)
  const steps: ReasoningStep[] = [
    { id: 's0', tone: 'info', text: `Pulling ${MOCK_LOADS.length} reefer loads near Fresno…` },
  ]
  // count how many each rule removes (first-match attribution)
  const removedBy: Record<string, number> = {}
  for (const load of result.all) {
    const firstViol = load.violations[0]
    if (firstViol) removedBy[firstViol.ruleType] = (removedBy[firstViol.ruleType] ?? 0) + 1
  }
  for (const r of rules) {
    const n = removedBy[r.type] ?? 0
    if (r.type === 'min_rate')
      steps.push({ id: `r-${r.type}`, tone: n ? 'cut' : 'info', text: `Applying your floor: $${r.value.toFixed(2)}/mi${n ? ` — cut ${n}` : ''}` })
    else if (r.type === 'block_broker')
      steps.push({ id: `r-${r.type}`, tone: n ? 'cut' : 'info', text: `Removing ${r.value} (your rule)${n ? ` — cut ${n}` : ''}` })
    else if (r.type === 'home_by')
      steps.push({ id: `r-${r.type}`, tone: n ? 'cut' : 'info', text: `Checking home-by-${r.value}${n ? ` — cut ${n}` : ''}` })
    else if (r.type === 'max_deadhead')
      steps.push({ id: `r-${r.type}`, tone: n ? 'cut' : 'info', text: `Capping deadhead at ${r.value}mi${n ? ` — cut ${n}` : ''}` })
    else if (r.type === 'no_east_of')
      steps.push({ id: `r-${r.type}`, tone: n ? 'cut' : 'info', text: `Dropping anything east of your line${n ? ` — cut ${n}` : ''}` })
    else if (r.type === 'truck_regional')
      steps.push({ id: `r-${r.type}`, tone: n ? 'cut' : 'info', text: `Keeping Truck ${r.value} regional${n ? ` — cut ${n}` : ''}` })
    else if (r.type === 'avoid_dest')
      steps.push({ id: `r-${r.type}-${r.value}`, tone: n ? 'cut' : 'info', text: `Avoiding ${r.value}${n ? ` — cut ${n}` : ''}` })
  }
  steps.push({ id: 'score', tone: 'info', text: 'Scoring net $/mi after deadhead + est. fuel…' })
  steps.push({ id: 'done', tone: 'good', text: `${result.eligible.length} clear your rules → ranking by net $/mi` })
  return steps
}

export const useStore = create<AppState>((set, get) => ({
  ready: false,
  providerName: 'local',
  brainName: 'mock',
  memories: [],
  messages: [],
  activeAgent: 'eve',
  thinking: false,
  workingOpen: false,
  huntPhase: 'idle',
  runId: 0,
  steps: [],
  result: null,
  picking: null,
  flashMemoryId: null,
  toast: null,

  init: async () => {
    provider = await resolveProvider()
    brain = resolveBrain()
    const memories = await provider.load()
    set({
      ready: true,
      providerName: provider.name,
      brainName: brain.name,
      memories,
      messages: [
        {
          id: mid('m'),
          sender: 'eve',
          ts: Date.now(),
          text: "Morning. I've got your operation memorized — Fresno reefer, $2/mi floor, no Coyote, home by Friday, Truck #3 regional. Want me to find you a load?",
        },
      ],
    })
  },

  setAgent: (id) => set({ activeAgent: id }),

  send: async (text) => {
    const clean = text.trim()
    if (!clean) return
    const { activeAgent, memories, result } = get()
    set((s) => ({
      messages: [...s.messages, { id: mid('u'), sender: 'user', ts: Date.now(), text: clean }],
      thinking: true,
    }))

    const out = await brain.chat({ agent: activeAgent, userText: clean, memories, lastHunt: result })

    let nextMemories = memories
    if (out.newMemory) {
      await provider.store(out.newMemory)
      nextMemories = [...memories, out.newMemory]
    }

    set((s) => ({
      thinking: false,
      memories: nextMemories,
      flashMemoryId: out.newMemory ? out.newMemory.id : s.flashMemoryId,
      toast: out.newMemory ? `everteam learned: ${out.newMemory.text}` : s.toast,
      messages: [...s.messages, { id: mid('a'), sender: activeAgent, ts: Date.now(), text: out.text }],
    }))

    if (out.newMemory) {
      // if a hunt is on screen, re-rank it live
      if (get().workingOpen) get().startHunt()
      setTimeout(() => set({ flashMemoryId: null }), 2200)
    }
  },

  startHunt: () => {
    const { memories } = get()
    const result = runHunt(MOCK_LOADS, memories, 2)
    set((s) => ({
      workingOpen: true,
      huntPhase: 'thinking',
      runId: s.runId + 1,
      steps: buildSteps(memories, result),
      result,
      picking: null,
    }))
  },

  finishThinking: () => set({ huntPhase: 'results' }),

  choose: (chosen, rejected) => set({ picking: { chosen, rejected } }),

  learn: async (reason) => {
    const { picking, memories } = get()
    if (!picking) return
    const rejected = picking.rejected
    let mem: Memory | null = null

    if (typeof reason === 'string' && !['too much deadhead', 'rate too low', 'bad lane', 'broker'].includes(reason)) {
      // free-text reason → try to extract a rule, else store as a Past Loads note
      const ex = extractRule(reason)
      mem = ex
        ? newMemory({ category: ex.category, text: ex.text, source: `you (${picking.chosen.id})`, rule: ex.rule })
        : newMemory({ category: 'Past Loads', text: `Picked ${picking.chosen.id} — "${reason}"`, source: `you (${picking.chosen.id})` })
    } else {
      const chip = reason as ReasonChip
      if (chip === 'too much deadhead' && rejected) {
        const cap = Math.max(50, Math.floor(rejected.deadheadMi) - 10)
        mem = newMemory({ category: 'Rules', text: `No more than ${cap}mi deadhead.`, source: `you (${picking.chosen.id})`, rule: { type: 'max_deadhead', value: cap } })
      } else if (chip === 'rate too low') {
        const rules = activeRules(memories)
        const cur = (rules.find((r) => r.type === 'min_rate') as { value: number } | undefined)?.value ?? 2.0
        const value = +(cur + 0.25).toFixed(2)
        mem = newMemory({ category: 'Rules', text: `Raise reefer floor to $${value.toFixed(2)}/mi.`, source: `you (${picking.chosen.id})`, rule: { type: 'min_rate', value } })
      } else if (chip === 'bad lane' && rejected) {
        const city = rejected.dest.split(',')[0]
        mem = newMemory({ category: 'Rules', text: `Avoid the ${city} lane.`, source: `you (${picking.chosen.id})`, rule: { type: 'avoid_dest', value: city } })
      } else if (chip === 'broker' && rejected) {
        mem = newMemory({ category: 'Rules', text: `Never book ${rejected.broker} on reefer.`, source: `you (${picking.chosen.id})`, rule: { type: 'block_broker', value: rejected.broker } })
      }
    }

    // always log the booking itself as a Past Load
    const booking = newMemory({
      category: 'Past Loads',
      text: `Booked ${picking.chosen.id} ${picking.chosen.origin.split(',')[0]} → ${picking.chosen.dest.split(',')[0]} @ $${picking.chosen.ratePerMi.toFixed(2)}/mi (${picking.chosen.broker}).`,
      source: `you (${picking.chosen.id})`,
    })

    const toStore = [mem, booking].filter(Boolean) as Memory[]
    for (const m of toStore) await provider.store(m)

    const nextMemories = [...memories, ...toStore]
    const flashId = mem ? mem.id : booking.id

    // re-rank the hunt against the new memory
    const result = runHunt(MOCK_LOADS, nextMemories, 2)

    set((s) => ({
      memories: nextMemories,
      picking: null,
      result,
      steps: buildSteps(nextMemories, result),
      huntPhase: 'thinking',
      runId: s.runId + 1,
      flashMemoryId: flashId,
      toast: mem ? `everteam learned: ${mem.text}` : `Booked ${picking.chosen.id}.`,
      messages: [
        ...s.messages,
        {
          id: mid('a'),
          sender: 'eve',
          ts: Date.now(),
          text: mem
            ? `Booked ${picking.chosen.id}. And noted — ${mem.text} Re-ranking your board now.`
            : `Booked ${picking.chosen.id}. Nice run.`,
        },
      ],
    }))

    setTimeout(() => set({ flashMemoryId: null }), 2600)
  },

  closeWorking: () => set({ workingOpen: false, huntPhase: 'idle', picking: null }),
  dismissToast: () => set({ toast: null }),
}))
