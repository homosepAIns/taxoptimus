'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, type TaxProfile } from '@/lib/supabase'
import BottomNavBar from '@/components/BottomNavBar'
import TopAppBar from '@/components/TopAppBar'

type SetupStep = 'core_income' | 'employment' | 'extra_income' | 'credits' | 'expenses' | 'future_invest' | 'ready'

export default function InvestPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [isOptimizing, setIsOptimizing] = useState(false)
  const [taxProfile, setTaxProfile] = useState<any>(null)
  
  // Setup Flow State
  const [setupStep, setSetupStep] = useState<SetupStep>('employment')
  const [needsCoreProfile, setNeedsCoreProfile] = useState(false)
  const [formData, setFormData] = useState<any>({
    gross_income: 0,
    tax_status: 'single',
    age: 30,
    employment_type: 'PAYE',
    tax_year: 2026,
    second_income: 0,
    rent_a_room_income: 0,
    micro_generation_income: 0,
    is_blind: false,
    has_incapacitated_child: false,
    claims_home_carer: false,
    claims_single_child_carer: false,
    claims_dependent_relative: false,
    medical_card: false,
    widowed_years_since: -1,
    annual_rent_paid: 0,
    qualifying_health_expenses: 0,
    nursing_home_fees: 0,
    employee_health_insurance: 0,
    qualifying_tuition_fees: 0,
    flat_rate_expense: 0,
    bik: 0,
    employer_health_premium: 0,
    remote_working_days: 0,
    annual_wfh_utility_costs: 0,
    additional_tax_credits: 0,
    eiis_max_willing: 0,
    deeds_max_willing: 0
  })

  // Bounds & Optimization
  const [bounds, setBounds] = useState<{ min_take_home: number; max_take_home: number } | null>(null)
  const [requiredLiquidCash, setRequiredLiquidCash] = useState(0)
  const [optimalInvestments, setOptimalInvestments] = useState<any>(null)
  const [calcData, setCalcData] = useState<any>(null)

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) { router.replace('/login'); return }
      
      // Fetch existing profiles if any
      const [incRes, taxRes] = await Promise.all([
        supabase.from('income_profiles').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('tax_profiles').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false }).limit(1).maybeSingle()
      ])
      
      if (!incRes.data) {
        setNeedsCoreProfile(true)
        setSetupStep('core_income')
      }

      const profile = taxRes.data
      
      if (profile && incRes.data) {
        setTaxProfile(profile)
        setFormData((prev: any) => ({ ...prev, ...profile, gross_income: incRes.data.gross_income, age: incRes.data.age, tax_status: incRes.data.tax_status }))
        setSetupStep('ready')
        fetchBounds(session.access_token)
      } else if (!incRes.data) {
        setSetupStep('core_income')
      } else {
        setSetupStep('employment')
      }
      setLoading(false)
    }
    load()
  }, [router])

  async function fetchBounds(token: string) {
    try {
      const res = await fetch('/api/tax/bounds', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile: {}, investments: {} })
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        console.error("Bounds error:", errData)
        alert(`Could not load optimization bounds: ${errData.error || res.statusText}\nPlease make sure you have filled out your Income Profile in the Dashboard.`)
        return
      }

      const bData = await res.json()
      if (bData.min_take_home) {
        setBounds(bData)
        setRequiredLiquidCash(Math.round((bData.max_take_home + bData.min_take_home) / 2))
      }
    } catch (err) {
      console.error("Failed to fetch bounds", err)
      alert("Failed to connect to the optimization engine.")
    }
  }

  async function handleSaveProfile() {
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    
    // Always save the latest core variables
    const { error: incError } = await supabase.from('income_profiles').insert({
      user_id: session?.user.id,
      gross_income: formData.gross_income,
      tax_status: formData.tax_status,
      age: formData.age,
      has_medical_card: formData.medical_card
    })
    if (incError) {
      console.error('Error saving basic profile:', incError)
      alert(`Error saving base profile: ${incError.message}`)
      setLoading(false)
      return
    }
    setNeedsCoreProfile(false) // Unset flag if it was true

    // Isolate the tax_profiles fields (remove the income_profile fields we temporarily stored in formData)
    const { gross_income, tax_status, age, ...taxData } = formData

    const { data, error } = await supabase.from('tax_profiles').upsert({
      user_id: session?.user.id,
      ...taxData
    }, { onConflict: 'user_id' }).select().single()

    if (error) {
      console.error('Error saving profile:', error)
      alert(`Error saving profile: ${error.message}`)
      setLoading(false)
      return
    }

    if (data) {
      setTaxProfile(data)
      setSetupStep('ready')
      fetchBounds(session!.access_token)
    }
    setLoading(false)
  }

  async function handleOptimize() {
    setIsOptimizing(true)
    const { data: { session } } = await supabase.auth.getSession()
    
    try {
      const res = await fetch('/api/tax/optimize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          required_liquid_cash: requiredLiquidCash
        })
      })
      const data = await res.json()
      if (data.optimal_investments) {
        setOptimalInvestments(data.optimal_investments)
        setCalcData(data.calculation)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setIsOptimizing(false)
    }
  }

  if (loading) return <div className="min-h-screen bg-surface flex items-center justify-center"><span className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>

  // ── RENDER: ONBOARDING WIZARD ───────────────────────────────────────────────
  if (setupStep !== 'ready') {
    return (
      <div className="bg-surface text-on-surface min-h-screen pb-32">
        <TopAppBar />
        <main className="pt-32 px-6 max-w-xl mx-auto">
          <div className="mb-10 text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4 text-primary">
              <span className="material-symbols-outlined text-3xl">query_stats</span>
            </div>
            <h1 className="text-3xl font-black">Strategy Onboarding</h1>
            <p className="text-on-surface-variant mt-2">Let's collect the missing pieces to build your tax strategy.</p>
          </div>

          <div className="bg-surface-container-low rounded-[2rem] p-8 border border-outline-variant/10 shadow-sm">
            {setupStep === 'core_income' && (
              <div className="space-y-6">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <span className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-xs">1</span>
                  Core Profile
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-on-surface-variant uppercase ml-1">Gross Annual Income (€)</label>
                    <input type="number" value={formData.gross_income || ''} onChange={e => setFormData({...formData, gross_income: Number(e.target.value)})}
                      className="w-full bg-surface-container-lowest border-none rounded-2xl py-4 px-5 mt-1 focus:ring-2 focus:ring-primary/20" placeholder="e.g. 50000" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-on-surface-variant uppercase ml-1">Age</label>
                    <input type="number" value={formData.age || ''} onChange={e => setFormData({...formData, age: Number(e.target.value)})}
                      className="w-full bg-surface-container-lowest border-none rounded-2xl py-4 px-5 mt-1 focus:ring-2 focus:ring-primary/20" placeholder="e.g. 30" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-on-surface-variant uppercase ml-1 block mb-1">Tax Status</label>
                    <select value={formData.tax_status} onChange={e => setFormData({...formData, tax_status: e.target.value})} className="w-full bg-surface-container-lowest border-none rounded-2xl py-4 px-5 focus:ring-2 focus:ring-primary/20">
                      <option value="single">Single</option>
                      <option value="married-one">Married (1 Income)</option>
                      <option value="married-two">Married (2 Incomes)</option>
                      <option value="one-parent">Single Parent</option>
                    </select>
                  </div>
                </div>
                <button type="button" onClick={() => setSetupStep('employment')} className="w-full bg-primary text-white py-4 rounded-2xl font-bold mt-4" disabled={!formData.gross_income}>Continue</button>
              </div>
            )}

            {setupStep === 'employment' && (
              <div className="space-y-6">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <span className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-xs">{needsCoreProfile ? '2' : '1'}</span>
                  Employment Type
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {['PAYE', 'Self-Employed'].map(t => (
                    <button key={t} type="button" onClick={() => setFormData({...formData, employment_type: t as any})}
                      className={`py-4 rounded-2xl font-bold border-2 transition-all ${formData.employment_type === t ? 'bg-primary/10 border-primary text-primary' : 'border-outline-variant/20 hover:border-primary/30'}`}
                    >{t}</button>
                  ))}
                </div>
                <div className="flex gap-3">
                  {needsCoreProfile && <button type="button" onClick={() => setSetupStep('core_income')} className="flex-1 bg-surface-container-high py-4 rounded-2xl font-bold">Back</button>}
                  <button type="button" onClick={() => setSetupStep('extra_income')} className="flex-[2] bg-primary text-white py-4 rounded-2xl font-bold mt-4">Continue</button>
                </div>
              </div>
            )}

            {setupStep === 'extra_income' && (
              <div className="space-y-6">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <span className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-xs">{needsCoreProfile ? '3' : '2'}</span>
                  Additional Income
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-on-surface-variant uppercase ml-1">Spouse / 2nd Income (€)</label>
                    <input type="number" value={formData.second_income} onChange={e => setFormData({...formData, second_income: Number(e.target.value)})}
                      className="w-full bg-surface-container-lowest border-none rounded-2xl py-4 px-5 mt-1 focus:ring-2 focus:ring-primary/20" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-on-surface-variant uppercase ml-1">Rent-a-Room Income (€)</label>
                    <input type="number" value={formData.rent_a_room_income} onChange={e => setFormData({...formData, rent_a_room_income: Number(e.target.value)})}
                      className="w-full bg-surface-container-lowest border-none rounded-2xl py-4 px-5 mt-1 focus:ring-2 focus:ring-primary/20" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-on-surface-variant uppercase ml-1">Micro-gen Income (€)</label>
                    <input type="number" value={formData.micro_generation_income} onChange={e => setFormData({...formData, micro_generation_income: Number(e.target.value)})}
                      className="w-full bg-surface-container-lowest border-none rounded-2xl py-4 px-5 mt-1 focus:ring-2 focus:ring-primary/20" />
                  </div>
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setSetupStep('employment')} className="flex-1 bg-surface-container-high py-4 rounded-2xl font-bold">Back</button>
                  <button type="button" onClick={() => setSetupStep('credits')} className="flex-[2] bg-primary text-white py-4 rounded-2xl font-bold">Continue</button>
                </div>
              </div>
            )}

            {setupStep === 'credits' && (
              <div className="space-y-6">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <span className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-xs">{needsCoreProfile ? '4' : '3'}</span>
                  Tax Credits
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { key: 'medical_card', label: 'Medical Card', icon: 'badge' },
                    { key: 'claims_home_carer', label: 'Home Carer', icon: 'home_health' },
                    { key: 'is_blind', label: 'Reg. Blind', icon: 'visibility_off' },
                    { key: 'has_incapacitated_child', label: 'Incap. Child', icon: 'child_care' },
                    { key: 'claims_single_child_carer', label: 'Single Carer', icon: 'person_raised_hand' },
                    { key: 'claims_dependent_relative', label: 'Dep. Relative', icon: 'family_restroom' }
                  ].map(item => (
                    <button key={item.key} type="button" onClick={() => setFormData({...formData, [item.key]: !formData[item.key]})}
                      className={`flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border-2 transition-all ${formData[item.key] ? 'bg-primary/10 border-primary text-primary' : 'border-outline-variant/20 bg-surface-container-lowest'}`}
                    >
                      <span className="material-symbols-outlined text-2xl">{item.icon}</span>
                      <span className="font-bold text-xs text-center">{item.label}</span>
                    </button>
                  ))}
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setSetupStep('extra_income')} className="flex-1 bg-surface-container-high py-4 rounded-2xl font-bold">Back</button>
                  <button type="button" onClick={() => setSetupStep('expenses')} className="flex-[2] bg-primary text-white py-4 rounded-2xl font-bold">Continue</button>
                </div>
              </div>
            )}

            {setupStep === 'expenses' && (
              <div className="space-y-6">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <span className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-xs">{needsCoreProfile ? '5' : '4'}</span>
                  Expenses & Claims
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[45vh] overflow-y-auto pr-2 pb-4">
                  {[
                    { key: 'annual_rent_paid', label: 'Annual Rent (€)' },
                    { key: 'qualifying_health_expenses', label: 'Health Expenses (€)' },
                    { key: 'nursing_home_fees', label: 'Nursing Home Fees (€)' },
                    { key: 'employee_health_insurance', label: 'Health Insurance (€)' },
                    { key: 'qualifying_tuition_fees', label: 'Tuition Fees (€)' },
                    { key: 'flat_rate_expense', label: 'Flat Rate Expenses (€)' },
                    { key: 'bik', label: 'Benefits in Kind (€)' },
                    { key: 'employer_health_premium', label: 'Employer Health Prem. (€)' },
                    { key: 'additional_tax_credits', label: 'Misc Tax Credits (€)' },
                  ].map(field => (
                    <div key={field.key}>
                      <label className="text-[10px] font-bold text-on-surface-variant uppercase ml-1 block truncate">{field.label}</label>
                      <input type="number" value={formData[field.key as keyof typeof formData] as number} onChange={e => setFormData({...formData, [field.key]: Number(e.target.value)})}
                        className="w-full bg-surface-container-lowest border border-outline-variant/10 rounded-2xl py-3 px-4 mt-1 focus:ring-2 focus:ring-primary/20 text-sm" />
                    </div>
                  ))}
                </div>
                <div className="flex gap-3 pt-4 border-t border-outline-variant/10">
                  <button type="button" onClick={() => setSetupStep('credits')} className="flex-1 bg-surface-container-high py-4 rounded-2xl font-bold">Back</button>
                  <button type="button" onClick={() => setSetupStep('future_invest')} className="flex-[2] bg-primary text-white py-4 rounded-2xl font-bold">Continue</button>
                </div>
              </div>
            )}

            {setupStep === 'future_invest' && (
              <div className="space-y-6">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <span className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-xs">{needsCoreProfile ? '6' : '5'}</span>
                  Investment Appetite
                </h3>
                <p className="text-sm text-on-surface-variant">Tell us what limits you want to place on advanced tax shelters.</p>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-on-surface-variant uppercase ml-1">Max EIIS Investment / yr (€)</label>
                    <input type="number" value={formData.eiis_max_willing || ''} onChange={e => setFormData({...formData, eiis_max_willing: Number(e.target.value)})}
                      className="w-full bg-surface-container-lowest border border-outline-variant/10 rounded-2xl py-4 px-5 mt-1 focus:ring-2 focus:ring-primary/20 text-sm" placeholder="e.g. 5000" />
                    <p className="text-[10px] text-on-surface-variant/70 mt-1 ml-2">High-risk startup investments with massive tax reliefs.</p>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-on-surface-variant uppercase ml-1">Max Deeds of Covenant / yr (€)</label>
                    <input type="number" value={formData.deeds_max_willing || ''} onChange={e => setFormData({...formData, deeds_max_willing: Number(e.target.value)})}
                      className="w-full bg-surface-container-lowest border border-outline-variant/10 rounded-2xl py-4 px-5 mt-1 focus:ring-2 focus:ring-primary/20 text-sm" placeholder="e.g. 2000" />
                    <p className="text-[10px] text-on-surface-variant/70 mt-1 ml-2">Formal legal payments to dependents, adult children, or elderly parents.</p>
                  </div>
                </div>
                <div className="flex gap-3 pt-4 border-t border-outline-variant/10">
                  <button type="button" onClick={() => setSetupStep('expenses')} className="flex-1 bg-surface-container-high py-4 rounded-2xl font-bold">Back</button>
                  <button type="button" onClick={handleSaveProfile} className="flex-[2] signature-gradient text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2">
                    {loading ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Finish & Optimize'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </main>
        <BottomNavBar />
      </div>
    )
  }

  // ── RENDER: MAIN OPTIMIZATION UI ───────────────────────────────────────────
  return (
    <div className="bg-surface text-on-surface min-h-screen pb-32">
      <TopAppBar />

      <main className="pt-24 px-6 max-w-5xl mx-auto">
        <header className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight mb-2">Maximize My Savings</h1>
            <p className="text-on-surface-variant text-lg">Decide your take-home pay, and we'll optimize the rest.</p>
          </div>
          <button type="button"
            onClick={() => setSetupStep('core_income')}
            className="flex items-center gap-2 px-4 py-2 bg-surface-container-high hover:bg-surface-container-highest text-sm font-bold rounded-xl transition-colors border border-outline-variant/10"
          >
            <span className="material-symbols-outlined text-lg">tune</span>
            Edit Variables
          </button>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left: The Big Question */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-surface-container-lowest p-8 rounded-3xl border border-outline-variant/10 shadow-sm">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">payments</span>
                The Cash Question
              </h3>

              {bounds ? (
                <div className="space-y-10">
                  <div className="space-y-4">
                    <div className="flex justify-between items-end">
                      <label className="text-sm font-bold text-on-surface-variant uppercase tracking-wider">Desired Annual Take-Home</label>
                      <span className="text-4xl font-black text-primary">€{requiredLiquidCash.toLocaleString()}</span>
                    </div>
                    
                    <input
                      className="w-full h-3 bg-surface-container-high rounded-full appearance-none cursor-pointer accent-primary"
                      max={bounds.max_take_home} 
                      min={bounds.min_take_home} 
                      step={500} 
                      type="range"
                      value={requiredLiquidCash}
                      onChange={(e) => setRequiredLiquidCash(Number(e.target.value))}
                    />

                    <div className="flex justify-between text-[11px] font-bold text-on-surface-variant uppercase pt-1">
                      <div className="text-left">
                        <p className="opacity-60 mb-0.5">Absolute Minimum</p>
                        <p className="text-on-surface">€{Math.round(bounds.min_take_home).toLocaleString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="opacity-60 mb-0.5">Absolute Maximum</p>
                        <p className="text-on-surface">€{Math.round(bounds.max_take_home).toLocaleString()}</p>
                      </div>
                    </div>
                  </div>

                  <button type="button"
                    onClick={handleOptimize}
                    disabled={isOptimizing}
                    className="w-full signature-gradient text-white py-5 rounded-2xl font-black text-xl shadow-xl shadow-primary/20 active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                  >
                    {isOptimizing ? <span className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin" /> : <><span className="material-symbols-outlined">auto_fix_high</span> Optimize Strategy</>}
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 gap-4">
                  <span className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                  <p className="text-sm text-on-surface-variant">Calculating your limits…</p>
                </div>
              )}
            </div>
          </div>

          {/* Right: The Strategy */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-surface-container-lowest p-8 rounded-3xl border border-outline-variant/10 min-h-[560px] flex flex-col shadow-sm">
              <div className="flex justify-between items-start mb-10">
                <div>
                  <h3 className="text-2xl font-black">Mathematical Strategy</h3>
                  <p className="text-on-surface-variant text-sm">Where your money is working for you</p>
                </div>
                {calcData && (
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Effective Tax Rate</p>
                    <p className="text-2xl font-black text-primary">{calcData['Summary']['Effective Tax Rate (%)']}%</p>
                  </div>
                )}
              </div>

              {optimalInvestments ? (
                <div className="flex-1 flex flex-col">
                  <div className="space-y-8 flex-1">
                    {[
                      { id: 'pension', label: 'Pension (PRSA)', amount: optimalInvestments.pension_contribution, color: 'bg-primary', icon: 'savings', desc: 'Saves tax at your highest rate (40%).', maxVal: bounds?.max_pension || 1 },
                      { id: 'eiis', label: 'EIIS Investment', amount: optimalInvestments.eiis_investment, color: 'bg-purple-500', icon: 'trending_up', desc: 'Direct deduction from taxable income up to €500k.', maxVal: bounds?.max_eiis || 1 },
                      { id: 'deeds', label: 'Deeds of Covenant', amount: optimalInvestments.deeds_of_covenant, color: 'bg-rose-500', icon: 'diversity_1', desc: 'Support dependents legally, pre-tax.', maxVal: bounds?.max_deeds || 1 },
                      { id: 'cycle', label: 'Cycle to Work', amount: optimalInvestments.cycle_to_work, color: 'bg-emerald-500', icon: 'directions_bike', desc: 'Pre-tax bike purchase.', maxVal: bounds?.max_cycle || 1 },
                      { id: 'travel', label: 'Travel Pass', amount: optimalInvestments.travel_pass, color: 'bg-blue-500', icon: 'train', desc: 'Tax-free public transport.', maxVal: bounds?.max_travel || 1 },
                      { id: 'ip', label: 'Income Protection', amount: optimalInvestments.income_protection_premium, color: 'bg-amber-500', icon: 'security', desc: '20% tax credit on premiums.', maxVal: bounds?.max_ip || 1 },
                    ].filter(item => item.amount > 0).map((item) => (
                      <div key={item.id} className="relative group">
                        <div className="flex justify-between items-end mb-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl ${item.color.replace('bg-', 'bg-opacity-10 text-')} flex items-center justify-center`}>
                              <span className="material-symbols-outlined">{item.icon}</span>
                            </div>
                            <div>
                              <p className="font-bold text-lg leading-none">{item.label}</p>
                              <p className="text-xs text-on-surface-variant mt-1">{item.desc}</p>
                            </div>
                          </div>
                          <p className="text-2xl font-black">€{Math.round(item.amount).toLocaleString()}</p>
                        </div>
                        <div className="h-3 bg-surface-container-high rounded-full overflow-hidden">
                          <div className={`h-full ${item.color} rounded-full transition-all duration-700`} style={{ width: `${Math.min(100, (item.amount / item.maxVal) * 100)}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-12 p-8 bg-surface-container-highest rounded-3xl border border-outline-variant/20 shadow-lg">
                    <h4 className="text-xl font-black mb-6">Investment Impact Breakdown</h4>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center text-sm border-b border-outline-variant/10 pb-3">
                        <span className="font-medium text-on-surface-variant flex items-center gap-2">
                          <span className="material-symbols-outlined text-base">account_balance_wallet</span>
                          Total Value of Assets & Benefits Generated
                        </span>
                        <span className="font-black text-lg">€{Math.round(optimalInvestments.pension_contribution + optimalInvestments.cycle_to_work + optimalInvestments.travel_pass + optimalInvestments.income_protection_premium + optimalInvestments.eiis_investment + optimalInvestments.deeds_of_covenant).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm border-b border-outline-variant/10 pb-3">
                        <span className="font-medium text-emerald-600 flex items-center gap-2">
                          <span className="material-symbols-outlined text-base">shield</span>
                          Total Tax Shield (Money you legally avoid paying Revenue)
                        </span>
                        <span className="font-black text-lg text-emerald-600">
                          ~€{Math.round(
                            (optimalInvestments.pension_contribution + optimalInvestments.cycle_to_work + optimalInvestments.travel_pass + optimalInvestments.eiis_investment + optimalInvestments.deeds_of_covenant) * (calcData['Summary']['Marginal Tax Rate (%)'] / 100)
                            + (optimalInvestments.income_protection_premium * 0.20)
                          ).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-sm pt-2">
                        <span className="font-medium text-on-surface/80 flex items-center gap-2">
                          <span className="material-symbols-outlined text-base">money_off</span>
                          Actual Net Cost (From your pocket)
                        </span>
                        <span className="font-black text-xl text-primary">
                          €{Math.round(
                            (optimalInvestments.pension_contribution + optimalInvestments.cycle_to_work + optimalInvestments.travel_pass + optimalInvestments.income_protection_premium + optimalInvestments.eiis_investment + optimalInvestments.deeds_of_covenant) 
                            - 
                            ((optimalInvestments.pension_contribution + optimalInvestments.cycle_to_work + optimalInvestments.travel_pass + optimalInvestments.eiis_investment + optimalInvestments.deeds_of_covenant) * (calcData['Summary']['Marginal Tax Rate (%)'] / 100) + (optimalInvestments.income_protection_premium * 0.20))
                          ).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {calcData && calcData['Tax Deductions'] && (
                    <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-6">
                      
                      {/* Left Column: Tax Shields Breakdown */}
                      <div className="space-y-8">
                        <div>
                          <h4 className="text-lg font-bold mb-2 flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary">price_change</span>
                            Pre-Tax Deductions
                          </h4>
                          <p className="text-xs text-on-surface-variant mb-4 leading-relaxed">
                            Subtracted from your salary <b>before</b> tax is calculated, sheltering money at your highest marginal rate (usually 40%).
                          </p>
                          <div className="space-y-3">
                            {Object.entries(calcData['Tax Deductions'])
                              .filter(([k, v]) => typeof v === 'number' && v > 0 && k !== 'Total Accumulated Tax Credits' && k.includes('Deduction') && k !== 'Gross Income Tax' && k !== 'Net Income Tax (PAYE)')
                              .sort((a, b) => (b[1] as number) - (a[1] as number))
                              .map(([key, value]) => (
                                <div key={key} className="flex justify-between items-center p-3.5 bg-surface-container-lowest rounded-2xl border border-outline-variant/10 text-sm">
                                  <span className="font-semibold text-on-surface-variant truncate pr-2">{key}</span>
                                  <span className="font-bold text-primary">€{Math.round(value as number).toLocaleString()}</span>
                                </div>
                            ))}
                            {Object.entries(calcData['Tax Deductions']).filter(([k, v]) => typeof v === 'number' && v > 0 && k !== 'Total Accumulated Tax Credits' && k.includes('Deduction') && k !== 'Gross Income Tax' && k !== 'Net Income Tax (PAYE)').length === 0 && (
                               <p className="text-sm text-on-surface-variant/50 p-4 text-center border border-dashed border-outline-variant/20 rounded-2xl">No active pre-tax deductions.</p>
                            )}
                          </div>
                        </div>

                        <div>
                          <h4 className="text-lg font-bold mb-2 flex items-center gap-2">
                            <span className="material-symbols-outlined text-emerald-600">receipt_long</span>
                            Tax Credits & Flat Reliefs
                          </h4>
                          <p className="text-xs text-on-surface-variant mb-4 leading-relaxed">
                            Subtracted <b>euro-for-euro</b> from the final tax you owe. (Medical reliefs and credits are legally applied at 20%).
                          </p>
                          <div className="space-y-3">
                            {Object.entries(calcData['Tax Deductions'])
                              .filter(([k, v]) => typeof v === 'number' && v > 0 && k !== 'Total Accumulated Tax Credits' && (k.includes('Credit') || k.includes('Relief')) && !k.includes('Deduction'))
                              .sort((a, b) => (b[1] as number) - (a[1] as number))
                              .map(([key, value]) => (
                                <div key={key} className="flex justify-between items-center p-3.5 bg-surface-container-lowest rounded-2xl border border-outline-variant/10 text-sm">
                                  <span className="font-semibold text-on-surface-variant truncate pr-2">{key.replace(' (20%)', '')}</span>
                                  <span className="font-bold text-emerald-600">−€{Math.round(value as number).toLocaleString()}</span>
                                </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Right Column: Taxes Paid */}
                      <div>
                        <h4 className="text-lg font-bold mb-4 flex items-center gap-2">
                          <span className="material-symbols-outlined text-error">account_balance</span>
                          Post-Optimization Taxes
                        </h4>
                        <div className="space-y-3">
                          
                          <div className="flex justify-between items-center p-3.5 bg-surface-container-highest rounded-2xl border border-outline-variant/10 text-sm opacity-80">
                            <span className="font-semibold text-on-surface-variant">Gross Income Tax <span className="font-normal opacity-70">(Before Credits)</span></span>
                            <span className="font-bold text-on-surface">€{Math.round(calcData['Tax Deductions']['Gross Income Tax'] as number).toLocaleString()}</span>
                          </div>
                          
                          <div className="flex justify-between items-center p-3.5 bg-emerald-50 rounded-2xl border border-emerald-100/50 text-sm relative">
                            <span className="font-semibold text-emerald-700">Total Credits & Reliefs Subtracted</span>
                            <span className="font-bold text-emerald-600">−€{Math.round(calcData['Tax Deductions']['Total Accumulated Tax Credits'] as number).toLocaleString()}</span>
                          </div>
                          
                          <div className="flex justify-between items-center p-3.5 bg-error/5 rounded-2xl border border-error/10 text-sm mt-4!">
                            <span className="font-bold text-error/90">Net Income Tax (PAYE)</span>
                            <span className="font-black text-error">€{Math.round(calcData['Tax Deductions']['Net Income Tax (PAYE)'] as number).toLocaleString()}</span>
                          </div>
                          
                          <div className="flex justify-between items-center p-3.5 bg-error/5 rounded-2xl border border-error/10 text-sm">
                            <span className="font-semibold text-error/80">USC</span>
                            <span className="font-bold text-error">€{Math.round(calcData['Tax Deductions']['USC'] as number).toLocaleString()}</span>
                          </div>
                          
                          <div className="flex justify-between items-center p-3.5 bg-error/5 rounded-2xl border border-error/10 text-sm">
                            <span className="font-semibold text-error/80">PRSI (Social Insurance)</span>
                            <span className="font-bold text-error">€{Math.round(calcData['Tax Deductions']['PRSI'] as number).toLocaleString()}</span>
                          </div>

                          <div className="flex justify-between items-center p-3.5 bg-surface-container-lowest rounded-2xl border-2 border-outline-variant/20 mt-6! shadow-sm">
                             <span className="text-[11px] font-black uppercase tracking-widest text-on-surface-variant">Final Total Tax Paid</span>
                             <span className="font-black text-on-surface text-xl">€{Math.round(calcData['Summary']['Total Tax Deduced'] as number).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>

                    </div>
                  )}
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6">
                  <div className="w-24 h-24 rounded-full bg-primary/5 flex items-center justify-center">
                    <span className="material-symbols-outlined text-5xl text-primary/20">model_training</span>
                  </div>
                  <div className="max-w-xs px-6">
                    <h4 className="font-bold text-xl text-on-surface">Waiting for choice</h4>
                    <p className="text-sm text-on-surface-variant mt-2 leading-relaxed">Tell us how much cash you need in your pocket, and our engine will find the most efficient way to use the rest.</p>
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>
      </main>

      <BottomNavBar />
    </div>
  )
}
