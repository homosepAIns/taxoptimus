'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import TaxBreakdownModal from '@/components/TaxBreakdownModal'

// ── Save helper: DB if logged in, localStorage if not ─────────────────────────
interface CalcPayload {
  grossIncome: number; taxStatus: string; age: number; hasMedicalCard: boolean
  prsiAnnual: number; uscAnnual: number; incomeTaxAnnual: number; netMonthly: number
  pensionMonthly?: number; potentialAnnualSaving?: number
}

async function saveCalc(data: CalcPayload): Promise<boolean> {
  const { data: { session } } = await supabase.auth.getSession()
  if (session?.user) {
    const { error } = await supabase.from('income_profiles').insert({
      user_id:                 session.user.id,
      gross_income:            data.grossIncome,
      tax_status:              data.taxStatus,
      age:                     data.age,
      has_medical_card:        data.hasMedicalCard,
      prsi_annual:             data.prsiAnnual,
      usc_annual:              data.uscAnnual,
      income_tax_annual:       data.incomeTaxAnnual,
      net_monthly:             data.netMonthly,
      pension_monthly:         data.pensionMonthly ?? null,
      potential_annual_saving: data.potentialAnnualSaving ?? null,
    })
    return !error
  }
  // Logged out — persist for after login
  localStorage.setItem('taxoptimus_pending_calc', JSON.stringify(data))
  return false
}

// ── Types ─────────────────────────────────────────────────────────────────────
type Step = 'gross' | 'status' | 'age' | 'medical' | 'result' | 'pension' | 'done_positive' | 'done_optimise'
type Status = 'single' | 'married-one' | 'married-two' | 'one-parent'

interface Message {
  role: 'ai' | 'user'
  text: string
}

const STATUS_LABELS: Record<Status, string> = {
  'single':       'Single',
  'married-one':  'Married (1 income)',
  'married-two':  'Married (2 incomes)',
  'one-parent':   'Single Parent Family',
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
  const router = useRouter()
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [saving, setSaving] = useState(false)
  const [step, setStep] = useState<Step>('gross')
  const [showFullBreakdown, setShowFullBreakdown] = useState(false)
  const [fullCalcData, setFullCalcData] = useState<any>(null)
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

  const chatContainerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setIsLoggedIn(!!session?.user))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session?.user)
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    const el = chatContainerRef.current
    if (el) el.scrollTop = el.scrollHeight
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
      const taxSaving = Math.round(annualPension * calc.marginalRate)
      setSaving(true)
      saveCalc({
        grossIncome: gross, taxStatus: status, age, hasMedicalCard: medicalCard,
        prsiAnnual: calc.prsi, uscAnnual: calc.usc, incomeTaxAnnual: calc.incomeTax,
        netMonthly: calc.netMonthly, pensionMonthly: val, potentialAnnualSaving: taxSaving,
      }).then((savedToDB) => {
        setSaving(false)
        if (savedToDB) {
          setTyping(false)
          setMessages((prev) => [...prev, {
            role: 'ai',
            text: `By maximising your PRSA pension contributions, you could reclaim up to **€${fmt(taxSaving)} per year** in tax relief at your marginal rate of **${calc.marginalRate * 100}%**. Your profile has been saved — taking you to your dashboard!`,
          }])
          setStep('done_optimise')
          setTimeout(() => router.push('/dashboard'), 2000)
        } else {
          aiReply(
            `By maximising your PRSA pension contributions, you could reclaim up to **€${fmt(taxSaving)} per year** in tax relief at your marginal rate of **${calc.marginalRate * 100}%** — money that currently goes straight to Revenue. Log in or sign up to see your full personalised strategy.`,
            'done_optimise',
            1400
          )
        }
      })
    }
  }

  // ── Status picker ──
  function handleStatus(s: Status) {
    setStatus(s)
    setMessages((prev) => [...prev, { role: 'user', text: STATUS_LABELS[s] }])
    aiReply('How old are you? (Age affects your USC rate)', 'age')
  }

  // ── Medical card picker ──
  async function handleMedical(has: boolean) {
    setMedicalCard(has)
    setMessages((prev) => [...prev, { role: 'user', text: has ? 'Yes, I have a medical card' : 'No medical card' }])
    setTyping(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/tax/calculate', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': session ? `Bearer ${session.access_token}` : ''
        },
        body: JSON.stringify({
          gross_income: gross,
          age: age,
          tax_status: status,
          has_medical_card: has,
          tax_year: 2026
        })
      })

      if (!res.ok) throw new Error('Backend calculation failed')
      
      const data = await res.json()
      const summary = data.calculation.Summary
      setFullCalcData(data.calculation)
      
      setCalc({
        prsi: data.calculation['Tax Deductions'].PRSI,
        usc: data.calculation['Tax Deductions'].USC,
        incomeTax: data.calculation['Tax Deductions']['Net Income Tax (PAYE)'],
        netMonthly: summary['Take Home CASH'] / 12,
        marginalRate: summary['Marginal Tax Rate (%)'] / 100
      })

      const breakdown = `Based on your profile (2026 Rules), here's your estimated annual breakdown:\n\n• **Gross income:** €${fmt(gross)}\n• **Income Tax:** €${fmt(data.calculation['Tax Deductions']['Net Income Tax (PAYE)'] ?? 0)}\n• **PRSI:** €${fmt(data.calculation['Tax Deductions'].PRSI ?? 0)}\n• **USC:** €${fmt(data.calculation['Tax Deductions'].USC ?? 0)}\n\nEstimated **monthly take-home: €${fmt(summary['Take Home CASH'] / 12)}**. Does that match what you receive?`

      setTyping(false)
      setMessages((prev) => [...prev, { role: 'ai', text: breakdown }])
      setStep('result')
    } catch (err) {
      console.error(err)
      setTyping(false)
      aiReply("Sorry, I had trouble calculating your taxes. Please try again or sign up for full access.", 'medical')
    }
  }

  // ── Compare buttons ──
  function handleCompare(choice: 'more' | 'yes' | 'less') {
    const labels = { more: 'No, I receive more', yes: "Yes, that's about right!", less: 'No, I receive less' }
    setMessages((prev) => [...prev, { role: 'user', text: labels[choice] }])

    if (choice === 'less') {
      aiReply(
        "There may be additional deductions like workplace pension schemes. How much are you currently putting into a pension or savings each month?",
        'pension'
      )
    } else {
      // Save without pension data and redirect if logged in
      setSaving(true)
      saveCalc({
        grossIncome: gross, taxStatus: status, age, hasMedicalCard: medicalCard,
        prsiAnnual: calc.prsi, uscAnnual: calc.usc, incomeTaxAnnual: calc.incomeTax,
        netMonthly: calc.netMonthly,
      }).then((savedToDB) => {
        setSaving(false)
        if (savedToDB) {
          setTyping(false)
          setMessages((prev) => [...prev, {
            role: 'ai',
            text: `Great — your profile has been saved! Taking you to your dashboard now.`,
          }])
          setStep('done_positive')
          setTimeout(() => router.push('/dashboard'), 1800)
        } else {
          aiReply(
            `Great — you're on the right track! Sign up to TaxOptimus to discover personalised strategies to invest your surplus, reduce your tax bill further, and build long-term wealth.`,
            'done_positive'
          )
        }
      })
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
          <div ref={chatContainerRef} className="flex-1 p-6 space-y-5 overflow-y-auto max-h-[560px]">

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
            {step === 'done_positive' && !typing && <ChatCTA isLoggedIn={isLoggedIn} />}

            {/* CTA — optimise outcome */}
            {step === 'done_optimise' && !typing && <ChatCTA isLoggedIn={isLoggedIn} />}

            {/* View Full Breakdown Button */}
            {fullCalcData && !typing && (
              <div className="pl-11 mt-2">
                <button 
                  onClick={() => setShowFullBreakdown(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-surface-container-high text-primary hover:bg-primary/10 rounded-xl text-xs font-bold transition-all border border-primary/20"
                >
                  <span className="material-symbols-outlined text-lg">analytics</span>
                  View Detailed Breakdown
                </button>
              </div>
            )}

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

      {showFullBreakdown && (
        <TaxBreakdownModal 
          data={fullCalcData} 
          onClose={() => setShowFullBreakdown(false)} 
        />
      )}
    </section>
  )
}

function ChatCTA({ isLoggedIn }: { isLoggedIn: boolean }) {
  if (isLoggedIn) {
    return (
      <div className="pl-11 space-y-3">
        <Link href="/dashboard">
          <button className="signature-gradient text-white font-bold py-3.5 px-6 rounded-2xl shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2">
            <span className="material-symbols-outlined text-xl">dashboard</span>
            Go to Dashboard
          </button>
        </Link>
        <p className="text-xs text-on-surface-variant px-1">Your calculation has been saved to your account.</p>
      </div>
    )
  }

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
