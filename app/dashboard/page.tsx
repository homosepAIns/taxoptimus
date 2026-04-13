'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import BottomNavBar from '@/components/BottomNavBar'
import TopAppBar from '@/components/TopAppBar'
import { supabase, type IncomeProfile, type Transaction, type SavingsGoal } from '@/lib/supabase'

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
export default function DashboardPage() {
  const router = useRouter()
  const [loading,      setLoading]      = useState(true)
  const [userName,     setUserName]     = useState('')
  const [profile,      setProfile]      = useState<IncomeProfile | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [goals,        setGoals]        = useState<SavingsGoal[]>([])

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

      const [profileRes, txRes, goalsRes] = await Promise.all([
        supabase.from('income_profiles')
          .select('*').eq('user_id', user.id)
          .order('created_at', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('transactions')
          .select('*').eq('user_id', user.id)
          .order('transaction_date', { ascending: false }).limit(200),
        supabase.from('savings_goals')
          .select('*').eq('user_id', user.id)
          .order('created_at', { ascending: true }),
      ])

      if (profileRes.data) setProfile(profileRes.data as IncomeProfile)
      if (txRes.data)      setTransactions(txRes.data as Transaction[])
      if (goalsRes.data)   setGoals(goalsRes.data as SavingsGoal[])
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
                <p className="text-on-surface-variant text-sm">2024 Irish tax · based on your profile</p>
              </div>
              <span className="material-symbols-outlined text-primary text-2xl" style={{ fontVariationSettings: '"FILL" 1' }}>receipt_long</span>
            </div>

            {profile ? (
              <>
                {/* Stacked bar */}
                <div className="h-5 rounded-full overflow-hidden flex gap-px mb-5">
                  <div className="bg-error/70 rounded-l-full"     style={{ width: `${incomeTaxPct}%` }} title="Income Tax" />
                  <div className="bg-orange-400/70"                style={{ width: `${uscPct}%` }}      title="USC" />
                  <div className="bg-tertiary/70"                  style={{ width: `${prsiPct}%` }}     title="PRSI" />
                  <div className="bg-primary rounded-r-full flex-1"                                     title="Take-home" />
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

                <div className="grid grid-cols-2 gap-x-8 gap-y-4 mb-6">
                  {[
                    { label: 'Gross Income',     value: `€${fmt(gross)}/yr`,                       cls: '' },
                    { label: 'Income Tax',        value: `€${fmt(profile.income_tax_annual)}/yr`,   cls: 'text-error' },
                    { label: 'USC',               value: `€${fmt(profile.usc_annual)}/yr`,          cls: 'text-on-surface-variant' },
                    { label: 'PRSI',              value: `€${fmt(profile.prsi_annual)}/yr`,         cls: 'text-on-surface-variant' },
                    { label: 'Total Deductions',  value: `€${fmt(taxTotal)}/yr`,                    cls: 'text-error font-extrabold' },
                    { label: 'Net Take-Home',     value: `€${fmt(profile.net_monthly)}/mo`,         cls: 'text-primary font-extrabold' },
                  ].map(item => (
                    <div key={item.label}>
                      <p className="text-xs text-on-surface-variant uppercase tracking-wide mb-0.5">{item.label}</p>
                      <p className={`font-bold text-base ${item.cls}`}>{item.value}</p>
                    </div>
                  ))}
                </div>

                {profile.potential_annual_saving && profile.potential_annual_saving > 0 && (
                  <div className="bg-surface-container-lowest p-4 rounded-xl flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary-container/20 rounded-full flex items-center justify-center text-primary flex-shrink-0">
                      <span className="material-symbols-outlined">lightbulb</span>
                    </div>
                    <p className="text-sm text-on-surface-variant">
                      A pension of <span className="font-bold text-on-surface">€{fmt(profile.pension_monthly ?? 0)}/month</span> could save you{' '}
                      <span className="font-bold text-primary">€{fmt(profile.potential_annual_saving)}/year</span> in tax relief.
                    </p>
                  </div>
                )}
              </>
            ) : (
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
