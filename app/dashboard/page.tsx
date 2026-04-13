'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import BottomNavBar from '@/components/BottomNavBar'
import TopAppBar from '@/components/TopAppBar'
import { supabase, type IncomeProfile, type Transaction, type SavingsGoal, type TaxProfile } from '@/lib/supabase'

function fmt(n: number) {
  return n.toLocaleString('en-IE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

const TAX_STATUS_LABELS: Record<string, string> = {
  'single':      'Single',
  'married-one': 'Married (1 income)',
  'married-two': 'Married (2 incomes)',
  'one-parent':  'Single Parent',
}

const CATEGORY_META: Record<string, { icon: string; iconBg: string; iconText: string }> = {
  'Groceries':     { icon: 'shopping_basket',  iconBg: 'bg-secondary-container',    iconText: 'text-secondary' },
  'Bills':         { icon: 'receipt',           iconBg: 'bg-tertiary-fixed',          iconText: 'text-tertiary' },
  'Subscriptions': { icon: 'subscriptions',     iconBg: 'bg-surface-container-high',  iconText: 'text-on-surface-variant' },
  'Transport':     { icon: 'directions_car',    iconBg: 'bg-primary-container/40',    iconText: 'text-primary' },
  'Dining':        { icon: 'restaurant',        iconBg: 'bg-error-container/40',      iconText: 'text-error' },
  'Healthcare':    { icon: 'medical_services',  iconBg: 'bg-secondary-container',     iconText: 'text-secondary' },
  'Other':         { icon: 'category',          iconBg: 'bg-surface-container-high',  iconText: 'text-on-surface-variant' },
}

function catMeta(cat: string) {
  return CATEGORY_META[cat] ?? CATEGORY_META['Other']
}

// ── Skeleton loader ────────────────────────────────────────────────────────────
function Skeleton() {
  return (
    <div className="bg-surface text-on-surface pb-32">
      <TopAppBar />
      <main className="mt-20 px-6 max-w-5xl mx-auto pt-8 animate-pulse space-y-6">
        <div className="h-10 bg-surface-container-low rounded-2xl w-72" />
        <div className="h-6  bg-surface-container-low rounded-xl  w-48" />
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          <div className="md:col-span-8  h-48 bg-surface-container-low rounded-2xl" />
          <div className="md:col-span-4  h-48 bg-surface-container-low rounded-2xl" />
          <div className="md:col-span-7  h-72 bg-surface-container-low rounded-2xl" />
          <div className="md:col-span-5  h-72 bg-surface-container-low rounded-2xl" />
          <div className="md:col-span-12 h-56 bg-surface-container-low rounded-2xl" />
        </div>
      </main>
      <BottomNavBar />
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────
// ── Tax Breakdown types ───────────────────────────────────────────────────────
type CalcResult = {
  'Core Financials': Record<string, number>
  'Tax Deductions':  Record<string, number>
  'Summary': {
    'Total Tax Deduced': number
    'Take Home CASH': number
    'Effective Tax Rate (%)': number
    'Marginal Tax Rate (%)': number
  }
}

type TaxFormData = {
  employment_type:           'PAYE' | 'Self-Employed'
  remote_working_days:       number
  annual_wfh_utility_costs:  number
  annual_rent_paid:          number
  qualifying_health_expenses: number
  bik:                       number
  employer_health_premium:   number
}

export default function DashboardPage() {
  const router = useRouter()
  const [loading,      setLoading]      = useState(true)
  const [userName,     setUserName]     = useState('')
  const [profile,      setProfile]      = useState<IncomeProfile | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [goals,        setGoals]        = useState<SavingsGoal[]>([])
  const [taxProfile,   setTaxProfile]   = useState<TaxProfile | null>(null)
  const [calcResult,   setCalcResult]   = useState<CalcResult | null>(null)
  const [calcLoading,  setCalcLoading]  = useState(false)
  const [calcError,    setCalcError]    = useState('')
  const [formData,     setFormData]     = useState<TaxFormData>({
    employment_type:            'PAYE',
    remote_working_days:        0,
    annual_wfh_utility_costs:   0,
    annual_rent_paid:           0,
    qualifying_health_expenses: 0,
    bik:                        0,
    employer_health_premium:    0,
  })

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) { router.replace('/login'); return }

      const user = session.user
      const name = user.user_metadata?.full_name?.split(' ')[0] ?? user.email?.split('@')[0] ?? 'there'
      setUserName(name)

      // Flush any pending calc saved while logged out (localStorage → DB)
      const raw = localStorage.getItem('taxoptimus_pending_calc')
      if (raw) {
        try {
          const c = JSON.parse(raw)
          await supabase.from('income_profiles').insert({
            user_id:                 user.id,
            gross_income:            c.grossIncome,
            tax_status:              c.taxStatus,
            age:                     c.age,
            has_medical_card:        c.hasMedicalCard,
            prsi_annual:             c.prsiAnnual,
            usc_annual:              c.uscAnnual,
            income_tax_annual:       c.incomeTaxAnnual,
            net_monthly:             c.netMonthly,
            pension_monthly:         c.pensionMonthly ?? null,
            potential_annual_saving: c.potentialAnnualSaving ?? null,
          })
        } catch (_) { /* ignore */ }
        localStorage.removeItem('taxoptimus_pending_calc')
      }

      const [profileRes, txRes, goalsRes, taxProfileRes] = await Promise.all([
        supabase.from('income_profiles')
          .select('*').eq('user_id', user.id)
          .order('created_at', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('transactions')
          .select('*').eq('user_id', user.id)
          .order('transaction_date', { ascending: false }).limit(200),
        supabase.from('savings_goals')
          .select('*').eq('user_id', user.id)
          .order('created_at', { ascending: true }),
        supabase.from('tax_profiles')
          .select('*').eq('user_id', user.id)
          .order('created_at', { ascending: false }).limit(1).maybeSingle(),
      ])

      const incomeProfile = profileRes.data as IncomeProfile | null
      const existingTaxProfile = taxProfileRes.data as TaxProfile | null

      if (incomeProfile)      setProfile(incomeProfile)
      if (txRes.data)         setTransactions(txRes.data as Transaction[])
      if (goalsRes.data)      setGoals(goalsRes.data as SavingsGoal[])
      if (existingTaxProfile) {
        setTaxProfile(existingTaxProfile)
        setFormData({
          employment_type:            existingTaxProfile.employment_type,
          remote_working_days:        existingTaxProfile.remote_working_days,
          annual_wfh_utility_costs:   existingTaxProfile.annual_wfh_utility_costs,
          annual_rent_paid:           existingTaxProfile.annual_rent_paid,
          qualifying_health_expenses: existingTaxProfile.qualifying_health_expenses,
          bik:                        existingTaxProfile.bik,
          employer_health_premium:    existingTaxProfile.employer_health_premium,
        })
        // Use stored calc result — no API call needed
        if (existingTaxProfile.calc_result) {
          setCalcResult(existingTaxProfile.calc_result as unknown as CalcResult)
        }
      }

      setLoading(false)
    }
    load()
  }, [router])

  const now = new Date()
  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 18 ? 'Good afternoon' : 'Good evening'
  const monthLabel = now.toLocaleDateString('en-IE', { month: 'long', year: 'numeric' })

  // All uploaded transactions
  const totalExpenses = transactions.reduce((sum, tx) => sum + Math.abs(tx.amount), 0)

  // Top 4 categories by spend (all time)
  const catMap = new Map<string, { total: number; count: number }>()
  transactions.forEach(tx => {
    const cat = tx.category || 'Other'
    const prev = catMap.get(cat) ?? { total: 0, count: 0 }
    catMap.set(cat, { total: prev.total + Math.abs(tx.amount), count: prev.count + 1 })
  })
  const categories = Array.from(catMap.entries())
    .map(([name, d]) => ({ name, ...d }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 4)

  // Derived numbers
  const monthlyIncome = profile?.net_monthly ?? 0
  const surplus       = monthlyIncome - totalExpenses
  const gross         = profile?.gross_income ?? 0
  const taxTotal      = (profile?.income_tax_annual ?? 0) + (profile?.usc_annual ?? 0) + (profile?.prsi_annual ?? 0)
  const incomeTaxPct  = gross > 0 ? ((profile?.income_tax_annual ?? 0) / gross) * 100 : 0
  const uscPct        = gross > 0 ? ((profile?.usc_annual        ?? 0) / gross) * 100 : 0
  const prsiPct       = gross > 0 ? ((profile?.prsi_annual       ?? 0) / gross) * 100 : 0

  async function handleTaxFormSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!profile) return
    setCalcLoading(true)
    setCalcError('')

    const { data: { session } } = await supabase.auth.getSession()
    const userId = session!.user.id

    try {
      // 1. Calculate first
      const res = await fetch('/api/tax/calculate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token ?? ''}`,
        },
        body: JSON.stringify({
          gross_income:               profile.gross_income,
          age:                        profile.age,
          tax_status:                 profile.tax_status,
          has_medical_card:           profile.has_medical_card,
          ...formData,
        }),
      })
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()
      const newCalcResult: CalcResult = data.calculation

      // 2. Persist form inputs + calc result together
      const payload = { user_id: userId, ...formData, calc_result: newCalcResult }
      const { data: saved } = await supabase
        .from('tax_profiles')
        .upsert(payload, { onConflict: 'user_id' })
        .select().single()

      if (saved) setTaxProfile(saved as TaxProfile)
      setCalcResult(newCalcResult)
          } catch (err) {
      setCalcError('Calculation failed. Please try again.')
      console.error(err)
    }
    setCalcLoading(false)
  }

  if (loading) return <Skeleton />

  return (
    <div className="bg-surface text-on-surface pb-32">
      <TopAppBar />

      <main className="mt-20 px-6 max-w-5xl mx-auto">
        {/* ── Greeting & hero number ── */}
        <section className="mt-8 mb-10">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div>
              <p className="text-on-surface-variant font-medium mb-1">{greeting}, {userName} 👋</p>
              {profile ? (
                <>
                  <h1 className="text-[3.5rem] font-extrabold tracking-tight text-on-surface leading-none">
                    €{fmt(profile.net_monthly)}
                    <span className="text-xl font-medium text-on-surface-variant ml-3">/month take-home</span>
                  </h1>
                  <p className="text-on-surface-variant mt-2 text-sm">
                    {TAX_STATUS_LABELS[profile.tax_status]} · Gross €{fmt(gross)}/yr
                    · Profile from {new Date(profile.created_at).toLocaleDateString('en-IE', { month: 'short', year: 'numeric' })}
                  </p>
                </>
              ) : (
                <>
                  <h1 className="text-3xl font-extrabold tracking-tight text-on-surface">No tax profile yet</h1>
                  <p className="text-on-surface-variant mt-1 text-sm">Complete the free calculator to see your take-home pay.</p>
                </>
              )}
            </div>
            <Link href="/upload">
              <button className="emerald-gradient text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 active:scale-95 transition-transform">
                <span className="material-symbols-outlined">upload_file</span>
                Upload Statement
              </button>
            </Link>
          </div>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">

          {/* ── Financial Overview ── */}
          <div className="md:col-span-8 bg-surface-container-lowest rounded-2xl p-6 flex flex-col justify-between">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-xl font-bold">Financial Overview</h3>
              <span className="text-sm text-on-surface-variant bg-surface-container-low px-3 py-1 rounded-full">
                {transactions.length > 0 ? `${transactions.length} transactions` : monthLabel}
              </span>
            </div>
            {profile ? (
              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-primary">
                    <span className="material-symbols-outlined">arrow_downward</span>
                    <span className="font-bold">Income</span>
                  </div>
                  <p className="text-3xl font-bold">€{fmt(monthlyIncome)}</p>
                  <div className="h-2 bg-surface-container-low rounded-full overflow-hidden">
                    <div className="h-full bg-primary-container w-full rounded-full" />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-tertiary">
                    <span className="material-symbols-outlined">arrow_upward</span>
                    <span className="font-bold">Expenses</span>
                  </div>
                  {totalExpenses > 0 ? (
                    <>
                      <p className="text-3xl font-bold">€{fmt(totalExpenses)}</p>
                      <div className="h-2 bg-surface-container-low rounded-full overflow-hidden">
                        <div className="h-full bg-tertiary rounded-full" style={{ width: `${Math.min((totalExpenses / monthlyIncome) * 100, 100)}%` }} />
                      </div>
                    </>
                  ) : (
                    <div className="pt-1 space-y-1">
                      <p className="text-on-surface-variant text-sm">No transactions yet</p>
                      <Link href="/upload" className="text-xs font-bold text-primary hover:underline">Upload bank statement →</Link>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-24 text-on-surface-variant text-sm text-center">
                Complete your tax profile to track monthly flow
              </div>
            )}
          </div>

          {/* ── Surplus Pulse ── */}
          <div className="md:col-span-4 bg-primary-container text-on-primary-container rounded-2xl p-6 relative overflow-hidden">
            <div className="relative z-10">
              <div className="bg-primary/20 w-fit px-3 py-1 rounded-full text-xs font-bold mb-4 flex items-center gap-1">
                <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                {profile && surplus < 0 ? 'OVERSPEND' : 'SURPLUS'}
              </div>
              {profile ? (
                <>
                  <h3 className="text-4xl font-extrabold mb-1">
                    {surplus < 0 ? '-' : ''}€{fmt(Math.abs(surplus))}
                  </h3>
                  <p className="text-sm opacity-80 font-medium">
                    {totalExpenses > 0 ? 'Income minus expenses' : 'Take-home this month'}
                  </p>
                </>
              ) : (
                <p className="text-sm opacity-70 mt-2">Set up your profile to see surplus</p>
              )}
            </div>
            <div className="absolute -right-8 -bottom-8 opacity-20">
              <span className="material-symbols-outlined text-9xl">auto_graph</span>
            </div>
          </div>

          {/* ── Tax Breakdown ── */}
          <div className="md:col-span-12 lg:col-span-7 bg-surface-container-low rounded-2xl p-8 border border-outline-variant/10">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h3 className="text-2xl font-bold mb-1">Your Tax Breakdown</h3>
                <p className="text-on-surface-variant text-sm">2026 Irish tax · based on your profile</p>
              </div>
              <div className="flex items-center gap-2">
                {calcResult && (
                  <button
                    onClick={() => setCalcResult(null)}
                    className="text-xs text-on-surface-variant hover:text-primary transition-colors flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-base">edit</span>
                    Edit
                  </button>
                )}
                <span className="material-symbols-outlined text-primary text-2xl" style={{ fontVariationSettings: '"FILL" 1' }}>receipt_long</span>
              </div>
            </div>

            {/* State: no income profile */}
            {!profile && (
              <div className="flex flex-col items-center justify-center py-8 gap-4 text-center">
                <span className="material-symbols-outlined text-5xl text-on-surface-variant/30">receipt_long</span>
                <p className="text-on-surface-variant text-sm">Complete the free tax calculator to see your breakdown</p>
                <Link href="/">
                  <button className="signature-gradient text-white font-bold py-2.5 px-5 rounded-xl text-sm">
                    Go to Calculator
                  </button>
                </Link>
              </div>
            )}

            {/* State: income profile exists but no tax profile yet (or editing) */}
            {profile && !calcResult && !calcLoading && (
              <form onSubmit={handleTaxFormSubmit} className="space-y-5">
                <div className="bg-primary-container/20 rounded-xl p-4 flex gap-3 items-start mb-2">
                  <span className="material-symbols-outlined text-primary mt-0.5 flex-shrink-0">info</span>
                  <p className="text-sm text-on-surface-variant leading-relaxed">
                    We need a few more details to calculate your full Irish tax picture and spot reliefs you may be missing.
                  </p>
                </div>

                {/* Employment type */}
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-on-surface-variant">Employment type</label>
                  <div className="flex gap-3">
                    {(['PAYE', 'Self-Employed'] as const).map(t => (
                      <button
                        key={t} type="button"
                        onClick={() => setFormData(d => ({ ...d, employment_type: t }))}
                        className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-colors ${formData.employment_type === t ? 'bg-primary text-white' : 'bg-surface-container-low text-on-surface hover:bg-surface-container-high'}`}
                      >{t}</button>
                    ))}
                  </div>
                </div>

                {/* WFH */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-on-surface-variant">WFH days / year</label>
                    <input type="number" min={0} max={260} placeholder="0"
                      value={formData.remote_working_days || ''}
                      onChange={e => setFormData(d => ({ ...d, remote_working_days: Number(e.target.value) }))}
                      className="bg-surface-container-lowest border border-outline-variant/20 rounded-xl py-3 px-4 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                  {formData.remote_working_days > 0 && (
                    <div className="flex flex-col gap-1.5">
                      <label className="text-sm font-medium text-on-surface-variant">Utility costs / yr (€)</label>
                      <input type="number" min={0} placeholder="e.g. 1800"
                        value={formData.annual_wfh_utility_costs || ''}
                        onChange={e => setFormData(d => ({ ...d, annual_wfh_utility_costs: Number(e.target.value) }))}
                        className="bg-surface-container-lowest border border-outline-variant/20 rounded-xl py-3 px-4 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                  )}
                </div>

                {/* Rent + Health */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-on-surface-variant">Annual rent paid (€)</label>
                    <input type="number" min={0} placeholder="0"
                      value={formData.annual_rent_paid || ''}
                      onChange={e => setFormData(d => ({ ...d, annual_rent_paid: Number(e.target.value) }))}
                      className="bg-surface-container-lowest border border-outline-variant/20 rounded-xl py-3 px-4 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-on-surface-variant">Health expenses (€)</label>
                    <input type="number" min={0} placeholder="0"
                      value={formData.qualifying_health_expenses || ''}
                      onChange={e => setFormData(d => ({ ...d, qualifying_health_expenses: Number(e.target.value) }))}
                      className="bg-surface-container-lowest border border-outline-variant/20 rounded-xl py-3 px-4 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                </div>

                {/* BIK + Employer health */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-on-surface-variant">Benefits in Kind (€)</label>
                    <input type="number" min={0} placeholder="0"
                      value={formData.bik || ''}
                      onChange={e => setFormData(d => ({ ...d, bik: Number(e.target.value) }))}
                      className="bg-surface-container-lowest border border-outline-variant/20 rounded-xl py-3 px-4 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-on-surface-variant">Employer health ins. (€)</label>
                    <input type="number" min={0} placeholder="0"
                      value={formData.employer_health_premium || ''}
                      onChange={e => setFormData(d => ({ ...d, employer_health_premium: Number(e.target.value) }))}
                      className="bg-surface-container-lowest border border-outline-variant/20 rounded-xl py-3 px-4 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                </div>

                {calcError && (
                  <p className="text-sm text-error flex items-center gap-2">
                    <span className="material-symbols-outlined text-base">error</span>
                    {calcError}
                  </p>
                )}

                <button type="submit"
                  className="w-full signature-gradient text-white font-bold py-3.5 rounded-2xl flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
                >
                  Show My Full Breakdown
                  <span className="material-symbols-outlined">arrow_forward</span>
                </button>
              </form>
            )}

            {/* State: calculating */}
            {profile && calcLoading && (
              <div className="flex flex-col items-center justify-center py-12 gap-4">
                <span className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                <p className="text-on-surface-variant text-sm">Calculating your tax position…</p>
              </div>
            )}

            {/* State: result ready */}
            {profile && calcResult && !calcLoading && (() => {
              const summary = calcResult['Summary']
              const deductions = calcResult['Tax Deductions']
              const effectiveRate = summary['Effective Tax Rate (%)']
              const marginalRate  = summary['Marginal Tax Rate (%)']
              const totalTax      = summary['Total Tax Deduced']
              const takeHome      = summary['Take Home CASH']
              const netPaye       = deductions['Net Income Tax (PAYE)']
              const usc           = deductions['USC']
              const prsi          = deductions['PRSI']
              const rentCredit    = deductions['Rent Tax Credit (20%)']
              const wfhRelief     = (deductions['Income Protection Relief (20%)'] ?? 0) // proxy; actual WFH is in credits
              const healthRelief  = deductions['Health Expenses Relief (20%)'] ?? 0
              const incomeTaxPctR = gross > 0 ? (netPaye / gross) * 100 : 0
              const uscPctR       = gross > 0 ? (usc    / gross) * 100 : 0
              const prsiPctR      = gross > 0 ? (prsi   / gross) * 100 : 0

              return (
                <>
                  {/* Rate pills */}
                  <div className="flex gap-4 mb-6">
                    <div className="flex-1 bg-surface-container-lowest rounded-xl p-4 text-center">
                      <p className="text-xs text-on-surface-variant uppercase tracking-wide mb-1">Effective Rate</p>
                      <p className="text-3xl font-extrabold text-error">{effectiveRate.toFixed(1)}%</p>
                    </div>
                    <div className="flex-1 bg-surface-container-lowest rounded-xl p-4 text-center">
                      <p className="text-xs text-on-surface-variant uppercase tracking-wide mb-1">Marginal Rate</p>
                      <p className="text-3xl font-extrabold text-orange-500">{marginalRate.toFixed(1)}%</p>
                    </div>
                    <div className="flex-1 bg-surface-container-lowest rounded-xl p-4 text-center">
                      <p className="text-xs text-on-surface-variant uppercase tracking-wide mb-1">Total Tax</p>
                      <p className="text-3xl font-extrabold text-on-surface">€{fmt(totalTax)}</p>
                    </div>
                  </div>

                  {/* Stacked bar */}
                  <div className="h-4 rounded-full overflow-hidden flex gap-px mb-4">
                    <div className="bg-error/70 rounded-l-full"  style={{ width: `${incomeTaxPctR}%` }} title="Income Tax" />
                    <div className="bg-orange-400/70"             style={{ width: `${uscPctR}%` }}      title="USC" />
                    <div className="bg-tertiary/70"               style={{ width: `${prsiPctR}%` }}     title="PRSI" />
                    <div className="bg-primary rounded-r-full flex-1"                                   title="Take-home" />
                  </div>
                  <div className="flex gap-3 text-[11px] mb-6 flex-wrap">
                    {[
                      { label: 'Income Tax', color: 'bg-error/70' },
                      { label: 'USC',        color: 'bg-orange-400/70' },
                      { label: 'PRSI',       color: 'bg-tertiary/70' },
                      { label: 'Take-home',  color: 'bg-primary' },
                    ].map(l => (
                      <span key={l.label} className="flex items-center gap-1.5 text-on-surface-variant">
                        <span className={`w-2.5 h-2.5 rounded-sm ${l.color}`} />
                        {l.label}
                      </span>
                    ))}
                  </div>

                  {/* Key numbers grid */}
                  <div className="grid grid-cols-2 gap-x-8 gap-y-4 mb-6">
                    {[
                      { label: 'Gross Income',   value: `€${fmt(gross)}/yr`,        cls: '' },
                      { label: 'Income Tax',     value: `€${fmt(netPaye)}/yr`,       cls: 'text-error' },
                      { label: 'USC',            value: `€${fmt(usc)}/yr`,           cls: 'text-orange-500' },
                      { label: 'PRSI',           value: `€${fmt(prsi)}/yr`,          cls: 'text-on-surface-variant' },
                      { label: 'Total Tax',      value: `€${fmt(totalTax)}/yr`,      cls: 'text-error font-extrabold' },
                      { label: 'Take-Home',      value: `€${fmt(takeHome / 12)}/mo`, cls: 'text-primary font-extrabold' },
                    ].map(item => (
                      <div key={item.label}>
                        <p className="text-xs text-on-surface-variant uppercase tracking-wide mb-0.5">{item.label}</p>
                        <p className={`font-bold text-base ${item.cls}`}>{item.value}</p>
                      </div>
                    ))}
                  </div>

                  {/* Credits applied */}
                  {(rentCredit > 0 || healthRelief > 0) && (
                    <div className="bg-surface-container-lowest rounded-xl p-4 space-y-2">
                      <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wide mb-3">Credits Applied</p>
                      {rentCredit > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-on-surface-variant flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-primary text-base">check_circle</span>
                            Rent Tax Credit
                          </span>
                          <span className="font-bold text-primary">−€{fmt(rentCredit)}</span>
                        </div>
                      )}
                      {healthRelief > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-on-surface-variant flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-primary text-base">check_circle</span>
                            Health Relief (20%)
                          </span>
                          <span className="font-bold text-primary">−€{fmt(healthRelief)}</span>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )
            })()}
          </div>

          {/* ── Expense Categories ── */}
          <div className="md:col-span-12 lg:col-span-5 bg-surface-container-lowest rounded-2xl p-8">
            <h3 className="text-xl font-bold mb-1">Expense Categories</h3>
            <p className="text-xs text-on-surface-variant mb-6">All uploaded documents</p>

            {categories.length > 0 ? (
              <>
                <div className="space-y-5">
                  {categories.map(cat => {
                    const m = catMeta(cat.name)
                    return (
                      <div key={cat.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 ${m.iconBg} rounded-lg flex items-center justify-center ${m.iconText}`}>
                            <span className="material-symbols-outlined">{m.icon}</span>
                          </div>
                          <div>
                            <p className="font-bold">{cat.name}</p>
                            <p className="text-xs text-on-surface-variant">{cat.count} transaction{cat.count !== 1 ? 's' : ''}</p>
                          </div>
                        </div>
                        <p className="font-bold">€{fmt(cat.total)}</p>
                      </div>
                    )
                  })}
                </div>
                <Link href="/upload">
                  <button className="w-full mt-6 py-3 text-sm font-bold text-primary hover:bg-surface-container-low rounded-xl transition-colors">
                    View Full Analysis →
                  </button>
                </Link>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 gap-4 text-center">
                <span className="material-symbols-outlined text-5xl text-on-surface-variant/30">receipt_long</span>
                <p className="text-on-surface-variant text-sm">No transactions this month yet</p>
                <Link href="/upload">
                  <button className="bg-surface-container-low text-on-surface font-bold py-2.5 px-5 rounded-xl text-sm border border-outline-variant/20 flex items-center gap-2 hover:bg-surface-container-high transition-colors">
                    <span className="material-symbols-outlined text-base">upload_file</span>
                    Upload Bank Statement
                  </button>
                </Link>
              </div>
            )}
          </div>

          {/* ── Savings Goals ── */}
          <div className="md:col-span-12 bg-surface-container-lowest rounded-2xl p-8">
            <div className="flex justify-between items-end mb-8">
              <div>
                <h3 className="text-2xl font-bold">Savings Goals</h3>
                {goals.length > 0 && (
                  <p className="text-on-surface-variant">
                    {goals.filter(g => g.current_amount >= g.target_amount).length} of {goals.length} goal{goals.length !== 1 ? 's' : ''} reached
                  </p>
                )}
              </div>
            </div>

            {goals.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {goals.map(goal => {
                  const pct = Math.min((goal.current_amount / goal.target_amount) * 100, 100)
                  return (
                    <div key={goal.id} className="space-y-3">
                      <div className="flex justify-between text-sm font-bold">
                        <span>{goal.name}</span>
                        <span className="text-on-surface-variant font-medium">€{fmt(goal.current_amount)} / €{fmt(goal.target_amount)}</span>
                      </div>
                      <div className="h-3 bg-surface-container-low rounded-full overflow-hidden">
                        <div className="h-full emerald-gradient rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                      <div className="flex justify-between text-xs text-on-surface-variant">
                        <span>{pct.toFixed(0)}% reached</span>
                        {goal.target_date && (
                          <span>by {new Date(goal.target_date).toLocaleDateString('en-IE', { month: 'short', year: 'numeric' })}</span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 gap-3 text-center">
                <span className="material-symbols-outlined text-5xl text-on-surface-variant/30">savings</span>
                <p className="text-on-surface-variant text-sm">No savings goals yet — they&apos;ll appear here once added</p>
              </div>
            )}
          </div>

        </div>
      </main>

      <BottomNavBar />
    </div>
  )
}
