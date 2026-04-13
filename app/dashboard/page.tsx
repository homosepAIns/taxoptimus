'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import BottomNavBar from '@/components/BottomNavBar'
import TopAppBar from '@/components/TopAppBar'
import { supabase, type IncomeProfile, type Transaction, type SavingsGoal, type TaxProfile } from '@/lib/supabase'

function fmt(n: number | null | undefined) {
  return (n || 0).toLocaleString('en-IE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
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
  tax_year:                  number
  employment_type:           'PAYE' | 'Self-Employed'
  second_income:             number
  rent_a_room_income:        number
  micro_generation_income:   number
  is_blind:                  boolean
  has_incapacitated_child:   boolean
  claims_home_carer:         boolean
  claims_single_child_carer: boolean
  claims_dependent_relative: boolean
  medical_card:              boolean
  remote_working_days:       number
  annual_wfh_utility_costs:  number
  annual_rent_paid:          number
  qualifying_health_expenses: number
  bik:                       number
  employer_health_premium:   number
  flat_rate_expense:         number
  nursing_home_fees:         number
  employee_health_insurance: number
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
    tax_year:                   2026,
    employment_type:            'PAYE',
    second_income:              0,
    rent_a_room_income:         0,
    micro_generation_income:    0,
    is_blind:                   false,
    has_incapacitated_child:    false,
    claims_home_carer:          false,
    claims_single_child_carer:  false,
    claims_dependent_relative:  false,
    medical_card:               false,
    remote_working_days:        0,
    annual_wfh_utility_costs:   0,
    annual_rent_paid:           0,
    qualifying_health_expenses: 0,
    bik:                        0,
    employer_health_premium:    0,
    flat_rate_expense:          0,
    nursing_home_fees:          0,
    employee_health_insurance:  0,
  })

  // ── Savings Goals state ──────────────────────────────────────────────────────
  const [addingGoal,     setAddingGoal]     = useState(false)
  const [newGoalName,    setNewGoalName]    = useState('')
  const [newGoalTarget,  setNewGoalTarget]  = useState('')
  const [newGoalDate,    setNewGoalDate]    = useState('')
  const [updatingGoalId,     setUpdatingGoalId]     = useState<string | null>(null)
  const [updateAmount,       setUpdateAmount]       = useState('')
  const [editingGoalId,      setEditingGoalId]      = useState<string | null>(null)
  const [editGoalName,       setEditGoalName]       = useState('')
  const [editGoalTarget,     setEditGoalTarget]     = useState('')
  const [editGoalDate,       setEditGoalDate]       = useState('')
  const [confirmDeleteGoalId,setConfirmDeleteGoalId]= useState<string | null>(null)
  const [goalSaving,         setGoalSaving]         = useState(false)

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
          tax_year:                   existingTaxProfile.tax_year || 2026,
          employment_type:            existingTaxProfile.employment_type as any,
          second_income:              existingTaxProfile.second_income || 0,
          rent_a_room_income:         existingTaxProfile.rent_a_room_income || 0,
          micro_generation_income:    existingTaxProfile.micro_generation_income || 0,
          is_blind:                   existingTaxProfile.is_blind || false,
          has_incapacitated_child:    existingTaxProfile.has_incapacitated_child || false,
          claims_home_carer:          existingTaxProfile.claims_home_carer || false,
          claims_single_child_carer:  existingTaxProfile.claims_single_child_carer || false,
          claims_dependent_relative:  existingTaxProfile.claims_dependent_relative || false,
          medical_card:               existingTaxProfile.medical_card || false,
          remote_working_days:        existingTaxProfile.remote_working_days || 0,
          annual_wfh_utility_costs:   existingTaxProfile.annual_wfh_utility_costs || 0,
          annual_rent_paid:           existingTaxProfile.annual_rent_paid || 0,
          qualifying_health_expenses: existingTaxProfile.qualifying_health_expenses || 0,
          bik:                        existingTaxProfile.bik || 0,
          employer_health_premium:    existingTaxProfile.employer_health_premium || 0,
          flat_rate_expense:          existingTaxProfile.flat_rate_expense || 0,
          nursing_home_fees:          existingTaxProfile.nursing_home_fees || 0,
          employee_health_insurance:  existingTaxProfile.employee_health_insurance || 0,
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

  // ── Savings goal helpers ─────────────────────────────────────────────────────
  function goalNudge(goal: SavingsGoal): { text: string; icon: string; color: string } {
    const pct = goal.target_amount > 0 ? (goal.current_amount / goal.target_amount) * 100 : 0
    const remaining = Math.max(0, goal.target_amount - goal.current_amount)

    if (pct >= 100) return { text: "Goal reached! Time to celebrate.", icon: "celebration", color: "text-primary" }
    if (pct >= 80)  return { text: `Almost there — just €${fmt(remaining)} to go!`, icon: "local_fire_department", color: "text-orange-500" }

    if (goal.target_date) {
      const today = new Date()
      const target = new Date(goal.target_date)
      const monthsLeft = Math.round(
        (target.getFullYear() - today.getFullYear()) * 12 + (target.getMonth() - today.getMonth())
      )
      if (monthsLeft <= 0) return { text: `Target date passed — €${fmt(remaining)} still to go.`, icon: "schedule", color: "text-error" }
      const monthly = Math.ceil(remaining / monthsLeft)
      return {
        text: `Save €${fmt(monthly)}/month to hit this by ${target.toLocaleDateString('en-IE', { month: 'short', year: 'numeric' })}.`,
        icon: "lightbulb",
        color: "text-primary",
      }
    }

    if (pct < 5)  return { text: "Every euro counts — start small and be consistent.", icon: "emoji_objects", color: "text-primary" }
    return { text: `€${fmt(remaining)} to go — you've got this!`, icon: "trending_up", color: "text-primary" }
  }

  async function handleAddGoal(e: React.FormEvent) {
    e.preventDefault()
    if (!newGoalName || !newGoalTarget) return
    setGoalSaving(true)
    const { data: { session } } = await supabase.auth.getSession()
    const { data } = await supabase.from('savings_goals').insert({
      user_id:        session!.user.id,
      name:           newGoalName.trim(),
      target_amount:  Number(newGoalTarget),
      current_amount: 0,
      target_date:    newGoalDate || null,
    }).select().single()
    if (data) {
      setGoals(g => [...g, data as SavingsGoal])
      setNewGoalName(''); setNewGoalTarget(''); setNewGoalDate('')
      setAddingGoal(false)
    }
    setGoalSaving(false)
  }

  async function handleUpdateGoal(goalId: string) {
    if (updateAmount === '') return
    setGoalSaving(true)
    const goal = goals.find(g => g.id === goalId)
    if (!goal) { setGoalSaving(false); return }
    const newAmount = Math.min(goal.current_amount + Number(updateAmount), goal.target_amount)
    const { data } = await supabase.from('savings_goals')
      .update({ current_amount: newAmount })
      .eq('id', goalId).select().single()
    if (data) {
      setGoals(g => g.map(g2 => g2.id === goalId ? data as SavingsGoal : g2))
      setUpdatingGoalId(null); setUpdateAmount('')
    }
    setGoalSaving(false)
  }

  async function handleEditGoalSave(e: React.FormEvent, goalId: string) {
    e.preventDefault()
    setGoalSaving(true)
    const { data } = await supabase.from('savings_goals')
      .update({
        name:          editGoalName.trim(),
        target_amount: Number(editGoalTarget),
        target_date:   editGoalDate || null,
      })
      .eq('id', goalId).select().single()
    if (data) {
      setGoals(g => g.map(g2 => g2.id === goalId ? data as SavingsGoal : g2))
      setEditingGoalId(null)
    }
    setGoalSaving(false)
  }

  async function handleDeleteGoal(goalId: string) {
    setGoalSaving(true)
    await supabase.from('savings_goals').delete().eq('id', goalId)
    setGoals(g => g.filter(g2 => g2.id !== goalId))
    setConfirmDeleteGoalId(null)
    setGoalSaving(false)
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
          <div id="tax-form" className="md:col-span-12 lg:col-span-7 bg-surface-container-low rounded-2xl p-8 border border-outline-variant/10 scroll-mt-24">
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
                <Link href="/calculator">
                  <button className="signature-gradient text-white font-bold py-2.5 px-5 rounded-xl text-sm">
                    Go to Calculator
                  </button>
                </Link>
              </div>
            )}

            {/* State: income profile exists but no tax profile yet (or editing) */}
            {profile && !calcResult && !calcLoading && (
              <form onSubmit={handleTaxFormSubmit} className="space-y-8">
                <div className="bg-primary-container/20 rounded-xl p-4 flex gap-3 items-start border border-primary/20">
                  <span className="material-symbols-outlined text-primary mt-0.5 flex-shrink-0">lock_open</span>
                  <div>
                    <p className="text-sm font-bold text-on-surface leading-tight">Unlock Your Optimizer</p>
                    <p className="text-xs text-on-surface-variant leading-relaxed mt-1">
                      Complete these additional details once to calculate your exact legal limits for pension and investment optimization.
                    </p>
                  </div>
                </div>

                {/* --- SECTION 1: Employment & Status --- */}
                <div className="space-y-4">
                  <h4 className="font-bold text-sm text-primary uppercase tracking-widest border-b border-outline-variant/20 pb-2">1. Employment & Status</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-medium text-on-surface-variant">Employment type</label>
                      <div className="flex gap-2">
                        {(['PAYE', 'Self-Employed'] as const).map(t => (
                          <button key={t} type="button" onClick={() => setFormData(d => ({ ...d, employment_type: t }))}
                            className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-colors ${formData.employment_type === t ? 'bg-primary text-white shadow-md' : 'bg-surface-container-lowest border border-outline-variant/20 text-on-surface hover:bg-surface-container-high'}`}
                          >{t}</button>
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-medium text-on-surface-variant">Tax Year</label>
                      <select value={formData.tax_year} onChange={e => setFormData(d => ({ ...d, tax_year: Number(e.target.value) }))}
                        className="bg-surface-container-lowest border border-outline-variant/20 rounded-xl py-3 px-4 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
                      >
                        <option value={2026}>2026 (Projections)</option>
                        <option value={2025}>2025 (Current)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* --- SECTION 2: Extra Income --- */}
                <div className="space-y-4">
                  <h4 className="font-bold text-sm text-primary uppercase tracking-widest border-b border-outline-variant/20 pb-2">2. Additional Annual Income</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-medium text-on-surface-variant">Spouse/2nd Income (€)</label>
                      <input type="number" value={formData.second_income || ''} onChange={e => setFormData(d => ({ ...d, second_income: Number(e.target.value) }))}
                        className="bg-surface-container-lowest border border-outline-variant/20 rounded-xl py-2.5 px-4 text-sm" placeholder="0" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-medium text-on-surface-variant">Rent-a-Room (€)</label>
                      <input type="number" value={formData.rent_a_room_income || ''} onChange={e => setFormData(d => ({ ...d, rent_a_room_income: Number(e.target.value) }))}
                        className="bg-surface-container-lowest border border-outline-variant/20 rounded-xl py-2.5 px-4 text-sm" placeholder="Tax-free < €14k" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-medium text-on-surface-variant">Micro-gen (€)</label>
                      <input type="number" value={formData.micro_generation_income || ''} onChange={e => setFormData(d => ({ ...d, micro_generation_income: Number(e.target.value) }))}
                        className="bg-surface-container-lowest border border-outline-variant/20 rounded-xl py-2.5 px-4 text-sm" placeholder="Solar/Wind" />
                    </div>
                  </div>
                </div>

                {/* --- SECTION 3: Life Circumstances (Tax Credits) --- */}
                <div className="space-y-4">
                  <h4 className="font-bold text-sm text-primary uppercase tracking-widest border-b border-outline-variant/20 pb-2">3. Life Circumstances (Automatic Credits)</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {[
                      { key: 'is_blind', label: 'Blind Credit', icon: 'visibility_off' },
                      { key: 'has_incapacitated_child', label: 'Incap. Child', icon: 'child_care' },
                      { key: 'claims_home_carer', label: 'Home Carer', icon: 'home_health' },
                      { key: 'claims_single_child_carer', label: 'Single Carer', icon: 'person_raised_hand' },
                      { key: 'claims_dependent_relative', label: 'Dep. Relative', icon: 'family_restroom' },
                      { key: 'medical_card', label: 'Medical Card', icon: 'medical_card' },
                    ].map(item => (
                      <button key={item.key} type="button" onClick={() => setFormData(d => ({ ...d, [item.key]: !d[item.key as keyof TaxFormData] }))}
                        className={`flex items-center gap-2 p-3 rounded-xl text-xs font-bold transition-all border ${formData[item.key as keyof TaxFormData] ? 'bg-primary/10 border-primary text-primary' : 'bg-surface-container-lowest border-outline-variant/20 text-on-surface-variant hover:border-primary/50'}`}
                      >
                        <span className="material-symbols-outlined text-lg">{item.icon}</span>
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* --- SECTION 4: Expenses & Reliefs --- */}
                <div className="space-y-4">
                  <h4 className="font-bold text-sm text-primary uppercase tracking-widest border-b border-outline-variant/20 pb-2">4. Expenses & Deductions</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-medium text-on-surface-variant">Annual Rent Paid (€)</label>
                        <input type="number" value={formData.annual_rent_paid || ''} onChange={e => setFormData(d => ({ ...d, annual_rent_paid: Number(e.target.value) }))}
                          className="bg-surface-container-lowest border border-outline-variant/20 rounded-xl py-2.5 px-4 text-sm" placeholder="0" />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-medium text-on-surface-variant">Qualifying Health Expenses (€)</label>
                        <input type="number" value={formData.qualifying_health_expenses || ''} onChange={e => setFormData(d => ({ ...d, qualifying_health_expenses: Number(e.target.value) }))}
                          className="bg-surface-container-lowest border border-outline-variant/20 rounded-xl py-2.5 px-4 text-sm" placeholder="Doctors, Meds, etc." />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-medium text-on-surface-variant">Nursing Home Fees (€)</label>
                        <input type="number" value={formData.nursing_home_fees || ''} onChange={e => setFormData(d => ({ ...d, nursing_home_fees: Number(e.target.value) }))}
                          className="bg-surface-container-lowest border border-outline-variant/20 rounded-xl py-2.5 px-4 text-sm" placeholder="0" />
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-medium text-on-surface-variant">Employer Health Premium (€)</label>
                        <input type="number" value={formData.employer_health_premium || ''} onChange={e => setFormData(d => ({ ...d, employer_health_premium: Number(e.target.value) }))}
                          className="bg-surface-container-lowest border border-outline-variant/20 rounded-xl py-2.5 px-4 text-sm" placeholder="BIK value" />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-medium text-on-surface-variant">Benefits in Kind (BIK) (€)</label>
                        <input type="number" value={formData.bik || ''} onChange={e => setFormData(d => ({ ...d, bik: Number(e.target.value) }))}
                          className="bg-surface-container-lowest border border-outline-variant/20 rounded-xl py-2.5 px-4 text-sm" placeholder="Company Car, etc." />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-medium text-on-surface-variant">Flat Rate Expenses (€)</label>
                        <input type="number" value={formData.flat_rate_expense || ''} onChange={e => setFormData(d => ({ ...d, flat_rate_expense: Number(e.target.value) }))}
                          className="bg-surface-container-lowest border border-outline-variant/20 rounded-xl py-2.5 px-4 text-sm" placeholder="Trade-specific" />
                      </div>
                    </div>
                  </div>
                </div>

                {calcError && (
                  <p className="text-sm text-error flex items-center gap-2">
                    <span className="material-symbols-outlined text-base">error</span>
                    {calcError}
                  </p>
                )}

                <button type="submit"
                  className="w-full signature-gradient text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-lg text-lg"
                >
                  Confirm Details & Unlock Optimizer
                  <span className="material-symbols-outlined">analytics</span>
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

                  {/* Optimization Action Card */}
                  <div className="mt-10 p-8 bg-surface-container-highest rounded-[2.5rem] border-2 border-primary/30 shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:rotate-12 transition-transform duration-500">
                      <span className="material-symbols-outlined text-8xl text-primary">rocket_launch</span>
                    </div>
                    
                    <div className="relative z-10 space-y-6">
                      <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary text-white text-xs font-black uppercase tracking-widest">
                        Recommended Next Step
                      </div>
                      
                      <div>
                        <h4 className="text-3xl font-black text-on-surface leading-tight">Pay Less Tax in 2026</h4>
                        <p className="text-on-surface-variant text-lg mt-2 max-w-md">
                          We've analyzed your €{fmt(gross)} income. You could potentially reclaim thousands by optimizing your pension and benefits.
                        </p>
                      </div>

                      <Link href="/optimize-tax" className="block">
                        <button className="w-full sm:w-auto signature-gradient text-white font-black py-5 px-10 rounded-2xl shadow-xl shadow-primary/30 active:scale-95 transition-all flex items-center justify-center gap-3 text-xl">
                          <span className="material-symbols-outlined">auto_fix_high</span>
                          Start Optimization
                        </button>
                      </Link>
                    </div>
                  </div>
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
            <div className="flex justify-between items-center mb-8">
              <div>
                <h3 className="text-2xl font-bold">Savings Goals</h3>
                {goals.length > 0 && (
                  <p className="text-on-surface-variant text-sm mt-0.5">
                    {goals.filter(g => g.current_amount >= g.target_amount).length} of {goals.length} reached
                  </p>
                )}
              </div>
              <button
                onClick={() => { setAddingGoal(a => !a); setNewGoalName(''); setNewGoalTarget(''); setNewGoalDate('') }}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-colors ${addingGoal ? 'bg-surface-container-low text-on-surface-variant' : 'signature-gradient text-white shadow-sm'}`}
              >
                <span className="material-symbols-outlined text-base">{addingGoal ? 'close' : 'add'}</span>
                {addingGoal ? 'Cancel' : 'Add Goal'}
              </button>
            </div>

            {/* Add goal form */}
            {addingGoal && (
              <form onSubmit={handleAddGoal} className="bg-surface-container-low rounded-2xl p-6 mb-8 space-y-4">
                <p className="font-bold text-sm text-on-surface-variant uppercase tracking-wide">New Goal</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex flex-col gap-1.5 md:col-span-1">
                    <label className="text-xs font-medium text-on-surface-variant">Goal name</label>
                    <input
                      required placeholder="e.g. House Deposit"
                      value={newGoalName} onChange={e => setNewGoalName(e.target.value)}
                      className="bg-surface-container-lowest border border-outline-variant/20 rounded-xl py-3 px-4 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-on-surface-variant">Target amount (€)</label>
                    <input
                      required type="number" min={1} placeholder="e.g. 20000"
                      value={newGoalTarget} onChange={e => setNewGoalTarget(e.target.value)}
                      className="bg-surface-container-lowest border border-outline-variant/20 rounded-xl py-3 px-4 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-on-surface-variant">Target date <span className="opacity-60">(optional)</span></label>
                    <input
                      type="date"
                      value={newGoalDate} onChange={e => setNewGoalDate(e.target.value)}
                      className="bg-surface-container-lowest border border-outline-variant/20 rounded-xl py-3 px-4 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
                    />
                  </div>
                </div>
                <button
                  type="submit" disabled={goalSaving}
                  className="signature-gradient text-white font-bold py-2.5 px-6 rounded-xl text-sm disabled:opacity-60 flex items-center gap-2"
                >
                  {goalSaving ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <span className="material-symbols-outlined text-base">add</span>}
                  Save Goal
                </button>
              </form>
            )}

            {goals.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {goals.map(goal => {
                  const pct       = goal.target_amount > 0 ? Math.min((goal.current_amount / goal.target_amount) * 100, 100) : 0
                  const remaining = Math.max(0, goal.target_amount - goal.current_amount)
                  const nudge     = goalNudge(goal)
                  const done      = pct >= 100
                  const isAdding  = updatingGoalId === goal.id
                  const isEditing = editingGoalId  === goal.id
                  const isDeleting= confirmDeleteGoalId === goal.id

                  return (
                    <div key={goal.id} className="bg-surface-container-low rounded-2xl p-5 space-y-4 flex flex-col">

                      {/* ── Edit goal details form ── */}
                      {isEditing ? (
                        <form onSubmit={e => handleEditGoalSave(e, goal.id)} className="space-y-3">
                          <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wide">Edit Goal</p>
                          <input
                            required autoFocus
                            placeholder="Goal name"
                            value={editGoalName} onChange={e => setEditGoalName(e.target.value)}
                            className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl py-2.5 px-4 text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                          />
                          <div className="flex gap-2">
                            <div className="relative flex-1">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-xs">€</span>
                              <input
                                required type="number" min={1} placeholder="Target"
                                value={editGoalTarget} onChange={e => setEditGoalTarget(e.target.value)}
                                className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl py-2.5 pl-6 pr-3 text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                              />
                            </div>
                            <input
                              type="date"
                              value={editGoalDate} onChange={e => setEditGoalDate(e.target.value)}
                              className="flex-1 bg-surface-container-lowest border border-outline-variant/20 rounded-xl py-2.5 px-3 text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                            />
                          </div>
                          <div className="flex gap-2">
                            <button type="submit" disabled={goalSaving}
                              className="flex-1 bg-primary text-white rounded-xl py-2.5 text-sm font-bold disabled:opacity-60 flex items-center justify-center gap-1"
                            >
                              {goalSaving ? <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Save'}
                            </button>
                            <button type="button" onClick={() => setEditingGoalId(null)}
                              className="px-4 bg-surface-container-high text-on-surface-variant rounded-xl text-sm font-medium"
                            >Cancel</button>
                          </div>
                        </form>
                      ) : (
                        <>
                          {/* Header */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="font-bold text-base leading-tight truncate">{goal.name}</p>
                              {goal.target_date && (
                                <p className="text-xs text-on-surface-variant mt-0.5">
                                  by {new Date(goal.target_date).toLocaleDateString('en-IE', { month: 'short', year: 'numeric' })}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              {done
                                ? <span className="material-symbols-outlined text-primary text-xl">check_circle</span>
                                : (
                                  <button onClick={() => { setUpdatingGoalId(isAdding ? null : goal.id); setUpdateAmount('') }}
                                    className={`p-1 rounded-lg transition-colors ${isAdding ? 'text-primary' : 'text-on-surface-variant hover:text-primary'}`}
                                    title="Add savings"
                                  >
                                    <span className="material-symbols-outlined text-lg">{isAdding ? 'close' : 'add_circle'}</span>
                                  </button>
                                )
                              }
                              <button
                                onClick={() => {
                                  setEditingGoalId(goal.id)
                                  setEditGoalName(goal.name)
                                  setEditGoalTarget(String(goal.target_amount))
                                  setEditGoalDate(goal.target_date ?? '')
                                  setUpdatingGoalId(null)
                                  setConfirmDeleteGoalId(null)
                                }}
                                className="p-1 rounded-lg text-on-surface-variant hover:text-primary transition-colors"
                                title="Edit goal"
                              >
                                <span className="material-symbols-outlined text-lg">edit</span>
                              </button>
                              <button
                                onClick={() => setConfirmDeleteGoalId(isDeleting ? null : goal.id)}
                                className={`p-1 rounded-lg transition-colors ${isDeleting ? 'text-error' : 'text-on-surface-variant hover:text-error'}`}
                                title="Delete goal"
                              >
                                <span className="material-symbols-outlined text-lg">delete</span>
                              </button>
                            </div>
                          </div>

                          {/* Progress bar */}
                          <div>
                            <div className="h-2.5 bg-surface-container-high rounded-full overflow-hidden mb-2">
                              <div
                                className={`h-full rounded-full transition-all ${done ? 'bg-primary' : 'emerald-gradient'}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <div className="flex justify-between text-xs text-on-surface-variant">
                              <span className="font-bold">€{fmt(goal.current_amount)} saved</span>
                              <span>{pct.toFixed(0)}% of €{fmt(goal.target_amount)}</span>
                            </div>
                          </div>

                          {/* Add savings inline form */}
                          {isAdding && (
                            <div className="flex gap-2 items-center">
                              <div className="relative flex-1">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm">€</span>
                                <input
                                  type="number" min={0} autoFocus
                                  placeholder="Amount to add"
                                  value={updateAmount} onChange={e => setUpdateAmount(e.target.value)}
                                  className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl py-2.5 pl-7 pr-3 text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                                />
                              </div>
                              <button
                                onClick={() => handleUpdateGoal(goal.id)} disabled={goalSaving}
                                className="bg-primary text-white rounded-xl px-4 py-2.5 text-sm font-bold disabled:opacity-60 flex items-center gap-1"
                              >
                                {goalSaving ? <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Add'}
                              </button>
                            </div>
                          )}

                          {/* Nudge */}
                          <div className={`flex items-start gap-2 text-xs ${nudge.color} mt-auto pt-1`}>
                            <span className="material-symbols-outlined text-base flex-shrink-0 mt-px" style={{ fontVariationSettings: '"FILL" 1' }}>{nudge.icon}</span>
                            <span className="leading-relaxed">{nudge.text}</span>
                          </div>
                        </>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              !addingGoal && (
                <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
                  <span className="material-symbols-outlined text-5xl text-on-surface-variant/30">savings</span>
                  <p className="text-on-surface-variant text-sm">No savings goals yet</p>
                  <p className="text-xs text-on-surface-variant/60 max-w-xs">Set a goal and track your progress.</p>
                  <button
                    onClick={() => setAddingGoal(true)}
                    className="signature-gradient text-white font-bold py-2.5 px-5 rounded-xl text-sm mt-2 flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-base">add</span>
                    Set your first goal
                  </button>
                </div>
              )
            )}
          </div>

        </div>
      </main>

      <BottomNavBar />
    </div>
  )
}
