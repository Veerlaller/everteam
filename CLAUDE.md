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
- Phase 0: scaffold + CLAUDE.md + polished mock shell — DONE.
- Phase 1: Load Hunt experience, mock-first, with REAL scoring logic + local (localStorage) MemoryProvider so persistence + re-rank already work — DONE.
- Phase 2: pending external connections — needs (a) Butterbase MCP connected, (b) GitHub auth for public repo, (c) Gemini key in a Butterbase edge function, (d) EverMe token (optional; falls back).
- Architecture is provider-swappable: `src/lib/memory/` (MemoryProvider) and `src/lib/agents/brain.ts` (mock vs Gemini) are the two seams to flip to "real".
