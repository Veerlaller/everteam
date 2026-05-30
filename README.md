# everteam 🚛🧠

**"EverMe for trucking."** A memory-powered AI back-office for small reefer carriers, built for the **EverMind** hackathon. A small team of named AI agents — led by exec assistant **Eve** — that *remembers* a carrier's operation and *learns from the operator's decisions.*

> Ask Eve to find a load → watch it reason over the board against your rules → pick one and say why → everteam writes a new memory → the next hunt re-ranks because of it.

## Why it's different

Most "AI load board" demos rank by rate. everteam ranks by **net $/mi after deadhead + fuel**, then filters against the carrier's **stored memory** — and when you tell it *why* you passed on a load, it remembers and re-ranks every future hunt. The store → recall → re-rank loop is the product.

## The team

| Agent | Role |
|---|---|
| **Eve** | Executive assistant — knows the operation, delegates |
| **Dispatch** | Load matching, deadhead, timing |
| **Fuel** | Cost/efficiency, the Truck #3 DEF issue |
| **Broker** | Relationships, credit, the no-Coyote rule |
| **Compliance** | HOS + the home-by-Friday promise |

All agents share **one memory.**

## Architecture

```
Frontend (React + Vite + TS + Tailwind + Framer Motion)
   │  (calls same-origin /eve and /memory/* — no secrets in the browser)
   ▼
Server bridge  (Vite dev plugin server/eve-bridge.ts, or Butterbase edge fn)
   ├─ /eve         → Google Gemini        (GEMINI_API_KEY, server-side)
   └─ /memory/*    → EverMind Cloud        (EVERMIND_TOKEN, server-side)

MemoryProvider resolves: EverMind (hosted, via bridge) → EverOS → local
Agent brain resolves:    Gemini (via bridge) → mock (graceful fallback)
Active provider + brain shown as live badges in the header.
```

**Why the bridge:** the browser can't call `api.evermind.ai` directly (CORS), and putting the token in a `VITE_` var would ship it in the bundle. The same-origin bridge solves both — it holds `GEMINI_API_KEY` and `EVERMIND_TOKEN` server-side and proxies. Verified live: `/memory/health` → `{ok:true}`, `/memory/store` → EverMind `202 + task_id`, `/eve` → Gemini extracts a structured rule from plain English.

Two clean seams flip the app from "mock" to "real":

- **`src/lib/memory/`** — the `MemoryProvider` interface + EverMe / EverOS / local implementations and the fallback resolver.
- **`src/lib/brain/`** — the agent brain; `GeminiBrain` calls the Butterbase `eve` edge function and degrades to `MockBrain` on any failure.

Scoring lives in **`src/lib/scoring.ts`** and is computed from the *stored* rules — not hardcoded — so a freshly-learned preference re-ranks the next hunt.

## Run it

```bash
npm install
npm run dev          # http://localhost:5173
```

It runs with **zero config** on the local memory provider (real persistence via `localStorage`). To go fully live, copy `.env.example` → `.env.local` and fill in (all **server-side**, no `VITE_` prefix → never bundled):

- `GEMINI_API_KEY` — free key from [aistudio.google.com/apikey](https://aistudio.google.com/apikey) → agents reply via Gemini
- `EVERMIND_TOKEN` — key from [everos.evermind.ai](https://everos.evermind.ai) → memory runs on EverMind (badge flips to **EverMe**)

The Vite dev plugin reads these and serves `/eve` + `/memory/*`. For production, deploy `butterbase/` (same `/eve` contract).

```bash
npm run test   # deterministic scoring checks — proves rules bite + a learned rule re-ranks
```

## Acceptance test (the loop, live)

1. Tell Eve a new rule in chat (e.g. *"I won't run anything east of Denver anymore"*).
2. It's extracted + stored; a card animates into the Harness.
3. Run a Load Hunt — the new rule **visibly changes** the ranking.
4. **Reload the page** — the rule persists.
5. Open **Dispatch** and ask about loads — same shared memory.

## Stack

React 19 · Vite · TypeScript · Tailwind CSS v4 · Framer Motion · Zustand · Gemini (free tier) · Butterbase · EverMind. **$0 — no paid keys.**

## Status

- ✅ Phase 0 — scaffold, guardrails, polished shell
- ✅ Phase 1 — Load Hunt experience with real scoring + persistence
- ✅ Phase 2 — **LIVE**: agents reply via **Google Gemini** (key server-side), memory runs on **EverMind** (`api.evermind.ai`, hosted). All 5 acceptance-test steps verified end-to-end (rule stated in chat → Gemini extracts it → stored → hunt re-ranks → persists across reload → Dispatch respects the same shared memory).

### Acceptance test — verified live ✅
1. ✅ Told Eve *"I won't run anything east of Denver anymore"* → Gemini extracted `{no_east_of: -104.99}`
2. ✅ Stored to EverMind (`202 queued`, real `request_id`) + mirrored locally; card animated into the Harness
3. ✅ Re-ran the hunt → *"Dropping anything east of your line — cut 1"*, Amarillo dropped, board re-ranked
4. ✅ Reloaded → rule persisted, badges still **EverMe + Gemini**
5. ✅ Asked **Dispatch**: *"Dallas is east of Denver, so that's a no-go per your rule"* — same shared memory

> The Gemini key is read server-side by the Vite dev bridge (`server/eve-bridge.ts`) or the Butterbase `eve` edge function — never shipped in the browser bundle.
