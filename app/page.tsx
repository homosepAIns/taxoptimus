import Link from 'next/link'
import TopAppBar from '@/components/TopAppBar'
import LandingChat from '@/components/LandingChat'

export default function LandingPage() {
  return (
    <>
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
              <h1 className="font-headline font-extrabold text-5xl md:text-7xl text-on-surface leading-[1.1] tracking-tight">
                Handle Your Finances,<br />
                <span className="text-primary italic">In Just 4 Easy Steps ...</span>
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
                <a href="#ai-chat">
                  <button className="editorial-gradient text-white px-8 py-4 rounded-xl font-bold text-lg hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-primary/20">
                    Get Started
                  </button>
                </a>
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
                <img alt="Mobile app preview" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDkiTP1YAoE0Z7W62hgI7KUaeg0_t3RO4xbOqmro4YxduzHnoIuPKYCt8mmCapdiDso7xMdYiFJa7T1_XEQpPANfLk0tzBLS5HPdoFTZGibdlMIv1xLHhAXuNQUVP2I6A-WvivEoJMEHOZV-mLG0JHxrDSwwQ4XFx0MEn30mJENX_6Vxsz9brJKM0XBk2ZWgzsqOpYke6wVtrF7aMSrKhOEgDPZDP-MpQ5hd5PxT4Z3bCeg2XZz6caiOO95elt_M-1AoIeusWvtxRk" className="w-full h-auto" />
              </div>
              <div className="absolute -top-10 -right-10 w-64 h-64 bg-primary-container/30 rounded-full blur-3xl -z-0"></div>
              <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-secondary-container/40 rounded-full blur-3xl -z-0"></div>
            </div>
          </div>
        </section>

        {/* Did You Know */}
        <section id="insights" className="container mx-auto px-6 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 bg-on-surface text-surface rounded-[2rem] p-8 md:p-12 flex flex-col justify-between relative overflow-hidden">
              <div className="relative z-10 space-y-6">
                <span className="bg-primary-container text-on-primary-container px-4 py-1 rounded-full text-sm font-bold">DID YOU KNOW?</span>
                <h2 className="font-headline text-3xl md:text-4xl font-bold leading-tight">
                  The average Irish person could save <span className="text-primary-container">€2,400</span> a year by optimizing their tax and utility bills.
                </h2>
                <p className="text-surface-variant/80 text-lg">TaxOptimus automatically identifies these gaps in your spending and provides direct links to claim your reliefs.</p>
              </div>
              <div className="absolute right-0 bottom-0 opacity-10 rotate-12">
                <span className="material-symbols-outlined text-[15rem]">euro_symbol</span>
              </div>
            </div>
            <div className="bg-primary-container rounded-[2rem] p-8 flex flex-col items-center text-center justify-center space-y-4">
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
                <span className="material-symbols-outlined text-white text-3xl" style={{ fontVariationSettings: '"FILL" 1' }}>bolt</span>
              </div>
              <h3 className="font-headline text-2xl font-bold text-on-primary-container">Switch &amp; Save</h3>
              <p className="text-on-primary-container/80">Average users save €450 on energy bills within the first 30 days of using TaxOptimus.</p>
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
              { icon: 'trending_up', title: 'Investment Suggestions', desc: 'Hyper-local advice on top-rated savings accounts, state bonds, and diversified ETFs with Irish tax implications built-in.' },
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
              <a href="#ai-chat">
                <button className="editorial-gradient text-white px-10 py-4 rounded-xl font-bold text-lg hover:shadow-2xl transition-all">
                  Get Started Today
                </button>
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* BottomNavBar — mobile only */}
      <nav className="md:hidden fixed bottom-0 w-full flex justify-around items-center px-4 pb-6 pt-2 bg-[#F9F9FF]/80 dark:bg-[#0D1C32]/80 backdrop-blur-md rounded-t-[1.5rem] z-50 border-t border-[#BDCABC]/20 shadow-[0px_-12px_32px_rgba(13,28,50,0.06)]">
        {[
          { href: '/dashboard', icon: 'dashboard', label: 'Dashboard' },
          { href: '/activity', icon: 'receipt_long', label: 'Activity' },
          { href: '/upload', icon: 'add_circle', label: 'Add', action: true },
          { href: '/invest', icon: 'trending_up', label: 'Invest' },
          { href: '/upload', icon: 'description', label: 'Files' },
        ].map((item) => (
          <Link
            key={`${item.href}-${item.label}`}
            href={item.href}
            className={`flex flex-col items-center justify-center p-2 font-['Inter'] text-[11px] font-medium rounded-[1rem] active:scale-90 transition-transform duration-200 ${item.action ? 'bg-[#50C878] text-[#0D1C32]' : 'text-[#3E4A3F] dark:text-[#BDCABC] hover:bg-[#DFE8FF] dark:hover:bg-[#1A2E4B]'}`}
          >
            <span className="material-symbols-outlined">{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>
    </>
  )
}
