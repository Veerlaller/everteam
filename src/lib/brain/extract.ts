import type { Memory, MemoryCategory, Rule, Weekday } from '../../types'

// Longitudes for the "east/west of <city>" rule.
const CITY_LNG: Record<string, number> = {
  denver: -104.99,
  dallas: -96.8,
  phoenix: -112.07,
  reno: -119.81,
  vegas: -115.14,
  'las vegas': -115.14,
  'salt lake': -111.89,
  'salt lake city': -111.89,
  amarillo: -101.83,
}

const DAYS: Record<string, Weekday> = {
  monday: 'Mon',
  tuesday: 'Tue',
  wednesday: 'Wed',
  thursday: 'Thu',
  friday: 'Fri',
  saturday: 'Sat',
  sunday: 'Sun',
}

const KNOWN_BROKERS = ['coyote', 'tql', 'echo', 'rxo', 'arrive', 'uber freight', 'ch robinson']

export interface Extracted {
  rule: Rule
  category: MemoryCategory
  text: string
}

/** Heuristic extraction of a structured preference from free text. */
export function extractRule(input: string): Extracted | null {
  const t = input.toLowerCase()

  // east/west of <city>
  const eastM = t.match(/(?:east|past|beyond)\s+of\s+([a-z ]+?)(?:\s+anymore|\.|,|$)/)
  if (eastM) {
    const city = eastM[1].trim()
    const lng = CITY_LNG[city]
    if (lng !== undefined)
      return {
        rule: { type: 'no_east_of', value: lng },
        category: 'Rules',
        text: `No loads east of ${city.replace(/\b\w/g, (c) => c.toUpperCase())}.`,
      }
  }

  // minimum rate $X/mi
  const rateM = t.match(/(?:minimum|floor|at least|need|want|won'?t.*under)\D*(\d+(?:\.\d+)?)\s*(?:\/|per\s*)?\s*mi/)
  if (rateM) {
    const value = parseFloat(rateM[1])
    if (value > 0 && value < 10)
      return {
        rule: { type: 'min_rate', value },
        category: 'Rules',
        text: `Minimum $${value.toFixed(2)}/mi on reefer.`,
      }
  }

  // deadhead cap
  const dhM = t.match(/(?:no more than|max|cap|under|over)\D*(\d{2,3})\s*(?:mi|miles)?\s*(?:of\s+)?deadhead/)
  if (dhM) {
    const value = parseInt(dhM[1], 10)
    return {
      rule: { type: 'max_deadhead', value },
      category: 'Rules',
      text: `No more than ${value}mi deadhead.`,
    }
  }

  // never/stop a broker
  for (const b of KNOWN_BROKERS) {
    if (new RegExp(`(?:never|stop|no more|don'?t|drop)\\b.*\\b${b}`).test(t) || new RegExp(`${b}\\b.*(?:no good|hassle|never again|drop)`).test(t)) {
      const name = b.replace(/\b\w/g, (c) => c.toUpperCase())
      return {
        rule: { type: 'block_broker', value: name },
        category: 'Rules',
        text: `Never book ${name} on reefer.`,
      }
    }
  }

  // home by <day>
  const dayM = t.match(/home\s+by\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/)
  if (dayM) {
    const day = DAYS[dayM[1]]
    return {
      rule: { type: 'home_by', value: day },
      category: 'Rules',
      text: `Driver must be home by ${day}.`,
    }
  }

  return null
}

let counter = 0
export function newMemory(partial: Omit<Memory, 'id' | 'createdAt'>): Memory {
  return {
    ...partial,
    id: `m-${Date.now()}-${counter++}`,
    createdAt: Date.now(),
  }
}
