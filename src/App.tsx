import { useEffect } from 'react'
import { AgentRail } from './components/AgentRail'
import { ChatPanel } from './components/ChatPanel'
import { HarnessPanel } from './components/HarnessPanel'
import { ProviderBadge } from './components/ProviderBadge'
import { Toast } from './components/Toast'
import { WorkingPanel } from './components/WorkingPanel'
import { useStore } from './state/store'

export default function App() {
  const ready = useStore((s) => s.ready)
  const init = useStore((s) => s.init)
  const providerName = useStore((s) => s.providerName)
  const brainName = useStore((s) => s.brainName)
  const toast = useStore((s) => s.toast)
  const dismissToast = useStore((s) => s.dismissToast)

  useEffect(() => {
    void init()
  }, [init])

  return (
    <div className="flex h-screen flex-col bg-topo text-text">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-line px-5">
        <div className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber/15 text-amber">▣</span>
          <div className="leading-none">
            <p className="text-[15px] font-bold tracking-tight text-text">
              ever<span className="text-amber">team</span>
            </p>
            <p className="mt-0.5 text-[10px] text-faint">memory-powered back office for carriers</p>
          </div>
        </div>
        <ProviderBadge provider={providerName} brain={brainName} />
      </header>

      {ready ? (
        <div className="flex flex-1 overflow-hidden">
          <AgentRail />
          <main className="relative flex-1 overflow-hidden">
            <ChatPanel />
            <WorkingPanel />
          </main>
          <HarnessPanel />
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center text-faint">
          <span className="animate-pulse text-sm">waking up the team…</span>
        </div>
      )}

      <Toast message={toast} onDone={dismissToast} />
    </div>
  )
}
