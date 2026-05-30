import type { ProviderName } from '../../types'
import { EverMeProvider } from './EverMeProvider'
import { EverOSProvider } from './EverOSProvider'
import { LocalProvider } from './LocalProvider'
import type { MemoryProvider } from './types'

export type { MemoryProvider } from './types'

const env = import.meta.env

/**
 * Resolve the active provider with the required fallback order:
 *   EverMe (hosted) -> EverOS (self-hosted) -> local (browser).
 * Behavior is identical whichever wins. The active name is logged + shown.
 */
export async function resolveProvider(): Promise<MemoryProvider> {
  const forced = (env.VITE_MEMORY_PROVIDER as ProviderName | 'auto' | undefined) ?? 'auto'
  const local = new LocalProvider()

  const everMeBase = env.VITE_EVERME_BASE_URL as string | undefined
  const everMeToken = env.VITE_EVERME_TOKEN as string | undefined
  const everOsBase = (env.VITE_EVEROS_BASE_URL as string | undefined) ?? 'http://localhost:1995'

  const pick = async (): Promise<MemoryProvider> => {
    if (forced === 'local') return local
    if (forced === 'everme' && everMeBase && everMeToken) return new EverMeProvider(everMeBase, everMeToken)
    if (forced === 'everos') return new EverOSProvider(everOsBase)

    // auto: try hosted, then self-hosted, then local
    if (everMeBase && everMeToken && (await EverMeProvider.healthy(everMeBase, everMeToken)))
      return new EverMeProvider(everMeBase, everMeToken)
    if (await EverOSProvider.healthy(everOsBase)) return new EverOSProvider(everOsBase)
    return local
  }

  const provider = await pick()
  console.info(`[everteam] memory provider: ${provider.name}`)
  return provider
}
