import { AGENTS } from '../agents'
import { activeRules } from '../scoring'
import type { Rule } from '../../types'
import type { Brain, BrainInput, BrainOutput } from './index'
import { extractRule, newMemory } from './extract'

const ruleSummary = (rules: Rule[]): string => {
  const parts: string[] = []
  for (const r of rules) {
    if (r.type === 'min_rate') parts.push(`$${r.value.toFixed(2)}/mi floor`)
    else if (r.type === 'block_broker') parts.push(`no ${r.value}`)
    else if (r.type === 'home_by') parts.push(`home by ${r.value}`)
    else if (r.type === 'max_deadhead') parts.push(`≤${r.value}mi deadhead`)
    else if (r.type === 'no_east_of') parts.push('nothing east of your line')
    else if (r.type === 'truck_regional') parts.push(`Truck ${r.value} regional`)
    else if (r.type === 'avoid_dest') parts.push(`avoid ${r.value}`)
  }
  return parts.join(' · ')
}

/**
 * Deterministic, memory-aware stand-in for Gemini. Reads the same stored
 * memories the live brain will, extracts new rules, and answers in persona.
 */
export class MockBrain implements Brain {
  readonly name = 'mock' as const

  async chat({ agent, userText, memories, lastHunt }: BrainInput): Promise<BrainOutput> {
    const persona = AGENTS[agent]
    const rules = activeRules(memories)
    const extracted = extractRule(userText)

    if (extracted) {
      const mem = newMemory({
        category: extracted.category,
        text: extracted.text,
        source: persona.name,
        rule: extracted.rule,
      })
      return {
        text: `Got it — locking that in: "${extracted.text}" I'll re-rank every hunt against it from here on.`,
        newMemory: mem,
      }
    }

    const t = userText.toLowerCase()

    if (/best|top|recommend|which load/.test(t) && lastHunt?.ranked.length) {
      const top = lastHunt.ranked[0]
      return {
        text: `${top.id} ${top.origin.split(',')[0]} → ${top.dest.split(',')[0]} — net $${top.netPerMi.toFixed(2)}/mi, home ${top.estReturnDay}. ${top.why}`,
      }
    }

    if (/rule|preference|remember|know about/.test(t)) {
      return { text: `Here's what I'm holding for you: ${ruleSummary(rules) || 'no rules yet'}. Tell me a new one and I'll apply it.` }
    }

    if (agent === 'fuel' && /truck\s*#?3|def/.test(t)) {
      return { text: `Truck #3's DEF sensor is still flaky — I'm keeping it on regional runs only. Anything over ~350mi I route to #1, #2, or #4.` }
    }

    if (agent === 'broker' && /coyote/.test(t)) {
      return { text: `Coyote's a hard no on reefer for us — claims hassle last time. I filter them out before you ever see the board.` }
    }

    if (agent === 'compliance' && /friday|home|hos|hours/.test(t)) {
      return { text: `Home-by-Friday is sacred. I drop any load whose return slips to Saturday or later before it reaches your hunt.` }
    }

    // generic persona reply, grounded in what we remember
    return {
      text: `${persona.name} here. I've got your operation memorized — ${ruleSummary(rules) || 'just the basics so far'}. Ask me to find a load, or tell me a new rule and I'll remember it.`,
    }
  }
}
