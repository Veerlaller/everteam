import type { Memory, ProviderName } from '../../types'

/**
 * The single seam the whole app talks to for memory. Every provider behaves
 * identically from the app's point of view (store -> recall -> re-rank).
 */
export interface MemoryProvider {
  readonly name: ProviderName
  /** Hydrate all memories (for the Harness panel + scoring). */
  load(): Promise<Memory[]>
  /** Persist a new (or updated) memory. */
  store(memory: Memory): Promise<void>
  /** Recall memories relevant to a query (semantic on hosted, keyword on local). */
  search(query: string): Promise<Memory[]>
  /** Remove a memory by id (no-op for locked seeds). */
  remove(id: string): Promise<void>
}
