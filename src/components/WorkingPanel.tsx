import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useStore, type ReasonChip, type ReasoningStep } from '../state/store'
import { LoadCard } from './LoadCard'
import { MapView } from './MapView'
import { RateTable } from './RateTable'
import type { ScoredLoad } from '../types'

const CHIPS: ReasonChip[] = ['too much deadhead', 'rate too low', 'bad lane', 'broker']

/**
 * Streams the reasoning steps then signals completion. Remounted per hunt run
 * (via `key`), so it resets cleanly without synchronous setState in an effect.
 */
function ReasoningFeed({
  steps,
  onComplete,
}: {
  steps: ReasoningStep[]
  onComplete: () => void
}) {
  const [visible, setVisible] = useState(0)
  useEffect(() => {
    const timers: number[] = []
    steps.forEach((_, i) => {
      timers.push(window.setTimeout(() => setVisible(i + 1), 360 * (i + 1)))
    })
    timers.push(window.setTimeout(onComplete, 360 * steps.length + 650))
    return () => timers.forEach(clearTimeout)
  }, [steps, onComplete])

  return (
    <ul className="flex flex-col gap-1.5">
      {steps.slice(0, visible).map((s) => (
        <motion.li
          key={s.id}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-start gap-2 text-[12.5px]"
        >
          <span className={s.tone === 'cut' ? 'text-bad' : s.tone === 'good' ? 'text-good' : 'text-faint'}>
            {s.tone === 'cut' ? '✕' : s.tone === 'good' ? '✓' : '›'}
          </span>
          <span className={s.tone === 'good' ? 'text-text' : 'text-muted'}>{s.text}</span>
        </motion.li>
      ))}
      {visible < steps.length && <li className="ml-5 h-3 w-3 animate-pulse rounded-full bg-amber/40" />}
    </ul>
  )
}

function ReasonCapture({
  chosen,
  rejected,
  onLearn,
}: {
  chosen: ScoredLoad
  rejected?: ScoredLoad
  onLearn: (reason: string) => void
}) {
  const [text, setText] = useState('')
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-10 flex items-center justify-center bg-ink/80 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.95, y: 10 }}
        animate={{ scale: 1, y: 0 }}
        className="w-[440px] rounded-2xl border border-line bg-panel-2 p-5"
      >
        <p className="text-sm font-semibold text-text">
          Booking {chosen.id} — {chosen.origin.split(',')[0]} → {chosen.dest.split(',')[0]}
        </p>
        {rejected && (
          <p className="mt-1 text-[12px] text-faint">
            What made <span className="num text-muted">{rejected.id}</span> ({rejected.origin.split(',')[0]} →{' '}
            {rejected.dest.split(',')[0]}) a no? everteam will remember.
          </p>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          {CHIPS.map((c) => (
            <button
              key={c}
              onClick={() => onLearn(c)}
              className="rounded-full border border-line bg-panel px-3 py-1.5 text-[12px] text-muted transition-colors hover:border-amber/50 hover:text-text"
            >
              {c}
            </button>
          ))}
        </div>
        <div className="mt-3 flex gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && text.trim() && onLearn(text.trim())}
            placeholder="…or tell Eve in your own words"
            className="flex-1 rounded-lg border border-line bg-ink px-3 py-2 text-[13px] text-text outline-none placeholder:text-faint focus:border-amber/50"
          />
          <button
            onClick={() => onLearn(text.trim() || 'good run')}
            className="rounded-lg bg-amber px-3 py-2 text-[13px] font-semibold text-ink hover:bg-amber-soft"
          >
            Book it
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

export function WorkingPanel() {
  const open = useStore((s) => s.workingOpen)
  const phase = useStore((s) => s.huntPhase)
  const runId = useStore((s) => s.runId)
  const steps = useStore((s) => s.steps)
  const result = useStore((s) => s.result)
  const picking = useStore((s) => s.picking)
  const finishThinking = useStore((s) => s.finishThinking)
  const choose = useStore((s) => s.choose)
  const learn = useStore((s) => s.learn)
  const startHunt = useStore((s) => s.startHunt)
  const close = useStore((s) => s.closeWorking)

  const ranked = result?.ranked ?? []
  const topIds = ranked.map((r) => r.id)

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', stiffness: 260, damping: 30 }}
          className="absolute inset-0 z-20 flex flex-col bg-ink-2"
        >
          {/* header */}
          <div className="flex items-center justify-between border-b border-line px-5 py-3">
            <div className="flex items-center gap-2.5">
              <span className="h-2 w-2 rounded-full bg-amber status-live" />
              <h2 className="text-sm font-semibold text-text">Load Hunt</h2>
              {result && (
                <span className="num text-[11px] text-faint">
                  {result.eligible.length} clear rules · {result.removedByRule} cut
                </span>
              )}
            </div>
            <button onClick={close} className="rounded-md px-2 py-1 text-[12px] text-faint hover:bg-panel hover:text-text">
              ✕ close
            </button>
          </div>

          <div className="relative flex-1 overflow-y-auto p-5">
            <div className="grid grid-cols-[1.1fr_1fr] gap-4">
              {/* map */}
              <div className="overflow-hidden rounded-xl border border-line bg-ink/50">
                <div className="border-b border-line px-3 py-2 text-[11px] uppercase tracking-wider text-faint">
                  Central Valley · reefer board
                </div>
                <div className="aspect-[4/3]">{result && <MapView loads={result.all} topIds={topIds} />}</div>
              </div>

              {/* reasoning feed */}
              <div className="rounded-xl border border-line bg-ink/50 p-3">
                <div className="mb-2 text-[11px] uppercase tracking-wider text-faint">Eve is reasoning</div>
                <ReasoningFeed key={runId} steps={steps} onComplete={finishThinking} />
              </div>
            </div>

            {/* rate math */}
            {ranked.length > 0 && (
              <div className="mt-4">
                <div className="mb-2 text-[11px] uppercase tracking-wider text-faint">
                  Rate math · net after fuel + deadhead
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {ranked.map((l) => (
                    <RateTable key={`${runId}-${l.id}`} load={l} />
                  ))}
                </div>
              </div>
            )}

            {/* results */}
            <AnimatePresence>
              {phase === 'results' && (
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mt-4">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[11px] uppercase tracking-wider text-faint">Your 2 best — pick one</span>
                    <button
                      onClick={startHunt}
                      className="rounded-md border border-line px-2.5 py-1 text-[11px] text-muted hover:border-amber/50 hover:text-text"
                    >
                      ↻ Find more
                    </button>
                  </div>
                  {ranked.length > 0 ? (
                    <div className="grid grid-cols-2 gap-3">
                      {ranked.map((l, i) => (
                        <LoadCard
                          key={l.id}
                          load={l}
                          rank={i + 1}
                          onPick={() => choose(l, ranked.find((x) => x.id !== l.id))}
                        />
                      ))}
                    </div>
                  ) : (
                    <p className="rounded-lg border border-dashed border-line p-4 text-center text-[13px] text-faint">
                      Every load tripped a rule. Loosen one in chat and hunt again.
                    </p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {picking && (
                <ReasonCapture chosen={picking.chosen} rejected={picking.rejected} onLearn={(r) => learn(r)} />
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
