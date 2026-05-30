// everteam — local Gemini bridge (Vite dev plugin).
//
// Serves POST /eve on the dev origin using the SAME contract as the Butterbase
// `eve` edge function, so the agent brain is genuinely Gemini-powered locally
// without needing Butterbase deployed. The Gemini key is read from the Node
// process env (.env.local → GEMINI_API_KEY) and NEVER reaches the browser
// bundle — it stays server-side, exactly like the production edge function.
//
// Activates only when GEMINI_API_KEY is set. On any Gemini failure the frontend
// GeminiBrain degrades to its mock, so the UI never breaks.

import type { Plugin } from 'vite'

type AgentId = 'eve' | 'dispatch' | 'fuel' | 'broker' | 'compliance'

interface IncomingMemory {
  category: string
  text: string
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
    "Be direct, use trucking shorthand, never waste the operator's time.",
    'If the operator states a new durable preference/rule (a rate floor, a broker to avoid, a lane/region to skip, a deadhead cap, a home-by day), capture it.',
    '',
    'Respond ONLY as strict JSON: { "reply": string, "memory": null | { "category": "Rules"|"Past Loads", "text": string, "rule": null | object } }',
    'rule (when present) is one of: {"type":"min_rate","value":number} | {"type":"block_broker","value":string} | {"type":"home_by","value":"Mon|Tue|Wed|Thu|Fri|Sat|Sun"} | {"type":"max_deadhead","value":number} | {"type":"no_east_of","value":number} | {"type":"avoid_dest","value":string}',
    'Set memory to null when there is no new durable preference.',
  ].join('\n')
}

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models'

async function callGemini(
  payload: { agent: AgentId; message: string; memories?: IncomingMemory[] },
  apiKey: string,
  model: string,
): Promise<{ text: string; newMemory: unknown | null }> {
  const system = buildSystemPrompt(payload.agent, payload.memories ?? [])
  const res = await fetch(`${GEMINI_BASE}/${model}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: 'user', parts: [{ text: payload.message }] }],
      generationConfig: { responseMimeType: 'application/json', temperature: 0.4 },
    }),
  })
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${(await res.text()).slice(0, 200)}`)
  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[]
  }
  const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}'
  let parsed: { reply?: string; memory?: { category: string; text: string; rule?: unknown } | null } = {}
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
  }
  return { text: parsed.reply ?? 'Got it.', newMemory }
}

export function eveBridge(env: Record<string, string>): Plugin {
  const apiKey = env.GEMINI_API_KEY || process.env.GEMINI_API_KEY || ''
  const model = env.GEMINI_MODEL || process.env.GEMINI_MODEL || 'gemini-flash-latest'
  return {
    name: 'everteam-eve-bridge',
    configureServer(server) {
      server.middlewares.use('/eve', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405
          res.end('POST only')
          return
        }
        if (!apiKey) {
          res.statusCode = 503
          res.setHeader('content-type', 'application/json')
          res.end(JSON.stringify({ text: '', newMemory: null, error: 'no GEMINI_API_KEY' }))
          return
        }
        let body = ''
        req.on('data', (c) => (body += c))
        req.on('end', () => {
          void (async () => {
            try {
              const payload = JSON.parse(body || '{}')
              const out = await callGemini(payload, apiKey, model)
              res.setHeader('content-type', 'application/json')
              res.end(JSON.stringify(out))
            } catch (e) {
              res.statusCode = 500
              res.setHeader('content-type', 'application/json')
              res.end(JSON.stringify({ text: '', newMemory: null, error: String(e) }))
            }
          })()
        })
      })
      // eslint-disable-next-line no-console
      console.info(`[everteam] eve bridge: ${apiKey ? `ON (model ${model})` : 'OFF (set GEMINI_API_KEY in .env.local)'}`)
    },
  }
}
