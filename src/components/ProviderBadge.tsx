import type { ProviderName } from '../types'

const LABEL: Record<ProviderName, string> = {
  everme: 'EverMe',
  everos: 'EverOS',
  local: 'local',
}

export function ProviderBadge({ provider, brain }: { provider: ProviderName; brain: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex items-center gap-1.5 rounded-full border border-line bg-panel px-2.5 py-1 text-[11px] text-muted">
        <span className="h-1.5 w-1.5 rounded-full bg-good status-live" />
        memory: <span className="text-text">{LABEL[provider]}</span>
      </span>
      <span className="flex items-center gap-1.5 rounded-full border border-line bg-panel px-2.5 py-1 text-[11px] text-muted">
        <span className="h-1.5 w-1.5 rounded-full bg-amber" />
        agents: <span className="text-text">{brain === 'gemini' ? 'Gemini' : 'mock'}</span>
      </span>
    </div>
  )
}
