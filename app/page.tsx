import TopAppBar from '@/components/TopAppBar'
import LandingChat from '@/components/LandingChat'
import ScrollToChat from '@/components/ScrollToChat'
import RedirectIfLoggedIn from '@/components/RedirectIfLoggedIn'
import BottomNavBar from '@/components/BottomNavBar'

export default function LandingPage() {
  return (
    <>
      <RedirectIfLoggedIn />
      <TopAppBar />

      <main className="pt-24 pb-32">
        {/* Hero */}
        <section className="container mx-auto px-6 py-12 md:py-24">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-7 space-y-8">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-container/20 text-primary font-medium text-sm">
                <span className="w-2 h-2 rounded-full bg-primary-container animate-pulse"></span>
                Maximize your take home income!
              </div>
              <h1 className="font-headline font-extrabold text-4xl xs:text-5xl md:text-7xl text-on-surface leading-[1.1] tracking-tight">
                Handle Your Finances,<br />
                <span className="text-primary italic text-3xl xs:text-4xl md:text-7xl">In Just 4 Easy Steps ...</span>
              </h1>
              <div className="text-lg text-on-surface-variant max-w-xl leading-relaxed space-y-1">
                <div>1. Input your income and tax details</div>
                <div>2. Upload your bank statement</div>
                <div>3. Upload receipts paid in cash</div>
                <div>4. Get practical recommendations to minimize your tax outflow</div>
                <p className="mt-4">
                  The heritage of reliability meets modern precision. From the Cliffs of Moher to Silicon Docks, we empower your financial journey with local expertise and global technology.
                </p>
              </div>
              <div className="flex flex-wrap gap-4 pt-4">
                <ScrollToChat className="editorial-gradient text-white px-8 py-4 rounded-xl font-bold text-lg hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-primary/20">
                  Get Started
                </ScrollToChat>
                <a href="#features">
                  <button className="bg-surface-container-high text-primary px-8 py-4 rounded-xl font-bold text-lg hover:bg-surface-container-highest transition-colors">
                    How it works
                  </button>
                </a>
              </div>
            </div>
            <div className="lg:col-span-5 relative">
              <div className="relative z-10 rounded-[2.5rem] overflow-hidden shadow-2xl rotate-3 hover:rotate-0 transition-transform duration-700">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="https://img.freepik.com/premium-photo/modern-3d-isometric-illustration-financial-data-analytics-dashboard-laptop-with-charts-coins-investment-concept-premium-quality_1020697-1522.jpg"
                  alt="TaxOptimus Dashboard"
                  className="w-full h-auto object-cover"
                />  </div>
              <div className="absolute -top-10 -right-10 w-64 h-64 bg-primary-container/30 rounded-full blur-3xl -z-0"></div>
              <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-secondary-container/40 rounded-full blur-3xl -z-0"></div>
            </div>
          </div>
        </section>

        {/* Did You Know */}
        <section id="insights" className="container mx-auto px-6 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* The €600 Million Reality */}
            <div className="md:col-span-2 bg-on-surface text-surface rounded-[3rem] p-8 md:p-12 flex flex-col justify-between relative overflow-hidden">
              <div className="relative z-10 space-y-6">
                <span className="bg-primary-container/20 text-primary-container px-4 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase border border-primary-container/30">The €600 Million Reality</span>
                <h2 className="font-headline text-3xl md:text-5xl font-black leading-tight tracking-tight">
                  Over <span className="text-primary-container">80%</span> of PAYE returns results in an overpayment.
                </h2>
                <p className="text-surface-variant/80 text-lg md:text-xl max-w-2xl leading-relaxed">
                  As of March 2026, more than <span className="text-white font-bold">€637 million</span> has already been refunded to savvy taxpayers who took a second look at their returns.
                </p>
              </div>
              <div className="absolute right-0 bottom-0 opacity-5 rotate-12 -mr-12 -mb-12">
                <span className="material-symbols-outlined text-[20rem]">insights</span>
              </div>
            </div>

            <div className="space-y-6 flex flex-col">
              {/* The Unclaimed Fortune */}
              <div className="flex-1 bg-primary-container rounded-[2.5rem] p-8 flex flex-col justify-center space-y-4 border border-primary/10">
                <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                  <span className="material-symbols-outlined text-on-primary-container text-2xl">account_balance</span>
                </div>
                <h3 className="font-headline text-xl font-bold text-on-primary-container">The Unclaimed Fortune</h3>
                <p className="text-on-primary-container/80 text-sm leading-relaxed">
                  Approximately <span className="font-bold text-on-primary-container">€389 million</span> was overpaid in 2024 alone, as 500,000 people failed to claim their legal credits.
                </p>
              </div>

              {/* The Individual Windfall */}
              <div className="flex-1 bg-surface-container-high rounded-[2.5rem] p-8 flex flex-col justify-center space-y-2 border border-outline-variant/10 shadow-sm shadow-black/5">
                <h3 className="text-xs font-black text-on-surface-variant uppercase tracking-widest">Typical Refund</h3>
                <p className="text-3xl font-black text-primary tracking-tighter">€300 – €1,500</p>
                <p className="text-[11px] text-on-surface-variant/70 leading-relaxed font-medium">
                  Average PAYE refund per review. Can increase significantly when backdated across the full 4-year eligibility window.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Feature Highlights */}
        <section id="features" className="container mx-auto px-6 py-16 space-y-12">
          <div className="max-w-2xl">
            <h2 className="font-headline text-4xl font-extrabold text-on-surface tracking-tight mb-4">Precision Tools for Modern Wealth</h2>
            <p className="text-on-surface-variant text-lg leading-relaxed">We&apos;ve built tools that understand the nuances of the Irish financial landscape—from Revenue tax credits to the latest UCITS regulations.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: 'receipt_long', title: 'Receipt Scanning', desc: 'Snapshot your receipts and our AI automatically categorizes them for medical expenses or business tax claims.' },
              { icon: 'description', title: 'Payslip Parser', desc: "Upload your PDF payslips to monitor pension contributions, PRSI classes, and ensure you're on the right tax band." },
              { icon: 'auto_fix_high', title: 'Tax Strategy Optimizer', desc: 'Set your target take-home pay and let our engine mathematically solve the most efficient way to use your remaining income.' },
            ].map((f) => (
              <div key={f.title} className="group bg-surface-container-lowest p-8 rounded-[2rem] hover:bg-surface-container-low transition-colors duration-300">
                <div className="mb-8 inline-block p-4 rounded-2xl bg-surface-container-high text-primary group-hover:bg-primary-container group-hover:text-on-primary-container transition-all">
                  <span className="material-symbols-outlined text-3xl">{f.icon}</span>
                </div>
                <h3 className="font-headline text-xl font-bold mb-3">{f.title}</h3>
                <p className="text-on-surface-variant leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Interactive AI Chat */}
        <LandingChat />

        {/* CTA Banner */}
        <section className="container mx-auto px-6 py-12">
          <div className="rounded-[3rem] overflow-hidden relative h-[400px] flex items-center px-12">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img alt="Irish countryside" className="absolute inset-0 w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBjJLBaG70yPRW0RayXf4KtKBRl5brXD9aA5nMuC60BxABLyQmjJQFUem6dVCgJoTWvPFP67QWR-oOklshcqKRgnjwJuimyqaXhzhHdTuz-J7ucqOmhCdQRsj7i3wPcdf_Lzl61M3WjByjLJNqOakKPlY8e9930iwRp2zjGCxiolG5TT0CWgeuaWUJ1DP7UyyVcUXgNJBFPXmm8q5DHcr2SfrJIYWe1UhFqLmetO0Hg5VhJxA3OeC4hK4Zmu-Kk_80JFSMFD-BQtSI" />
            <div className="absolute inset-0 bg-gradient-to-r from-on-surface to-transparent"></div>
            <div className="relative z-10 max-w-xl space-y-6">
              <h2 className="font-headline text-4xl font-bold text-white">Ready to secure your future?</h2>
              <p className="text-surface-variant text-lg">Join thousands of people who have already optimized their financial flow.</p>
              <ScrollToChat className="editorial-gradient text-white px-10 py-4 rounded-xl font-bold text-lg hover:shadow-2xl transition-all">
                Get Started Today
              </ScrollToChat>
            </div>
          </div>
        </section>
      </main>

      <BottomNavBar />
    </>
  )
}
