'use client'
import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'

interface Message {
  role: 'ai' | 'user'
  text: string
  time: string
}

const INITIAL: Message[] = [
  {
    role: 'ai',
    text: "Hi! I'm TaxOptimus AI. Ask me anything about Irish tax, take-home pay, pension relief, or how to use the app.",
    time: now(),
  },
]

// Simple keyword-based demo responses — swap in a real API call when ready
const RESPONSES: [RegExp, string][] = [
  [/tax credit|credits/i,       "In 2024, most PAYE workers get a Personal Tax Credit (€1,875) and a PAYE Credit (€1,875), totalling €3,750. Married couples get €3,750 combined. You can claim additional credits like medical expenses, rent, or tuition on Revenue's myAccount."],
  [/pension|prsa|prsi/i,        "Contributing to a PRSA pension is one of the most powerful tax reliefs available. Relief is given at your marginal rate — 40% if you earn over €42,000. So €200/month into a PRSA could save you €80/month in tax."],
  [/usc|universal social/i,     "USC (Universal Social Charge) has four bands in 2024: 0.5% on the first €12,012, 2% up to €22,920, 4% up to €70,044, and 8% above that. Medical card holders and those over 70 pay a max of 2%."],
  [/married|spouse|partner/i,   "Married couples can transfer unused standard rate band and tax credits between spouses. If one partner earns less, the higher earner can claim their unused €1,875 credit — worth up to €750/year."],
  [/rent|housing|landlord/i,    "The Rent Tax Credit is worth €750 per year (€1,500 for couples). It applies to private renters and can be claimed on Revenue's myAccount for current and prior years."],
  [/upload|statement|receipt/i, "Head to the Upload page to drop in your bank statements or receipts. Our AI extracts transactions, categorises spending, and flags potential tax claims automatically."],
  [/invest|etf|stock|fund/i,    "Check out the Optimize Tax page for a personalised Irish tax-efficient allocation — typically a split across PRSA pension, Irish-domiciled ETFs, and State Prize Bonds (which are 100% tax-free on winnings)."],
  [/hello|hi |hey/i,            "Hello! 👋 How can I help you with your Irish taxes today?"],
]

function getFallback() {
  return "That's a great question! For the most accurate answer I'd recommend checking Revenue.ie or the Citizens Information site. Is there something specific about Irish income tax, USC, or PRSI I can help clarify?"
}

function now() {
  return new Date().toLocaleTimeString('en-IE', { hour: '2-digit', minute: '2-digit' })
}

function getResponse(text: string): string {
  for (const [pattern, reply] of RESPONSES) {
    if (pattern.test(text)) return reply
  }
  return getFallback()
}

function Bold({ text }: { text: string }) {
  const parts = text.split(/\*\*(.*?)\*\*/g)
  return (
    <>
      {parts.map((p, i) =>
        i % 2 === 1 ? <strong key={i} className="font-semibold text-primary">{p}</strong> : <span key={i}>{p}</span>
      )}
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

  function send(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!input.trim() || typing) return

    const userMsg: Message = { role: 'user', text: input.trim(), time: now() }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setTyping(true)

    const reply = getResponse(userMsg.text)
    const delay = 800 + Math.min(reply.length * 12, 1200)

    setTimeout(() => {
      setTyping(false)
      const aiMsg: Message = { role: 'ai', text: reply, time: now() }
      setMessages((prev) => [...prev, aiMsg])
      if (!open) setUnread((n) => n + 1)
    }, delay)
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
                <span className="w-1.5 h-1.5 bg-primary-container rounded-full"></span>
                Online
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
                      ? 'bg-surface-container text-on-surface rounded-tl-sm border border-outline-variant/10'
                      : 'bg-primary text-white rounded-tr-sm'
                  }`}>
                    <Bold text={msg.text} />
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
                <div className="bg-surface-container px-4 py-3 rounded-2xl rounded-tl-sm border border-outline-variant/10 flex items-center gap-1">
                  {[0, 150, 300].map((d) => (
                    <span key={d} className="w-1.5 h-1.5 bg-on-surface-variant/40 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
                  ))}
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
