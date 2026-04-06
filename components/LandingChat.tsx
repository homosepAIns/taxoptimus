'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'

// ── Types ─────────────────────────────────────────────────────────────────────
type Step = 'gross' | 'status' | 'age' | 'medical' | 'result' | 'pension' | 'done_positive' | 'done_optimise'
type Status = 'single' | 'married-one' | 'married-two' | 'one-parent'

interface Message {
  role: 'ai' | 'user'
  text: string
}

// ── 2024 Irish Tax Engine ─────────────────────────────────────────────────────
const CUT_OFF: Record<Status, number> = {
  'single':       42000,
  'married-one':  51000,
  'married-two':  42000, // per earner
  'one-parent':   46000,
}

// Tax credits per individual filing position (annual)
const TAX_CREDITS: Record<Status, number> = {
  'single':       3750,  // Personal €1,875 + PAYE €1,875
  'married-one':  5625,  // Married €3,750 + PAYE €1,875
  'married-two':  3750,  // Married credit halved (€1,875) + PAYE €1,875
  'one-parent':   5500,  // Personal €1,875 + PAYE €1,875 + SPCC €1,750
}

const STATUS_LABELS: Record<Status, string> = {
  'single':       'Single',
  'married-one':  'Married (1 income)',
  'married-two':  'Married (2 incomes)',
  'one-parent':   'Single Parent Family',
}

function calcIrishTax(gross: number, status: Status, age: number, hasMedicalCard: boolean) {
  // PRSI — Class A: 4% above €18,304; 0% below (simplified)
  const prsi = gross > 18304 ? Math.round(gross * 0.04) : 0

  // USC
  let usc = 0
  if (gross > 13000) {
    if (age >= 70 || hasMedicalCard) {
      // Reduced: 0.5% up to €12,012, 2% on balance
      usc = Math.min(gross, 12012) * 0.005 + Math.max(0, gross - 12012) * 0.02
    } else {
      // Standard bands
      const b1 = Math.min(gross, 12012) * 0.005
      const b2 = Math.min(Math.max(0, gross - 12012), 10908) * 0.02
      const b3 = Math.min(Math.max(0, gross - 22920), 47124) * 0.04
      const b4 = Math.max(0, gross - 70044) * 0.08
      usc = b1 + b2 + b3 + b4
    }
  }
  usc = Math.round(usc)

  // Income Tax
  const cutoff = CUT_OFF[status]
  const rawTax = gross <= cutoff ? gross * 0.2 : cutoff * 0.2 + (gross - cutoff) * 0.4
  const incomeTax = Math.max(0, Math.round(rawTax - TAX_CREDITS[status]))

  const netAnnual = gross - prsi - usc - incomeTax
  const netMonthly = Math.round(netAnnual / 12)
  const marginalRate = gross > cutoff ? 0.4 : 0.2

  return { prsi, usc, incomeTax, netMonthly, marginalRate }
}

function fmt(n: number) {
  return n.toLocaleString('en-IE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

// Render **bold** markdown inline
function Bold({ text }: { text: string }) {
  const parts = text.split(/\*\*(.*?)\*\*/g)
  return (
    <>
      {parts.map((p, i) =>
        i % 2 === 1 ? <strong key={i} className="text-primary">{p}</strong> : <span key={i}>{p}</span>
      )}
    </>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function LandingChat() {
  const [step, setStep] = useState<Step>('gross')
  const [messages, setMessages] = useState<Message[]>([
    { role: 'ai', text: "Let's calculate your Irish take-home pay. What's your annual gross income in euros?" },
  ])
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState(false)

  // Collected inputs
  const [gross, setGross] = useState(0)
  const [status, setStatus] = useState<Status>('single')
  const [age, setAge] = useState(0)
  const [medicalCard, setMedicalCard] = useState(false)

  // Calculated results
  const [calc, setCalc] = useState({ prsi: 0, usc: 0, incomeTax: 0, netMonthly: 0, marginalRate: 0.2 })

  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, typing])

  useEffect(() => {
    if (!typing && ['gross', 'age', 'pension'].includes(step)) {
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [typing, step])

  function aiReply(text: string, nextStep: Step, delay = 900) {
    setTyping(true)
    setTimeout(() => {
      setTyping(false)
      setMessages((prev) => [...prev, { role: 'ai', text }])
      setStep(nextStep)
    }, delay)
  }

  // ── Euro input handler (gross + pension) ──
  function handleSend(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const val = parseFloat(input.replace(/,/g, ''))
    if (!input.trim() || isNaN(val) || val < 0) return
    setInput('')

    if (step === 'gross') {
      setGross(val)
      setMessages((prev) => [...prev, { role: 'user', text: `€${fmt(val)}` }])
      aiReply(
        "Got it. What's your current tax and family status?",
        'status'
      )
    } else if (step === 'age') {
      const ageVal = Math.round(val)
      setAge(ageVal)
      setMessages((prev) => [...prev, { role: 'user', text: `${ageVal} years old` }])
      aiReply(
        'Do you hold a full medical card? (This reduces USC to a max of 2%)',
        'medical'
      )
    } else if (step === 'pension') {
      setMessages((prev) => [...prev, { role: 'user', text: `€${fmt(val)} / month` }])
      const annualPension = val * 12
      const saving = Math.round(annualPension * calc.marginalRate)
      localStorage.setItem('taxoptimus_pending_calc', JSON.stringify({
        grossIncome: gross,
        taxStatus: status,
        age,
        hasMedicalCard: medicalCard,
        prsiAnnual: calc.prsi,
        uscAnnual: calc.usc,
        incomeTaxAnnual: calc.incomeTax,
        netMonthly: calc.netMonthly,
        pensionMonthly: val,
        potentialAnnualSaving: saving,
      }))
      aiReply(
        `By maximising your PRSA pension contributions, you could reclaim up to **€${fmt(saving)} per year** in tax relief at your marginal rate of **${calc.marginalRate * 100}%** — money that currently goes straight to Revenue. Log in or sign up to see your full personalised strategy.`,
        'done_optimise',
        1400
      )
    }
  }

  // ── Status picker ──
  function handleStatus(s: Status) {
    setStatus(s)
    setMessages((prev) => [...prev, { role: 'user', text: STATUS_LABELS[s] }])
    aiReply('How old are you? (Age affects your USC rate)', 'age')
  }

  // ── Medical card picker ──
  function handleMedical(has: boolean) {
    setMedicalCard(has)
    setMessages((prev) => [...prev, { role: 'user', text: has ? 'Yes, I have a medical card' : 'No medical card' }])

    const result = calcIrishTax(gross, status, age, has)
    setCalc(result)

    const breakdown = `Based on your profile, here's your estimated annual breakdown:\n\n• **Gross income:** €${fmt(gross)}\n• **Income Tax:** €${fmt(result.incomeTax)}\n• **PRSI:** €${fmt(result.prsi)}\n• **USC:** €${fmt(result.usc)}\n\nEstimated **monthly take-home: €${fmt(result.netMonthly)}**. Does that match what you receive?`

    aiReply(breakdown, 'result', 1300)
  }

  // ── Compare buttons ──
  function handleCompare(choice: 'more' | 'yes' | 'less') {
    const labels = { more: 'No, I receive more', yes: "Yes, that's about right!", less: 'No, I receive less' }
    setMessages((prev) => [...prev, { role: 'user', text: labels[choice] }])

    localStorage.setItem('taxoptimus_pending_calc', JSON.stringify({
      grossIncome: gross, taxStatus: status, age, hasMedicalCard: medicalCard,
      prsiAnnual: calc.prsi, uscAnnual: calc.usc, incomeTaxAnnual: calc.incomeTax,
      netMonthly: calc.netMonthly,
    }))

    if (choice === 'less') {
      aiReply(
        "There may be additional deductions like workplace pension schemes. How much are you currently putting into a pension or savings each month?",
        'pension'
      )
    } else {
      aiReply(
        `Great — you're on the right track! Sign up to TaxOptimus to discover personalised strategies to invest your surplus, reduce your tax bill further, and build long-term wealth.`,
        'done_positive'
      )
    }
  }

  const showEuroInput = ['gross', 'age', 'pension'].includes(step)
  const isAgeStep = step === 'age'

  return (
    <section id="ai-chat" className="container mx-auto px-6 py-16">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-container/20 text-primary font-semibold text-sm mb-4">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
            TaxOptimus AI · Live Irish Tax Calculator
          </div>
          <h2 className="font-headline font-extrabold text-3xl text-on-surface">See your take-home pay right now</h2>
          <p className="text-on-surface-variant mt-2 text-sm">No sign-up required · 2024 Irish tax rules · Takes about a minute.</p>
        </div>

        {/* Chat window */}
        <div className="bg-surface-container-lowest rounded-3xl border border-outline-variant/10 shadow-[0px_12px_40px_rgba(13,28,50,0.08)] overflow-hidden flex flex-col">
          <div className="flex-1 p-6 space-y-5 overflow-y-auto max-h-[560px]">

            {/* Messages */}
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse max-w-[80%] ml-auto' : 'max-w-[90%]'}`}
              >
                {msg.role === 'ai' && (
                  <div className="w-8 h-8 rounded-full bg-primary flex-shrink-0 flex items-center justify-center text-white mt-0.5">
                    <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: '"FILL" 1' }}>smart_toy</span>
                  </div>
                )}
                <div className={`p-4 rounded-3xl text-[15px] leading-relaxed whitespace-pre-line ${
                  msg.role === 'ai'
                    ? 'bg-surface-container text-on-surface rounded-tl-sm border border-outline-variant/10'
                    : 'bg-emerald-gradient text-white rounded-tr-sm font-medium shadow-md'
                }`}>
                  <Bold text={msg.text} />
                </div>
              </div>
            ))}

            {/* Typing dots */}
            {typing && (
              <div className="flex gap-3 max-w-[85%]">
                <div className="w-8 h-8 rounded-full bg-primary flex-shrink-0 flex items-center justify-center text-white mt-0.5">
                  <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: '"FILL" 1' }}>smart_toy</span>
                </div>
                <div className="bg-surface-container p-4 rounded-3xl rounded-tl-sm border border-outline-variant/10 flex items-center gap-1.5">
                  {[0, 150, 300].map((d) => (
                    <span key={d} className="w-2 h-2 bg-on-surface-variant/40 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
                  ))}
                </div>
              </div>
            )}

            {/* Status buttons */}
            {step === 'status' && !typing && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-11">
                {(Object.entries(STATUS_LABELS) as [Status, string][]).map(([val, label]) => (
                  <button
                    key={val}
                    onClick={() => handleStatus(val)}
                    className="flex items-center gap-3 px-4 py-3 bg-surface-container-low border border-outline-variant/20 rounded-2xl text-sm font-medium text-on-surface hover:bg-primary-container/10 hover:border-primary/30 transition-all text-left group"
                  >
                    <span className="material-symbols-outlined text-on-surface-variant group-hover:text-primary transition-colors text-xl">
                      {val === 'single' ? 'person' : val === 'one-parent' ? 'family_restroom' : 'people'}
                    </span>
                    {label}
                  </button>
                ))}
              </div>
            )}

            {/* Medical card buttons */}
            {step === 'medical' && !typing && (
              <div className="flex gap-3 pl-11">
                <button
                  onClick={() => handleMedical(true)}
                  className="flex items-center gap-2 px-5 py-2.5 bg-surface-container-low border border-outline-variant/20 rounded-full text-sm font-medium text-on-surface hover:bg-primary-container/10 hover:border-primary/30 transition-all"
                >
                  <span className="material-symbols-outlined text-lg text-primary" style={{ fontVariationSettings: '"FILL" 1' }}>check_circle</span>
                  Yes
                </button>
                <button
                  onClick={() => handleMedical(false)}
                  className="flex items-center gap-2 px-5 py-2.5 bg-surface-container-low border border-outline-variant/20 rounded-full text-sm font-medium text-on-surface hover:bg-surface-container-high transition-all"
                >
                  <span className="material-symbols-outlined text-lg text-on-surface-variant">cancel</span>
                  No
                </button>
              </div>
            )}

            {/* Compare buttons */}
            {step === 'result' && !typing && (
              <div className="flex flex-wrap gap-2 pl-11">
                <button
                  onClick={() => handleCompare('more')}
                  className="bg-surface-container-high text-on-surface px-4 py-2.5 rounded-full text-sm font-medium hover:bg-surface-container-highest transition-colors border border-outline-variant/20"
                >
                  No, I get more
                </button>
                <button
                  onClick={() => handleCompare('yes')}
                  className="signature-gradient text-white px-5 py-2.5 rounded-full text-sm font-bold shadow-md active:scale-95 transition-transform"
                >
                  Yes, that&apos;s right!
                </button>
                <button
                  onClick={() => handleCompare('less')}
                  className="bg-surface-container-high text-on-surface px-4 py-2.5 rounded-full text-sm font-medium hover:bg-surface-container-highest transition-colors border border-outline-variant/20"
                >
                  No, I get less
                </button>
              </div>
            )}

            {/* CTA — positive outcome */}
            {step === 'done_positive' && !typing && <ChatCTA />}

            {/* CTA — optimise outcome */}
            {step === 'done_optimise' && !typing && <ChatCTA />}

            <div ref={bottomRef} />
          </div>

          {/* Euro / age input bar */}
          {showEuroInput && (
            <div className="p-4 border-t border-outline-variant/10 bg-surface-container-lowest/80">
              <form onSubmit={handleSend} className="flex items-center gap-3">
                <div className="relative flex-1">
                  {!isAgeStep && (
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant font-semibold text-sm">€</span>
                  )}
                  {isAgeStep && (
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-on-surface-variant text-lg">cake</span>
                  )}
                  <input
                    ref={inputRef}
                    type="number"
                    min={isAgeStep ? 16 : 0}
                    max={isAgeStep ? 100 : undefined}
                    step="any"
                    placeholder={isAgeStep ? 'e.g. 34' : step === 'pension' ? '200' : '55000'}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    disabled={typing}
                    className="w-full bg-surface-container-low border-none rounded-full py-3.5 pl-9 pr-4 text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-on-surface-variant/40 disabled:opacity-50"
                  />
                </div>
                <button
                  type="submit"
                  disabled={!input.trim() || typing}
                  className="w-11 h-11 bg-primary rounded-full flex items-center justify-center text-white shadow-md active:scale-90 transition-transform disabled:opacity-40 flex-shrink-0"
                >
                  <span className="material-symbols-outlined text-lg">send</span>
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

function ChatCTA() {
  return (
    <div className="pl-11 space-y-3">
      <div className="flex flex-col sm:flex-row gap-3">
        <Link href="/signup" className="flex-1">
          <button className="w-full signature-gradient text-white font-bold py-3.5 px-6 rounded-2xl shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2">
            <span className="material-symbols-outlined text-xl">person_add</span>
            Sign Up Free
          </button>
        </Link>
        <Link href="/login" className="flex-1">
          <button className="w-full bg-surface-container-high text-on-surface font-bold py-3.5 px-6 rounded-2xl hover:bg-surface-container-highest transition-colors flex items-center justify-center gap-2 border border-outline-variant/20">
            <span className="material-symbols-outlined text-xl">login</span>
            Log In
          </button>
        </Link>
      </div>
      <p className="text-xs text-on-surface-variant px-1">Your calculation is saved automatically when you sign in.</p>
    </div>
  )
}
