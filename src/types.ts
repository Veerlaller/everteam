// Core domain types for everteam.

export type AgentId = 'eve' | 'dispatch' | 'fuel' | 'broker' | 'compliance'

export type Sender = AgentId | 'user'

export interface ChatMessage {
  id: string
  sender: Sender
  text: string
  ts: number
  /** transient: a system/working note rendered differently */
  kind?: 'text' | 'note'
}

export type MemoryCategory = 'Profile' | 'Rules' | 'Past Loads' | 'Recommendations'

/**
 * A structured rule lets scoring act on stored memory deterministically
 * (the "computed from stored data, not hardcoded" requirement). Free-text
 * memories simply omit `rule`.
 */
export type Rule =
  | { type: 'min_rate'; value: number } // $/mi floor on reefer
  | { type: 'block_broker'; value: string } // never book this broker
  | { type: 'home_by'; value: Weekday } // driver must be home by this day
  | { type: 'max_deadhead'; value: number } // miles
  | { type: 'no_east_of'; value: number } // exclude dest east of this longitude
  | { type: 'truck_regional'; value: string } // a truck restricted to regional runs
  | { type: 'avoid_dest'; value: string } // exclude loads to this destination (bad lane)

export type Weekday = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun'

export interface Memory {
  id: string
  category: MemoryCategory
  text: string
  source: string // e.g. "seed", "Eve", "you (load #C-104)"
  locked?: boolean // seed facts that can't be removed
  createdAt: number
  rule?: Rule
}

export interface GeoPoint {
  lat: number
  lng: number
}

export interface Load {
  id: string
  origin: string
  originCoord: GeoPoint
  dest: string
  destCoord: GeoPoint
  miles: number
  deadheadMi: number
  equipment: 'Reefer'
  broker: string
  rateTotal: number
  /** estimated day the driver gets back home for this run */
  estReturnDay: Weekday
  /** which truck the load would be assigned to (for the Truck #3 rule) */
  truck?: string
  commodity: string
}

/** A load after scoring against the active memory rules. */
export interface ScoredLoad extends Load {
  ratePerMi: number
  estFuel: number
  netTotal: number
  netPerMi: number
  score: number
  violations: ScoreViolation[]
  eligible: boolean
  why: string
}

export interface ScoreViolation {
  ruleType: Rule['type']
  label: string
}

export type ProviderName = 'everme' | 'everos' | 'local'
