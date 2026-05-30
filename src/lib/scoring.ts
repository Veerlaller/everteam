import { CARRIER } from '../data/carrier'
import type { Load, Memory, Rule, ScoreViolation, ScoredLoad, Weekday } from '../types'

const WEEK: Weekday[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const dayIndex = (d: Weekday) => WEEK.indexOf(d)

/** Pull the structured rules out of the current memory set. */
export function activeRules(memories: Memory[]): Rule[] {
  return memories.filter((m) => m.rule).map((m) => m.rule!) as Rule[]
}

function violationsFor(load: Load, rules: Rule[]): ScoreViolation[] {
  const v: ScoreViolation[] = []
  const ratePerMi = load.rateTotal / load.miles

  for (const r of rules) {
    switch (r.type) {
      case 'min_rate':
        if (ratePerMi < r.value)
          v.push({ ruleType: r.type, label: `$${ratePerMi.toFixed(2)}/mi under your $${r.value.toFixed(2)} floor` })
        break
      case 'block_broker':
        if (load.broker.toLowerCase() === r.value.toLowerCase())
          v.push({ ruleType: r.type, label: `${r.value} — you don't run them on reefer` })
        break
      case 'home_by':
        if (dayIndex(load.estReturnDay) > dayIndex(r.value))
          v.push({ ruleType: r.type, label: `gets back ${load.estReturnDay}, past ${r.value}` })
        break
      case 'max_deadhead':
        if (load.deadheadMi > r.value)
          v.push({ ruleType: r.type, label: `${load.deadheadMi}mi deadhead over your ${r.value}mi cap` })
        break
      case 'no_east_of':
        if (load.destCoord.lng > r.value)
          v.push({ ruleType: r.type, label: `${load.dest} is east of your line` })
        break
      case 'truck_regional':
        if (load.truck === r.value && load.miles > 350)
          v.push({ ruleType: r.type, label: `Truck ${r.value} on a ${load.miles}mi run (regional only)` })
        break
      case 'avoid_dest':
        if (load.dest.toLowerCase().includes(r.value.toLowerCase()))
          v.push({ ruleType: r.type, label: `${load.dest} — a lane you've flagged` })
        break
    }
  }
  return v
}

function whyLine(load: ScoredLoad): string {
  if (load.deadheadMi >= load.miles * 0.6)
    return `Top net $/mi, but ${load.deadheadMi}mi deadhead eats your day — watch that.`
  if (load.netPerMi >= 2.1) return `Strong net $/mi after fuel + deadhead, home ${load.estReturnDay}.`
  if (load.miles <= 250) return `Tight regional run, ${load.broker}, back by ${load.estReturnDay}.`
  return `Clears your rules; net $${load.netPerMi.toFixed(2)}/mi, home ${load.estReturnDay}.`
}

export function scoreLoad(load: Load, rules: Rule[]): ScoredLoad {
  const ratePerMi = load.rateTotal / load.miles
  const estFuel = CARRIER.fuelPerMi * (load.miles + load.deadheadMi)
  const netTotal = load.rateTotal - estFuel
  const netPerMi = netTotal / load.miles
  const violations = violationsFor(load, rules)
  const scored: ScoredLoad = {
    ...load,
    ratePerMi,
    estFuel,
    netTotal,
    netPerMi,
    score: netPerMi,
    violations,
    eligible: violations.length === 0,
    why: '',
  }
  scored.why = whyLine(scored)
  return scored
}

export interface HuntResult {
  all: ScoredLoad[] // every load, scored, sorted (eligible first then by net)
  eligible: ScoredLoad[] // passes all rules, ranked by net $/mi
  ranked: ScoredLoad[] // top picks (the 2 cards)
  removedByRule: number
}

export function runHunt(loads: Load[], memories: Memory[], topN = 2): HuntResult {
  const rules = activeRules(memories)
  const scored = loads.map((l) => scoreLoad(l, rules))
  const eligible = scored
    .filter((s) => s.eligible)
    .sort((a, b) => b.netPerMi - a.netPerMi)
  const all = [...scored].sort((a, b) => {
    if (a.eligible !== b.eligible) return a.eligible ? -1 : 1
    return b.netPerMi - a.netPerMi
  })
  return {
    all,
    eligible,
    ranked: eligible.slice(0, topN),
    removedByRule: scored.length - eligible.length,
  }
}
