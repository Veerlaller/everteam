import { AnimatePresence, motion } from 'framer-motion'

export function Toast({ message, onDone }: { message: string | null; onDone: () => void }) {
  return (
    <AnimatePresence>
      {message && (
        <motion.div
          key={message}
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.98 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          onAnimationComplete={() => {
            window.clearTimeout((window as unknown as { __t?: number }).__t)
            ;(window as unknown as { __t?: number }).__t = window.setTimeout(onDone, 3400)
          }}
          className="pointer-events-none fixed bottom-6 left-1/2 z-50 -translate-x-1/2"
        >
          <div className="glow-amber flex items-center gap-2.5 rounded-xl border border-amber/40 bg-panel-2 px-4 py-2.5 text-sm">
            <span className="text-base">🧠</span>
            <span className="text-text">{message}</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
