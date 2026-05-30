import { useEffect, useRef, useState } from 'react'
import type { ScoredLoad } from '../types'

function useCountUp(target: number, duration = 700, deps: unknown[] = []) {
  const [val, setVal] = useState(0)
  const raf = useRef(0)
  useEffect(() => {
    const start = performance.now()
    const from = 0
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - t, 3)
      setVal(from + (target - from) * eased)
      if (t < 1) raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, ...deps])
  return val
}

function Num({ value, prefix = '', digits = 0 }: { value: number; prefix?: string; digits?: number }) {
  const v = useCountUp(value)
  return (
    <span className="num">
      {prefix}
      {v.toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits })}
    </span>
  )
}

export function RateTable({ load }: { load: ScoredLoad }) {
  return (
    <div className="rounded-lg border border-line bg-ink/50 p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="num text-[11px] text-faint">{load.id}</span>
        <span className="text-[11px] text-muted">{load.origin.split(',')[0]} → {load.dest.split(',')[0]}</span>
      </div>
      <dl className="grid grid-cols-2 gap-y-1.5 text-[12px]">
        <dt className="text-faint">Gross</dt>
        <dd className="text-right text-text"><Num value={load.rateTotal} prefix="$" /></dd>
        <dt className="text-faint">Miles</dt>
        <dd className="num text-right text-muted">{load.miles.toLocaleString()}</dd>
        <dt className="text-faint">Deadhead</dt>
        <dd className="num text-right text-muted">{load.deadheadMi} mi</dd>
        <dt className="text-faint">Est. fuel</dt>
        <dd className="text-right text-muted">−<Num value={load.estFuel} prefix="$" /></dd>
        <dt className="mt-1 border-t border-line/60 pt-1.5 font-medium text-text">Net $/mile</dt>
        <dd className="mt-1 border-t border-line/60 pt-1.5 text-right font-semibold text-amber">
          <Num value={load.netPerMi} prefix="$" digits={2} />
        </dd>
      </dl>
    </div>
  )
}
