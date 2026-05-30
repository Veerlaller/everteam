import type { Memory } from '../types'

export const CARRIER = {
  name: 'Valle Verde Trucking',
  base: 'Fresno, CA',
  type: 'Reefer carrier',
  fleet: '4 Freightliner Cascadia sleepers',
  role: 'Owner-operator',
  fuelPerMi: 0.55, // est fuel cost assumption used in rate math
}

let n = 0
const id = () => `seed-${++n}`

/** Seed memories. Rules carry a structured `rule` so scoring acts on stored data. */
export const SEED_MEMORIES: Memory[] = [
  // --- Profile ---
  {
    id: id(),
    category: 'Profile',
    text: 'Fresno, CA reefer carrier — owner-operator.',
    source: 'seed',
    locked: true,
    createdAt: 0,
  },
  {
    id: id(),
    category: 'Profile',
    text: '4 Freightliner Cascadia sleepers in the fleet.',
    source: 'seed',
    locked: true,
    createdAt: 0,
  },
  // --- Rules (structured) ---
  {
    id: id(),
    category: 'Rules',
    text: 'Minimum $2.00/mi on reefer.',
    source: 'seed',
    locked: true,
    createdAt: 0,
    rule: { type: 'min_rate', value: 2.0 },
  },
  {
    id: id(),
    category: 'Rules',
    text: 'Never book Coyote on reefer (claims hassle).',
    source: 'seed',
    locked: true,
    createdAt: 0,
    rule: { type: 'block_broker', value: 'Coyote' },
  },
  {
    id: id(),
    category: 'Rules',
    text: 'Driver must be home by Friday.',
    source: 'seed',
    locked: true,
    createdAt: 0,
    rule: { type: 'home_by', value: 'Fri' },
  },
  {
    id: id(),
    category: 'Rules',
    text: 'Truck #3 has a DEF sensor issue — keep it on regional runs.',
    source: 'seed',
    locked: true,
    createdAt: 0,
    rule: { type: 'truck_regional', value: '#3' },
  },
  // --- Past Loads ---
  {
    id: id(),
    category: 'Past Loads',
    text: 'Booked Fresno → LA reefer @ $2.75/mi (RXO). On time, paid in 9 days.',
    source: 'seed',
    createdAt: 0,
  },
]
