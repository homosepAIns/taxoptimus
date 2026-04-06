'use client'
import { useState } from 'react'
import BottomNavBar from '@/components/BottomNavBar'
import TopAppBar from '@/components/TopAppBar'

type Risk = 'low' | 'balanced' | 'high'

export default function InvestPage() {
  const [surplus, setSurplus] = useState(1200)
  const [age, setAge] = useState(34)
  const [risk, setRisk] = useState<Risk>('balanced')

  const prsa = Math.round(surplus * 0.5)
  const etf = Math.round(surplus * 0.3)
  const bonds = surplus - prsa - etf
  const annualRelief = prsa * 12 * 0.4

  return (
    <div className="bg-surface text-on-surface min-h-screen pb-32">
      <TopAppBar />

      <main className="pt-24 px-6 max-w-5xl mx-auto">
        {/* Header */}
        <section className="mb-10">
          <h1 className="text-4xl font-extrabold tracking-tight text-on-surface mb-2">Asset Allocation</h1>
          <p className="text-on-surface-variant text-lg max-w-2xl">Optimize your Irish tax efficiency with our intelligent engine. Input your details to generate a bespoke allocation strategy.</p>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left: Inputs */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-surface-container-lowest p-8 rounded-2xl">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">tune</span>
                Parameters
              </h3>
              <div className="space-y-6">
                {/* Monthly Surplus */}
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-on-surface-variant px-1">Monthly Surplus (€)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant">€</span>
                    <input
                      className="w-full bg-surface-container-low border-none rounded-xl py-4 pl-10 pr-4 focus:ring-2 focus:ring-primary-container text-on-surface font-bold text-lg"
                      type="number"
                      value={surplus}
                      onChange={(e) => setSurplus(Number(e.target.value))}
                    />
                  </div>
                  <p className="text-[11px] text-on-surface-variant px-1">Available capital after essential expenses.</p>
                </div>

                {/* Age Slider */}
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-on-surface-variant px-1">Current Age</label>
                  <input
                    className="w-full h-2 bg-surface-container-high rounded-full appearance-none cursor-pointer accent-primary"
                    max={75} min={18} type="range"
                    value={age}
                    onChange={(e) => setAge(Number(e.target.value))}
                  />
                  <div className="flex justify-between text-sm font-bold text-on-surface">
                    <span>18</span>
                    <span className="bg-primary-container px-3 py-1 rounded-full text-on-primary-container">{age} Years</span>
                    <span>75</span>
                  </div>
                </div>

                {/* Risk Tolerance */}
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-on-surface-variant px-1">Risk Tolerance</label>
                  <div className="grid grid-cols-3 gap-3">
                    {(['low', 'balanced', 'high'] as Risk[]).map((r) => (
                      <button
                        key={r}
                        onClick={() => setRisk(r)}
                        className={`py-3 px-2 rounded-xl text-sm font-semibold capitalize transition-colors ${risk === r ? 'bg-primary text-white shadow-md' : 'bg-surface-container-high text-on-surface hover:bg-secondary-container'}`}
                      >
                        {r.charAt(0).toUpperCase() + r.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                <button className="w-full signature-gradient text-white py-4 rounded-2xl font-bold text-lg shadow-lg active:scale-[0.98] transition-transform mt-4 flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined">analytics</span>
                  Calculate Engine
                </button>
              </div>
            </div>

            {/* Tax Relief Card */}
            <div className="bg-primary-container text-on-primary-container p-6 rounded-2xl relative overflow-hidden">
              <div className="relative z-10">
                <p className="text-sm font-bold uppercase tracking-wider opacity-80 mb-1">Tax Relief Potential</p>
                <h2 className="text-3xl font-extrabold">€{annualRelief.toLocaleString()} <span className="text-lg font-normal">/ year</span></h2>
                <p className="text-sm mt-3 opacity-90 leading-relaxed italic">&ldquo;Optimizing your pension contributions could reduce your effective tax rate by 12.5% this year.&rdquo;</p>
              </div>
              <span className="material-symbols-outlined absolute -bottom-4 -right-4 text-9xl opacity-10">savings</span>
            </div>
          </div>

          {/* Right: Results */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-surface-container-lowest p-8 rounded-2xl">
              <div className="flex justify-between items-end mb-8">
                <div>
                  <h3 className="text-xl font-bold">Suggested Allocation</h3>
                  <p className="text-on-surface-variant text-sm">Based on Irish Tax Regulations 2024</p>
                </div>
                <button className="text-primary font-bold text-sm flex items-center gap-1 hover:underline">
                  <span className="material-symbols-outlined text-lg">picture_as_pdf</span>
                  Generate Report
                </button>
              </div>

              {/* Donut Chart */}
              <div className="flex flex-col md:flex-row items-center gap-12 mb-10">
                <div className="relative w-48 h-48 flex-shrink-0">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                    <circle className="stroke-surface-container-high" cx="18" cy="18" fill="none" r="16" strokeWidth="4" />
                    <circle className="stroke-primary" cx="18" cy="18" fill="none" r="16" strokeDasharray="50 100" strokeLinecap="round" strokeWidth="4" />
                    <circle className="stroke-secondary" cx="18" cy="18" fill="none" r="16" strokeDasharray="30 100" strokeDashoffset="-50" strokeLinecap="round" strokeWidth="4" />
                    <circle className="stroke-primary-container" cx="18" cy="18" fill="none" r="16" strokeDasharray="20 100" strokeDashoffset="-80" strokeLinecap="round" strokeWidth="4" />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-extrabold">€{(surplus / 1000).toFixed(1)}k</span>
                    <span className="text-[10px] uppercase font-bold text-on-surface-variant">Monthly</span>
                  </div>
                </div>
                <div className="flex-1 space-y-4 w-full">
                  {[
                    { color: 'bg-primary', label: 'PRSA / Pension', pct: 50, amount: prsa },
                    { color: 'bg-secondary', label: 'Equity ETFs', pct: 30, amount: etf },
                    { color: 'bg-primary-container', label: 'State Prize Bonds', pct: 20, amount: bonds },
                  ].map((row) => (
                    <div key={row.label} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${row.color}`}></div>
                        <span className="font-bold text-on-surface">{row.label}</span>
                      </div>
                      <span className="text-on-surface-variant font-medium">{row.pct}% (€{row.amount})</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Breakdown Cards */}
              <div className="space-y-4">
                <div className="p-5 rounded-2xl bg-surface-container-low border-l-4 border-primary">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-bold text-lg">PRSA Contribution</h4>
                    <span className="px-2 py-1 bg-primary-container text-on-primary-container text-[10px] font-bold rounded uppercase">Max Tax Relief</span>
                  </div>
                  <p className="text-sm text-on-surface-variant mb-3">Deductible at your marginal tax rate (40%). Provides immediate relief on current income tax.</p>
                  <div className="flex gap-4 text-xs font-bold text-primary">
                    <span className="flex items-center gap-1"><span className="material-symbols-outlined text-sm">check_circle</span> No Exit Tax</span>
                    <span className="flex items-center gap-1"><span className="material-symbols-outlined text-sm">check_circle</span> Employer Matching</span>
                  </div>
                </div>
                <div className="p-5 rounded-2xl bg-surface-container-low border-l-4 border-secondary">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-bold text-lg">World Equity ETF</h4>
                    <span className="px-2 py-1 bg-secondary-container text-on-secondary-container text-[10px] font-bold rounded uppercase">Deemed Disposal</span>
                  </div>
                  <p className="text-sm text-on-surface-variant mb-3">Diversified exposure. Subject to 41% exit tax every 8 years. Recommended for long-term growth.</p>
                  <div className="flex gap-4 text-xs font-bold text-secondary">
                    <span className="flex items-center gap-1"><span className="material-symbols-outlined text-sm">warning</span> 8-Year Rule</span>
                    <span className="flex items-center gap-1"><span className="material-symbols-outlined text-sm">trending_up</span> High Growth</span>
                  </div>
                </div>
                <div className="p-5 rounded-2xl bg-surface-container-low border-l-4 border-primary-container">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-bold text-lg">State Prize Bonds</h4>
                    <span className="px-2 py-1 bg-surface-container-highest text-on-surface-variant text-[10px] font-bold rounded uppercase">100% Tax Free</span>
                  </div>
                  <p className="text-sm text-on-surface-variant mb-3">Safe capital preservation with potential for winnings. No DIRT or CGT on any prizes won.</p>
                  <div className="flex gap-4 text-xs font-bold text-on-primary-container">
                    <span className="flex items-center gap-1"><span className="material-symbols-outlined text-sm">lock</span> Capital Secure</span>
                    <span className="flex items-center gap-1"><span className="material-symbols-outlined text-sm">celebration</span> Weekly Draws</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <BottomNavBar />
    </div>
  )
}
