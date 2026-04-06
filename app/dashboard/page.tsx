import BottomNavBar from '@/components/BottomNavBar'
import TopAppBar from '@/components/TopAppBar'
import SavePendingCalc from '@/components/SavePendingCalc'

export default function DashboardPage() {
  return (
    <div className="bg-surface text-on-surface pb-32">
      <TopAppBar />
      <SavePendingCalc />

      <main className="mt-20 px-6 max-w-5xl mx-auto">
        {/* Hero Balance */}
        <section className="mt-8 mb-10">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div>
              <p className="text-on-surface-variant font-medium mb-1">Total Net Worth</p>
              <h1 className="text-[3.5rem] font-extrabold tracking-tight text-on-surface leading-none">€42,850.24</h1>
            </div>
            <div className="flex gap-3">
              <button className="emerald-gradient text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 active:scale-95 transition-transform">
                <span className="material-symbols-outlined">add</span>
                <span>Add Money</span>
              </button>
            </div>
          </div>
        </section>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Monthly Flow */}
          <div className="md:col-span-8 bg-surface-container-lowest rounded-2xl p-6 flex flex-col justify-between">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-xl font-bold">Monthly Flow</h3>
              <span className="text-sm text-on-surface-variant bg-surface-container-low px-3 py-1 rounded-full">October 2023</span>
            </div>
            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-primary">
                  <span className="material-symbols-outlined">arrow_downward</span>
                  <span className="font-bold">Income</span>
                </div>
                <p className="text-3xl font-bold">€8,240.00</p>
                <div className="h-2 bg-surface-container-low rounded-full overflow-hidden">
                  <div className="h-full bg-primary-container w-full rounded-full"></div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-tertiary">
                  <span className="material-symbols-outlined">arrow_upward</span>
                  <span className="font-bold">Expenses</span>
                </div>
                <p className="text-3xl font-bold">€3,120.45</p>
                <div className="h-2 bg-surface-container-low rounded-full overflow-hidden">
                  <div className="h-full bg-tertiary rounded-full" style={{ width: '38%' }}></div>
                </div>
              </div>
            </div>
          </div>

          {/* Surplus Pulse */}
          <div className="md:col-span-4 bg-primary-container text-on-primary-container rounded-2xl p-6 relative overflow-hidden">
            <div className="relative z-10">
              <div className="bg-primary/20 w-fit px-3 py-1 rounded-full text-xs font-bold mb-4 flex items-center gap-1">
                <span className="w-2 h-2 bg-primary rounded-full animate-pulse"></span>
                LIVE SURPLUS
              </div>
              <h3 className="text-4xl font-extrabold mb-1">€5,119</h3>
              <p className="text-sm opacity-80 font-medium">Extra cash this month</p>
            </div>
            <div className="absolute -right-8 -bottom-8 opacity-20">
              <span className="material-symbols-outlined text-9xl">auto_graph</span>
            </div>
          </div>

          {/* AI Savings Forecast */}
          <div className="md:col-span-12 lg:col-span-7 bg-surface-container-low rounded-2xl p-8 border border-outline-variant/10">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h3 className="text-2xl font-bold mb-1">AI Savings Forecast</h3>
                <p className="text-on-surface-variant">Based on your spending patterns from the last 90 days.</p>
              </div>
              <span className="material-symbols-outlined text-primary">smart_toy</span>
            </div>
            <div className="grid grid-cols-2 gap-8 mb-8">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2">How much you&apos;ve saved</p>
                <p className="text-4xl font-extrabold text-primary">€12,400</p>
                <p className="text-xs text-on-surface-variant mt-1">YTD 2023</p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2">Potential reach</p>
                <p className="text-4xl font-extrabold text-on-surface">€18,250</p>
                <p className="text-xs text-primary font-bold mt-1">+€5,850 identified</p>
              </div>
            </div>
            <div className="bg-surface-container-lowest p-5 rounded-xl flex items-center gap-4">
              <div className="w-12 h-12 bg-primary-container/20 rounded-full flex items-center justify-center text-primary">
                <span className="material-symbols-outlined">lightbulb</span>
              </div>
              <p className="text-sm text-on-surface-variant">
                Reducing <span className="font-bold text-on-surface">unused subscriptions</span> could add €45 to your monthly savings pool.
              </p>
            </div>
          </div>

          {/* Expense Categories */}
          <div className="md:col-span-12 lg:col-span-5 bg-surface-container-lowest rounded-2xl p-8">
            <h3 className="text-xl font-bold mb-6">Expense Categories</h3>
            <div className="space-y-6">
              {[
                { icon: 'shopping_basket', iconBg: 'bg-secondary-container', iconText: 'text-secondary', name: 'Groceries', count: '45 transactions', amount: '€850.00' },
                { icon: 'receipt', iconBg: 'bg-tertiary-fixed', iconText: 'text-tertiary', name: 'Bills', count: '12 transactions', amount: '€1,240.45' },
                { icon: 'subscriptions', iconBg: 'bg-surface-container-high', iconText: 'text-on-surface-variant', name: 'Subscriptions', count: '8 transactions', amount: '€135.00' },
              ].map((cat) => (
                <div key={cat.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 ${cat.iconBg} rounded-lg flex items-center justify-center ${cat.iconText}`}>
                      <span className="material-symbols-outlined">{cat.icon}</span>
                    </div>
                    <div>
                      <p className="font-bold">{cat.name}</p>
                      <p className="text-xs text-on-surface-variant">{cat.count}</p>
                    </div>
                  </div>
                  <p className="font-bold">{cat.amount}</p>
                </div>
              ))}
            </div>
            <button className="w-full mt-8 py-3 text-sm font-bold text-primary hover:bg-surface-container-low rounded-xl transition-colors">
              View Full Analysis
            </button>
          </div>

          {/* Savings Goals */}
          <div className="md:col-span-12 bg-surface-container-lowest rounded-2xl p-8">
            <div className="flex justify-between items-end mb-8">
              <div>
                <h3 className="text-2xl font-bold">Savings Goals</h3>
                <p className="text-on-surface-variant">You&apos;re on track for 2 of your 3 goals.</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                { name: 'Irish Coast Cabin', current: 12500, target: 20000 },
                { name: 'Emergency Fund', current: 9000, target: 10000 },
                { name: 'Retirement Portfolio', current: 21350, target: 50000 },
              ].map((goal) => (
                <div key={goal.name} className="space-y-3">
                  <div className="flex justify-between text-sm font-bold">
                    <span>{goal.name}</span>
                    <span>€{goal.current.toLocaleString()}/€{(goal.target / 1000).toFixed(0)}k</span>
                  </div>
                  <div className="h-3 bg-surface-container-low rounded-full">
                    <div className="h-full emerald-gradient rounded-full" style={{ width: `${(goal.current / goal.target) * 100}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      <BottomNavBar />
    </div>
  )
}
