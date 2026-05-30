// everteam — Butterbase edge function `eve` (Phase 2 brain).
//
// Receives { agent, message, memories } from the frontend, builds a system
// prompt from the carrier profile + recalled memories, calls Gemini, extracts
// any new preference, persists it, and returns { text, newMemory }.
//
// SECRETS: GEMINI_API_KEY stays here (edge env), never in the frontend, never
// committed. Set it in the Butterbase function environment.
//
// This is written portably — `runEve` is host-agnostic. The default export is a
// Deno/Web-style fetch handler; adapt the wrapper to Butterbase's exact handler
// signature if it differs (the core logic is unchanged).

type AgentId = 'eve' | 'dispatch' | 'fuel' | 'broker' | 'compliance'

interface IncomingMemory {
  id: string
  category: string
  text: string
  source: string
  rule?: unknown
}

interface EvePayload {
  agent: AgentId
  message: string
  memories?: IncomingMemory[]
}

interface EveEnv {
  GEMINI_API_KEY: string
  GEMINI_MODEL?: string
  // Optional: a function to persist a memory row (wire to Butterbase Postgres).
  storeMemory?: (m: Record<string, unknown>) => Promise<void>
  // Optional: load memories from Postgres when the client doesn't send them.
  loadMemories?: () => Promise<IncomingMemory[]>
}

const PERSONAS: Record<AgentId, string> = {
  eve: 'You are Eve, a sharp, concise executive assistant for a small Fresno reefer carrier. You delegate detail to Dispatch, Fuel, Broker, and Compliance.',
  dispatch: 'You are Dispatch for a Fresno reefer carrier. You match loads to trucks, minimize deadhead, protect home-by-Friday.',
  fuel: 'You are the Fuel & efficiency agent. You estimate fuel at ~$0.55/mi incl. deadhead, compute net $/mi, and remember Truck #3 has a DEF sensor issue (regional only).',
  broker: 'You are the Broker relations agent. You track brokers (never Coyote on reefer), payment speed, and credit.',
  compliance: 'You are the Compliance agent. You guard hours-of-service, home-by-Friday, and reefer temperature compliance.',
}

const CARRIER_CONTEXT =
  'Carrier: Valle Verde Trucking — Fresno, CA reefer, owner-operator, 4 Freightliner Cascadia sleepers.'

function buildSystemPrompt(agent: AgentId, memories: IncomingMemory[]): string {
  const memLines = memories.map((m) => `- [${m.category}] ${m.text}`).join('\n')
  return [
    PERSONAS[agent] ?? PERSONAS.eve,
    CARRIER_CONTEXT,
    'You share ONE memory with the whole team. Here is what everteam currently remembers:',
    memLines || '(no memories yet)',
    '',
    'Be direct, use trucking shorthand, never waste the operator\'s time.',
    'If the operator states a new preference/rule (a rate floor, a broker to avoid, a lane/region to skip, a deadhead cap, a home-by day, etc.), capture it.',
    '',
    'Respond ONLY as strict JSON matching:',
    '{ "reply": string, "memory": null | { "category": "Rules"|"Past Loads", "text": string, "rule": null | object } }',
    'Where rule (when present) is one of:',
    '{"type":"min_rate","value":number} | {"type":"block_broker","value":string} | {"type":"home_by","value":"Mon|Tue|Wed|Thu|Fri|Sat|Sun"} | {"type":"max_deadhead","value":number} | {"type":"no_east_of","value":number} | {"type":"avoid_dest","value":string}',
    'Set memory to null when the message contains no new durable preference.',
  ].join('\n')
}

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models'

export async function runEve(payload: EvePayload, env: EveEnv): Promise<{ text: string; newMemory: unknown | null }> {
  const memories = payload.memories ?? (env.loadMemories ? await env.loadMemories() : [])
  const model = env.GEMINI_MODEL ?? 'gemini-flash-latest'
  const system = buildSystemPrompt(payload.agent, memories)

  const res = await fetch(`${GEMINI_BASE}/${model}:generateContent?key=${env.GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: 'user', parts: [{ text: payload.message }] }],
      generationConfig: { responseMimeType: 'application/json', temperature: 0.4 },
    }),
  })

  if (!res.ok) throw new Error(`Gemini ${res.status}: ${await res.text()}`)
  const data = await res.json()
  const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}'

  let parsed: { reply?: string; memory?: { category: string; text: string; rule?: unknown } | null }
  try {
    parsed = JSON.parse(raw)
  } catch {
    parsed = { reply: raw, memory: null }
  }

  let newMemory: Record<string, unknown> | null = null
  if (parsed.memory && parsed.memory.text) {
    newMemory = {
      id: `m-${Date.now()}`,
      category: parsed.memory.category || 'Rules',
      text: parsed.memory.text,
      source: payload.agent,
      rule: parsed.memory.rule ?? null,
      createdAt: Date.now(),
    }
    if (env.storeMemory) await env.storeMemory(newMemory)
  }

  return { text: parsed.reply ?? 'Got it.', newMemory }
}

// --- Deno / Web fetch handler wrapper (adapt to Butterbase's signature) ---
export default async function handler(req: Request): Promise<Response> {
  const cors = {
    'access-control-allow-origin': '*',
    'access-control-allow-headers': 'content-type',
    'access-control-allow-methods': 'POST, OPTIONS',
  }
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors })
  try {
    const payload = (await req.json()) as EvePayload
    // In Butterbase, read GEMINI_API_KEY from the function's env and pass a
    // storeMemory/loadMemories bound to the Postgres `memories` table.
    const env: EveEnv = {
      // @ts-expect-error host-provided env (Deno.env / Butterbase secrets)
      GEMINI_API_KEY: (globalThis.Deno?.env?.get?.('GEMINI_API_KEY')) ?? '',
      // @ts-expect-error host-provided env
      GEMINI_MODEL: (globalThis.Deno?.env?.get?.('GEMINI_MODEL')) ?? undefined,
    }
    const out = await runEve(payload, env)
    return new Response(JSON.stringify(out), { headers: { ...cors, 'content-type': 'application/json' } })
  } catch (e) {
    return new Response(JSON.stringify({ text: `eve error: ${String(e)}`, newMemory: null }), {
      status: 500,
      headers: { ...cors, 'content-type': 'application/json' },
    })
  }
}
