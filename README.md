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
   │
   ├─ MemoryProvider   → EverMe (hosted) → EverOS (self-hosted) → local (browser)
   │                     identical behavior; active provider shown as a badge
   │
   └─ Agent brain      → Gemini (via Butterbase edge fn) → mock (graceful fallback)
```

Two clean seams flip the app from "mock" to "real":

- **`src/lib/memory/`** — the `MemoryProvider` interface + EverMe / EverOS / local implementations and the fallback resolver.
- **`src/lib/brain/`** — the agent brain; `GeminiBrain` calls the Butterbase `eve` edge function and degrades to `MockBrain` on any failure.

Scoring lives in **`src/lib/scoring.ts`** and is computed from the *stored* rules — not hardcoded — so a freshly-learned preference re-ranks the next hunt.

## Run it

```bash
npm install
npm run dev          # http://localhost:5173
```

It runs with **zero config** on the local memory provider (real persistence via `localStorage`). To go fully live, copy `.env.example` → `.env.local` and fill in:

- `VITE_BUTTERBASE_BASE_URL` — your Butterbase app (the deployed backend the frontend calls)
- `VITE_EVERME_TOKEN` — an EverMind key from [console.evermind.ai](https://console.evermind.ai) (base defaults to `https://api.evermind.ai`)

The **Gemini key stays server-side** in the Butterbase `eve` edge function — never in the frontend, never committed.

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
- ✅ Phase 1 — Load Hunt experience with real scoring + local persistence (store → recall → re-rank works now)
- 🔧 Phase 2 — wire Butterbase edge fn + Gemini + EverMe (seams in place; see `CLAUDE.md`)
