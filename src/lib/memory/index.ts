import type { ProviderName } from '../../types'
import { EverOSProvider } from './EverOSProvider'
import { HostedMemoryProvider } from './HostedMemoryProvider'
import { LocalProvider } from './LocalProvider'
import type { MemoryProvider } from './types'

export type { MemoryProvider } from './types'

const env = import.meta.env

/**
 * Resolve the active provider with the required fallback order:
 *   EverMe/EverMind (hosted, via same-origin bridge) -> EverOS -> local.
 * Behavior is identical whichever wins. The active name is logged + shown.
 *
 * The hosted provider talks to a same-origin `/memory/*` bridge that holds the
 * EverMind token server-side (no CORS, no token in the bundle).
 */
export async function resolveProvider(): Promise<MemoryProvider> {
  const forced = (env.VITE_MEMORY_PROVIDER as ProviderName | 'auto' | undefined) ?? 'auto'
  const local = new LocalProvider()
  const everOsBase = (env.VITE_EVEROS_BASE_URL as string | undefined) ?? 'http://localhost:1995'

  const pick = async (): Promise<MemoryProvider> => {
    if (forced === 'local') return local
    if (forced === 'everme') return new HostedMemoryProvider()
    if (forced === 'everos') return new EverOSProvider(everOsBase)

    // auto: hosted EverMind (via bridge) → EverOS → local
    if (await HostedMemoryProvider.available()) return new HostedMemoryProvider()
    if (await EverOSProvider.healthy(everOsBase)) return new EverOSProvider(everOsBase)
    return local
  }

  const provider = await pick()
  console.info(`[everteam] memory provider: ${provider.name}`)
  return provider
}
