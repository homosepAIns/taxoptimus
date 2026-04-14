'use client'
import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'

interface Message {
  role: 'ai' | 'user' | 'assistant' // assistant is used by the backend
  text: string
  time: string
}

const INITIAL: Message[] = [
  {
    role: 'ai',
    text: "Hi! I'm TaxOptimus AI. I can search **Revenue.ie** for the most up-to-date Irish tax info. How can I help you today?",
    time: now(),
  },
]

function now() {
  return new Date().toLocaleTimeString('en-IE', { hour: '2-digit', minute: '2-digit' })
}

function MarkdownText({ text }: { text: string }) {
  // 1. Split for Bold: **text**
  // 2. Split for Links: [title](url) or https://...
  
  // Re-implemented to handle bold and clickable links
  const parts = text.split(/(\*\*.*?\*\*|\[.*?\]\(.*?\)|https?:\/\/[^\s]+)/g)

  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i} className="font-semibold text-primary">{part.slice(2, -2)}</strong>
        }
        
        // Match [link title](url)
        const linkMatch = part.match(/\[(.*?)\]\((.*?)\)/)
        if (linkMatch) {
          return (
            <a key={i} href={linkMatch[2]} target="_blank" rel="noopener noreferrer" className="text-primary underline hover:opacity-80 transition-opacity">
              {linkMatch[1]}
            </a>
          )
        }

        // Match raw https://...
        if (part.startsWith('http')) {
          return (
            <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-primary underline hover:opacity-80 transition-opacity break-all">
              {part}
            </a>
          )
        }

        return <span key={i}>{part}</span>
      })}
    </>
  )
}

export default function ChatbotWidget() {
  const [user, setUser] = useState<User | null>(null)
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>(INITIAL)
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState(false)
  const [unread, setUnread] = useState(0)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setUser(session?.user ?? null))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, typing])

  useEffect(() => {
    if (open) {
      setUnread(0)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open])

  if (!user) return null

  async function send(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!input.trim() || typing) return

    const userMsg: Message = { role: 'user', text: input.trim(), time: now() }
    const updatedMessages = [...messages, userMsg]
    setMessages(updatedMessages)
    setInput('')
    setTyping(true)

    try {
      // Map frontend messages to backend format
      const history = updatedMessages.map(m => ({
        role: m.role === 'ai' ? 'assistant' : m.role,
        content: m.text
      }))

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history })
      })

      if (!res.ok) throw new Error('Failed to get response')

      const data = await res.json()
      
      setTyping(false)
      const aiMsg: Message = { 
        role: 'ai', 
        text: data.content, 
        time: now() 
      }
      setMessages((prev) => [...prev, aiMsg])
      if (!open) setUnread((n) => n + 1)
      
    } catch (err) {
      console.error('Chat error:', err)
      setTyping(false)
      setMessages((prev) => [...prev, { 
        role: 'ai', 
        text: "I'm having trouble connecting to my brain right now. Please try again in a moment!", 
        time: now() 
      }])
    }
  }

  return (
    <>
      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-[5.5rem] right-4 z-50 w-[340px] sm:w-[380px] flex flex-col bg-surface-container-lowest rounded-3xl shadow-[0px_16px_48px_rgba(13,28,50,0.18)] border border-outline-variant/10 overflow-hidden"
          style={{ maxHeight: 'calc(100dvh - 10rem)' }}
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-5 py-4 bg-primary">
            <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined text-white text-xl" style={{ fontVariationSettings: '"FILL" 1' }}>smart_toy</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-headline font-bold text-white leading-tight text-sm">TaxOptimus AI</p>
              <p className="text-white/70 text-[11px] flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-primary-container rounded-full animate-pulse"></span>
                Connected to Revenue.ie
              </p>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-white/70 hover:text-white transition-colors p-1"
            >
              <span className="material-symbols-outlined text-xl">close</span>
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                {msg.role === 'ai' && (
                  <div className="w-7 h-7 rounded-full bg-primary flex-shrink-0 flex items-center justify-center text-white mt-0.5">
                    <span className="material-symbols-outlined text-xs" style={{ fontVariationSettings: '"FILL" 1' }}>smart_toy</span>
                  </div>
                )}
                <div className="max-w-[78%] space-y-1">
                  <div className={`px-4 py-3 rounded-2xl text-[13px] leading-relaxed ${
                    msg.role === 'ai'
                      ? 'bg-surface-container text-on-surface rounded-tl-sm border border-outline-variant/10 whitespace-pre-wrap'
                      : 'bg-primary text-white rounded-tr-sm'
                  }`}>
                    <MarkdownText text={msg.text} />
                  </div>
                  <p className={`text-[10px] text-on-surface-variant px-1 ${msg.role === 'user' ? 'text-right' : ''}`}>{msg.time}</p>
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {typing && (
              <div className="flex gap-2.5">
                <div className="w-7 h-7 rounded-full bg-primary flex-shrink-0 flex items-center justify-center text-white mt-0.5">
                  <span className="material-symbols-outlined text-xs" style={{ fontVariationSettings: '"FILL" 1' }}>smart_toy</span>
                </div>
                <div className="bg-surface-container px-4 py-3 rounded-2xl rounded-tl-sm border border-outline-variant/10 flex items-center gap-2">
                  <p className="text-[11px] font-medium text-on-surface-variant italic">Searching Revenue.ie...</p>
                  <div className="flex gap-1">
                    {[0, 150, 300].map((d) => (
                      <span key={d} className="w-1.5 h-1.5 bg-on-surface-variant/40 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-outline-variant/10 bg-surface-container-lowest">
            <form onSubmit={send} className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                placeholder="Ask about Irish tax…"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="flex-1 bg-surface-container-low rounded-full px-4 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/20 border-none"
              />
              <button
                type="submit"
                disabled={!input.trim() || typing}
                className="w-9 h-9 bg-primary rounded-full flex items-center justify-center text-white flex-shrink-0 active:scale-90 transition-transform disabled:opacity-40"
              >
                <span className="material-symbols-outlined text-base">send</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Floating button */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-[5.5rem] right-4 z-50 w-14 h-14 signature-gradient rounded-full shadow-[0px_8px_24px_rgba(0,109,54,0.35)] flex items-center justify-center active:scale-90 transition-all hover:shadow-[0px_12px_32px_rgba(0,109,54,0.45)]"
        aria-label="Open AI chat"
      >
        {open ? (
          <span className="material-symbols-outlined text-white text-2xl">close</span>
        ) : (
          <span className="material-symbols-outlined text-white text-2xl" style={{ fontVariationSettings: '"FILL" 1' }}>smart_toy</span>
        )}
        {/* Unread badge */}
        {!open && unread > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-error rounded-full text-white text-[10px] font-bold flex items-center justify-center">
            {unread}
          </span>
        )}
      </button>
    </>
  )
}
