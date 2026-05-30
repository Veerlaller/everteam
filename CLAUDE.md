# everteam — Project Guardrails

## What this is
everteam = "EverMe for trucking." A memory-powered AI back-office for small trucking carriers, built for the EverMind hackathon. A small team of named agents led by exec assistant "Eve" that remembers the carrier's operation and learns from the operator's decisions. Deliverable = a recorded 2-min demo of a REAL working app; judges will not run it, but the repo must be submittable and the UI must screenshot well.

## Hard rules
- GOAL = a fully working end-to-end app (Phases 2-3): real frontend <-> Butterbase backend <-> working memory <-> Gemini agents. Phase 2 is REQUIRED.
- SAFETY FLOOR FIRST: public GitHub repo + Butterbase app/deploy + EverMind memory attempt + polished mock frontend by the end of Phase 1 (hard checkpoint), so there's always something submittable. Then keep going to make it real.
- $0 ONLY: free Gemini (Google AI Studio), free EverMe, free Butterbase. Never suggest paid keys or billing.
- MOCK-FIRST IS THE METHOD, NOT THE END: every feature renders with mock data, then gets wired to the real backend/memory/AI by end of Phase 2. Graceful runtime fallback so a failed live call degrades instead of crashing.
- DATA FLOW: frontend -> Butterbase edge function -> Gemini + MemoryProvider; preferences persist to Postgres and change future replies + load ranking. The store -> recall -> re-rank loop must work for real (see Acceptance Test).
- MEMORY via MemoryProvider, fallback order EverMe -> EverOS -> local (Butterbase Postgres). Identical behavior; log + show the active provider.
- Gemini key stays server-side (Butterbase edge function); never commit secrets (.env.local). Incremental commits. Ask before destructive changes.

## Stack
React + Vite + TS, Tailwind, Framer Motion. Gemini (free, current fast model). Butterbase (Postgres + edge fn, MCP-connected) = backend + submission + what the frontend calls. EverMind = memory. Public GitHub repo.

## Demo flow (must work on camera, for real)
Ask Eve for a load -> Working Panel (animated map + streaming reasoning + rate math) -> 2 ranked loads + "why" -> user picks / declines -> capture WHY -> write to memory -> re-hunt re-ranks. Agent rail: Eve, Dispatch, Fuel, Broker, Compliance (talk to any; shared memory).

## Acceptance test (the loop, live)
1) Tell Eve a new rule in chat. 2) It's extracted by Gemini + stored, card appears in Harness. 3) A hunt re-ranks because of it. 4) Reload -> rule persists. 5) Dispatch agent respects the same memory.

## Seed data
Carrier: Fresno CA reefer, ~4 Freightliner Cascadia sleepers, owner-operator.
Rules: min $2.00/mi reefer; never Coyote on reefer; home by Friday; Truck #3 DEF issue -> regional only.
Mock loads must make these rules visibly bite.

## Key facts / endpoints
EverMe: read https://everme.evermind.ai/SKILL.md ; sign in everme.evermind.ai.
EverOS fallback REST: POST /api/v1/memories {message_id, create_time, sender, content}; GET /api/v1/memories/search {query, user_id, memory_types, retrieve_method:"hybrid"}; server http://localhost:1995.
Butterbase app_id / base URL: <fill in during Phase 0>.

## Visual
Dark (#0B0D10) + amber (#F5A623), monospace numbers, EverMe-style memory file-tree, quick purposeful motion. No generic AI look.

## Build status (for future sessions)
- Phase 0: scaffold + CLAUDE.md + polished shell — DONE.
- Phase 1: Load Hunt with REAL scoring + local persistence — DONE.
- Phase 2: LIVE & verified end-to-end — DONE.
  - Agents = Google Gemini (model gemini-flash-latest). Key is SERVER-SIDE only: read by the Vite dev plugin `server/eve-bridge.ts` (and the Butterbase `eve` edge fn for prod). Frontend `GeminiBrain` POSTs `/eve`; falls back to MockBrain on failure.
  - Memory = EverMind Cloud (`https://api.evermind.ai`, Bearer auth). `src/lib/memory/EverMeProvider.ts` does real hosted store (`POST /api/v1/memories`, sender_id MUST equal user_id) + search (`POST /api/v1/memories/search`, body needs `filters:{user_id}`), and mirrors to localStorage so the scorer keeps typed rules. Resolver order EverMe → EverOS → local.
  - All 5 acceptance-test steps pass live (see README).
  - Keys live in `.env.local` (gitignored). Butterbase MCP is connected but `butterbase/` (schema + eve fn) is not deployed — local Gemini bridge serves the same `/eve` contract, so the app is fully live without it.
- Seams to flip providers: `src/lib/memory/` and `src/lib/brain/`.
