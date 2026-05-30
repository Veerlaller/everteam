import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { AGENTS } from '../lib/agents'
import { useStore } from '../state/store'
import type { ChatMessage } from '../types'

const huntIntent = (t: string) => /find\b.*\bload|load hunt|hunt.*load|find me a load|got any loads|what'?s on the board/i.test(t)

function Bubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.sender === 'user'
  const agent = msg.sender !== 'user' ? AGENTS[msg.sender] : null
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex gap-2.5 ${isUser ? 'flex-row-reverse' : ''}`}
    >
      {agent && (
        <div
          className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[10px] font-semibold"
          style={{ background: `hsl(${agent.hue} 40% 14%)`, color: `hsl(${agent.hue} 80% 70%)` }}
        >
          {agent.initials}
        </div>
      )}
      <div
        className={`max-w-[78%] rounded-2xl px-3.5 py-2 text-[13.5px] leading-snug ${
          isUser ? 'bg-amber text-ink' : 'border border-line bg-panel-2 text-text'
        }`}
      >
        {agent && <span className="mb-0.5 block text-[10px] font-medium" style={{ color: `hsl(${agent.hue} 70% 65%)` }}>{agent.name}</span>}
        {msg.text}
      </div>
    </motion.div>
  )
}

export function ChatPanel() {
  const messages = useStore((s) => s.messages)
  const thinking = useStore((s) => s.thinking)
  const activeAgent = useStore((s) => s.activeAgent)
  const send = useStore((s) => s.send)
  const startHunt = useStore((s) => s.startHunt)
  const [text, setText] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const persona = AGENTS[activeAgent]

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, thinking])

  const submit = (raw: string) => {
    const t = raw.trim()
    if (!t) return
    setText('')
    if (huntIntent(t)) {
      void send(t)
      setTimeout(() => startHunt(), 250)
    } else {
      void send(t)
    }
  }

  const chips = ['Find me a load', ...persona.chips.filter((c) => !/find me a load/i.test(c))]

  return (
    <div className="flex h-full flex-col">
      {/* header */}
      <div className="flex items-center gap-3 border-b border-line px-5 py-3">
        <div
          className="flex h-9 w-9 items-center justify-center rounded-lg text-xs font-semibold"
          style={{ background: `hsl(${persona.hue} 40% 14%)`, color: `hsl(${persona.hue} 80% 70%)` }}
        >
          {persona.initials}
        </div>
        <div>
          <p className="text-sm font-semibold text-text">{persona.name}</p>
          <p className="text-[11px] text-faint">{persona.role} · {persona.blurb}</p>
        </div>
      </div>

      {/* messages */}
      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
        {messages.map((m) => (
          <Bubble key={m.id} msg={m} />
        ))}
        {thinking && (
          <div className="flex gap-1 pl-10">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="h-1.5 w-1.5 rounded-full bg-faint"
                style={{ animation: `pulse-dot 1s ${i * 0.15}s ease-in-out infinite` }}
              />
            ))}
          </div>
        )}
      </div>

      {/* chips + input */}
      <div className="border-t border-line px-5 py-3">
        <div className="mb-2.5 flex flex-wrap gap-2">
          {chips.map((c) => (
            <button
              key={c}
              onClick={() => submit(c)}
              className="rounded-full border border-line bg-panel px-3 py-1 text-[12px] text-muted transition-colors hover:border-amber/50 hover:text-text"
            >
              {c}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit(text)}
            placeholder={`Message ${persona.name}…`}
            className="flex-1 rounded-xl border border-line bg-panel px-4 py-2.5 text-[14px] text-text outline-none placeholder:text-faint focus:border-amber/50"
          />
          <button
            onClick={() => submit(text)}
            className="rounded-xl bg-amber px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-amber-soft"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  )
}
