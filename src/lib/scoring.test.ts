/**
 * Deterministic checks for the scoring core — the heart of the "learns this
 * carrier's preferences" claim. Run with: npx tsx src/lib/scoring.test.ts
 * (zero deps; exits non-zero on failure).
 */
import { MOCK_LOADS } from '../data/loads'
import { SEED_MEMORIES } from '../data/carrier'
import { runHunt } from './scoring'
import type { Memory } from '../types'

let failures = 0
function assert(cond: boolean, msg: string) {
  if (cond) {
    console.log(`  ✓ ${msg}`)
  } else {
    console.error(`  ✗ ${msg}`)
    failures++
  }
}

const mem = (text: string, rule: Memory['rule']): Memory => ({
  id: `t-${Math.round(text.length)}-${rule?.type}`,
  category: 'Rules',
  text,
  source: 'test',
  createdAt: 1,
  rule,
})

console.log('Seed rules bite:')
const base = runHunt(MOCK_LOADS, SEED_MEMORIES, 2)
const baseIds = base.eligible.map((l) => l.id)
assert(!baseIds.includes('C-103'), 'sub-$2/mi load (C-103) is removed by min_rate floor')
assert(!baseIds.includes('C-104'), 'Coyote load (C-104) is removed by block_broker')
assert(!baseIds.includes('C-105'), 'Sunday-return load (C-105) is removed by home_by Friday')
assert(!baseIds.includes('C-109'), 'Truck #3 720mi run (C-109) is removed by truck_regional')
assert(base.eligible.length > 0, 'some loads still clear all seed rules')
assert(
  base.eligible.every((a, i) => i === 0 || base.eligible[i - 1].netPerMi >= a.netPerMi),
  'eligible loads are ranked by net $/mi descending',
)

console.log('\nLearned rule re-ranks (the acceptance-test payoff):')
const beforeTop = base.ranked.map((l) => l.id)
console.log(`  before: top picks = ${beforeTop.join(', ')}`)
// C-102 (Fresno→Amarillo, lng -101.83) clears the seed rules and is a top pick.
assert(beforeTop.includes('C-102'), 'C-102 (Amarillo) is a top pick BEFORE the Denver rule')

const denver = mem('No loads east of Denver.', { type: 'no_east_of', value: -104.99 })
const after = runHunt(MOCK_LOADS, [...SEED_MEMORIES, denver], 2)
const afterIds = after.eligible.map((l) => l.id)
const afterTop = after.ranked.map((l) => l.id)
console.log(`  after:  top picks = ${afterTop.join(', ')}`)
assert(!afterIds.includes('C-102'), 'C-102 (Amarillo, east of Denver) is CUT after the rule')
assert(!afterTop.includes('C-102'), 'C-102 no longer appears in the top picks')
assert(after.removedByRule > base.removedByRule, 'the new rule removes at least one more load')

console.log('\nLearned deadhead cap re-ranks:')
const dh = mem('No more than 120mi deadhead.', { type: 'max_deadhead', value: 120 })
const afterDh = runHunt(MOCK_LOADS, [...SEED_MEMORIES, dh], 2)
assert(
  !afterDh.eligible.some((l) => l.deadheadMi > 120),
  'no eligible load exceeds the 120mi deadhead cap',
)

console.log(`\n${failures === 0 ? '✅ all scoring checks passed' : `❌ ${failures} check(s) failed`}`)
process.exit(failures === 0 ? 0 : 1)
