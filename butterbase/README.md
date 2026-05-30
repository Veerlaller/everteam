# everteam — Butterbase backend

This is the official submission backend + the thing the frontend calls in Phase 2.

## What's here

- **`schema.sql`** — Postgres schema: `carrier_profile`, `memories`, `loads`, `hunt_decisions` (+ carrier seed).
- **`functions/eve.ts`** — the `eve` edge function: the real agent brain. Receives the chat message + active agent, builds a system prompt from the carrier profile + recalled memories, calls **Gemini**, extracts any new preference, persists it, and returns `{ text, newMemory }`.

## Deploy (via the Butterbase MCP)

1. **Connect the Butterbase MCP in Claude Code.** (Required — it's how this gets created/deployed and is the submission artifact.)
2. Create a Butterbase app; record its `app_id` + API base URL into `.env.local` (`VITE_BUTTERBASE_BASE_URL`, `VITE_BUTTERBASE_APP_ID`) and `CLAUDE.md`.
3. Run `schema.sql` against the app's Postgres.
4. Deploy `functions/eve.ts` as an edge function named **`eve`**.
5. Set the function secret **`GEMINI_API_KEY`** (free key from https://aistudio.google.com/apikey) and optionally `GEMINI_MODEL` (default `gemini-flash-latest`).
6. The frontend's `GeminiBrain` already calls `POST {VITE_BUTTERBASE_BASE_URL}/eve`. Once deployed, the badge flips from `agents: mock` to `agents: Gemini`.

## Wiring memory to Postgres

`runEve(payload, env)` accepts optional `storeMemory` / `loadMemories` callbacks. Bind them to the `memories` table so the edge function persists learned rules server-side (the local Postgres `MemoryProvider`). Until then, the frontend sends its memories in the request and persists via its own provider — the loop still works end to end.

## $0 guarantee

Free Gemini (Google AI Studio) + free Butterbase tier. No paid keys, ever.
