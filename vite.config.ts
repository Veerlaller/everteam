import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { eveBridge } from './server/eve-bridge'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load ALL env vars (incl. non-VITE_ server-only keys like GEMINI_API_KEY).
  const env = loadEnv(mode, process.cwd(), '')
  // When a Gemini key is present locally, auto-point the agent brain at the
  // same-origin /eve bridge unless the user set an explicit Butterbase URL.
  const hasGemini = Boolean(env.GEMINI_API_KEY)
  const butterbase = env.VITE_BUTTERBASE_BASE_URL || (hasGemini ? '/' : '')

  return {
    plugins: [react(), tailwindcss(), eveBridge(env)],
    define: {
      // Inject the resolved backend base so GeminiBrain uses the local bridge
      // when a key exists, the real Butterbase URL when set, else mock.
      'import.meta.env.VITE_BUTTERBASE_BASE_URL': JSON.stringify(butterbase),
    },
  }
})
