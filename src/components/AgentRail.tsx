import { motion } from 'framer-motion'
import { AGENTS, AGENT_ORDER } from '../lib/agents'
import { CARRIER } from '../data/carrier'
import { useStore } from '../state/store'
import type { AgentId } from '../types'

function Avatar({ id, active }: { id: AgentId; active: boolean }) {
  const a = AGENTS[id]
  return (
    <div
      className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-semibold"
      style={{
        background: `hsl(${a.hue} 40% 14%)`,
        color: `hsl(${a.hue} 80% 70%)`,
        boxShadow: active ? `0 0 0 1.5px hsl(${a.hue} 80% 55%)` : `inset 0 0 0 1px hsl(${a.hue} 30% 24%)`,
      }}
    >
      {a.initials}
      <span
        className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-panel ${id === 'eve' ? 'bg-good status-live' : 'bg-faint'}`}
      />
    </div>
  )
}

export function AgentRail() {
  const activeAgent = useStore((s) => s.activeAgent)
  const setAgent = useStore((s) => s.setAgent)

  return (
    <aside className="flex w-[244px] shrink-0 flex-col border-r border-line bg-ink-2/70">
      <div className="px-4 pb-3 pt-4">
        <p className="text-[11px] uppercase tracking-widest text-faint">Your team</p>
      </div>
      <nav className="flex flex-col gap-1 px-2.5">
        {AGENT_ORDER.map((id) => {
          const a = AGENTS[id]
          const active = id === activeAgent
          return (
            <button
              key={id}
              onClick={() => setAgent(id)}
              className={`group relative flex items-start gap-3 rounded-xl px-2.5 py-2.5 text-left transition-colors ${
                active ? 'bg-panel-2' : 'hover:bg-panel/60'
              }`}
            >
              {active && (
                <motion.span
                  layoutId="agent-active"
                  className="absolute left-0 top-1/2 h-7 w-[3px] -translate-y-1/2 rounded-full bg-amber"
                />
              )}
              <Avatar id={id} active={active} />
              <div className="min-w-0 pt-0.5">
                <div className="flex items-center gap-1.5">
                  <span className={`text-sm font-semibold ${active ? 'text-text' : 'text-muted'}`}>{a.name}</span>
                </div>
                <p className="truncate text-[11px] text-faint">{a.role}</p>
              </div>
            </button>
          )
        })}
      </nav>

      <div className="mt-auto border-t border-line p-3.5">
        <div className="rounded-xl border border-line bg-panel/60 p-3">
          <p className="text-xs font-semibold text-text">{CARRIER.name}</p>
          <p className="mt-0.5 text-[11px] text-faint">{CARRIER.base} · {CARRIER.type}</p>
          <p className="mt-2 text-[11px] text-muted">{CARRIER.fleet}</p>
        </div>
      </div>
    </aside>
  )
}
