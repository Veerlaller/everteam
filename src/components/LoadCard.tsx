import { motion } from 'framer-motion'
import type { ScoredLoad } from '../types'

export function LoadCard({
  load,
  rank,
  onPick,
}: {
  load: ScoredLoad
  rank: number
  onPick: () => void
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.98 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="flex flex-col rounded-xl border border-line bg-panel-2 p-4"
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded bg-amber/15 text-[11px] font-bold text-amber">
              {rank}
            </span>
            <span className="num text-[11px] text-faint">{load.id}</span>
          </div>
          <p className="mt-2 text-[15px] font-semibold text-text">
            {load.origin.split(',')[0]} <span className="text-faint">→</span> {load.dest.split(',')[0]}
          </p>
          <p className="text-[11px] text-faint">
            {load.commodity} · {load.broker} · home {load.estReturnDay} · Truck {load.truck}
          </p>
        </div>
        <div className="text-right">
          <p className="num text-lg font-bold text-amber">${load.netPerMi.toFixed(2)}</p>
          <p className="text-[10px] uppercase tracking-wide text-faint">net $/mi</p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 rounded-lg border border-line/60 bg-ink/40 p-2 text-center">
        <div>
          <p className="num text-[13px] text-text">${load.rateTotal.toLocaleString()}</p>
          <p className="text-[9px] uppercase tracking-wide text-faint">gross</p>
        </div>
        <div>
          <p className="num text-[13px] text-text">{load.miles.toLocaleString()}</p>
          <p className="text-[9px] uppercase tracking-wide text-faint">miles</p>
        </div>
        <div>
          <p className="num text-[13px] text-text">{load.deadheadMi}</p>
          <p className="text-[9px] uppercase tracking-wide text-faint">deadhead</p>
        </div>
      </div>

      <p className="mt-3 flex-1 text-[12px] leading-snug text-muted">
        <span className="font-semibold text-amber-soft">Why this one — </span>
        {load.why}
      </p>

      <button
        onClick={onPick}
        className="mt-3 rounded-lg bg-amber px-3 py-2 text-sm font-semibold text-ink transition-colors hover:bg-amber-soft"
      >
        Pick {load.id}
      </button>
    </motion.div>
  )
}
