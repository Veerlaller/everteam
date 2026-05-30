import { AnimatePresence, motion } from 'framer-motion'
import { useStore } from '../state/store'
import type { Memory, MemoryCategory } from '../types'

const ORDER: MemoryCategory[] = ['Profile', 'Rules', 'Past Loads', 'Recommendations']
const ICON: Record<MemoryCategory, string> = {
  Profile: '🏢',
  Rules: '⚖️',
  'Past Loads': '📦',
  Recommendations: '✨',
}

function MemoryRow({ m, flash }: { m: Memory; flash: boolean }) {
  return (
    <motion.li
      layout
      initial={{ opacity: 0, x: 18, height: 0 }}
      animate={{ opacity: 1, x: 0, height: 'auto' }}
      exit={{ opacity: 0, x: 18, height: 0 }}
      transition={{ duration: 0.28, ease: 'easeOut' }}
      className={`group relative ml-4 rounded-lg border px-3 py-2 ${
        flash ? 'glow-amber border-amber/50 bg-amber/5' : 'border-line/70 bg-panel/40'
      }`}
    >
      <p className="text-[12.5px] leading-snug text-text">{m.text}</p>
      <div className="mt-1 flex items-center gap-2">
        <span className="text-[10px] text-faint">{m.source}</span>
        {m.locked && <span className="text-[10px] text-faint">· 🔒 seed</span>}
        {m.rule && (
          <span className="rounded bg-amber/10 px-1.5 py-px text-[9px] font-medium uppercase tracking-wide text-amber-soft">
            rule
          </span>
        )}
      </div>
    </motion.li>
  )
}

export function HarnessPanel() {
  const memories = useStore((s) => s.memories)
  const flashId = useStore((s) => s.flashMemoryId)

  const grouped = ORDER.map((cat) => ({
    cat,
    items: memories.filter((m) => m.category === cat),
  }))

  return (
    <aside className="flex w-[360px] shrink-0 flex-col border-l border-line bg-ink-2/70">
      <div className="flex items-center justify-between border-b border-line px-4 py-3.5">
        <div>
          <h2 className="text-sm font-semibold text-text">The Harness</h2>
          <p className="text-[11px] text-faint">what everteam remembers</p>
        </div>
        <span className="num rounded-md border border-line bg-panel px-2 py-1 text-[11px] text-muted">
          {memories.length}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3">
        {grouped.map(({ cat, items }) => (
          <div key={cat} className="mb-4 last:mb-1">
            <div className="mb-1.5 flex items-center gap-2 px-1">
              <span className="text-sm">{ICON[cat]}</span>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">{cat}</span>
              <span className="num text-[10px] text-faint">{items.length}</span>
              <span className="ml-1 h-px flex-1 bg-line/60" />
            </div>
            <ul className="flex flex-col gap-1.5">
              <AnimatePresence initial={false}>
                {items.map((m) => (
                  <MemoryRow key={m.id} m={m} flash={m.id === flashId} />
                ))}
              </AnimatePresence>
              {items.length === 0 && (
                <li className="ml-4 rounded-lg border border-dashed border-line/60 px-3 py-2 text-[11px] text-faint">
                  nothing yet
                </li>
              )}
            </ul>
          </div>
        ))}
      </div>
    </aside>
  )
}
