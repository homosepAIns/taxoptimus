'use client'
import { useRef } from 'react'
import BottomNavBar from '@/components/BottomNavBar'
import TopAppBar from '@/components/TopAppBar'

export default function UploadPage() {
  const fileInputRef = useRef<HTMLInputElement>(null)

  return (
    <div className="bg-surface text-on-surface font-body">
      <TopAppBar />

      <main className="pt-24 pb-32 px-6 max-w-7xl mx-auto">
        {/* Hero */}
        <section className="mb-12">
          <div className="flex flex-col md:flex-row gap-8 items-start">
            {/* Upload Area */}
            <div className="w-full md:w-2/3">
              <h1 className="font-headline font-extrabold text-4xl mb-4 tracking-tight text-on-surface">Data Ingestion</h1>
              <p className="text-on-surface-variant font-body mb-8 max-w-lg leading-relaxed">
                Drag and drop your PDF statements or high-res receipt photos. Our AI extracts merchant data, VAT, and categories in seconds.
              </p>
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-primary to-primary-container rounded-[2rem] blur opacity-10 group-hover:opacity-25 transition duration-1000"></div>
                <div className="relative bg-surface-container-lowest border-2 border-dashed border-outline-variant/30 rounded-[2rem] p-12 flex flex-col items-center justify-center text-center transition-all hover:border-primary/50">
                  <div className="w-20 h-20 signature-gradient rounded-full flex items-center justify-center mb-6 shadow-lg shadow-primary/20">
                    <span className="material-symbols-outlined text-white text-4xl">cloud_upload</span>
                  </div>
                  <h3 className="font-headline font-bold text-xl mb-2">Upload Files</h3>
                  <p className="text-on-surface-variant text-sm mb-6">PDF, PNG, JPG, HEIC up to 25MB</p>
                  <input ref={fileInputRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.heic" multiple className="hidden" />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="signature-gradient text-white px-8 py-3 rounded-full font-bold shadow-md hover:shadow-xl transition-all active:scale-95"
                  >
                    Select from Device
                  </button>
                </div>
              </div>
            </div>

            {/* Live Status Bento */}
            <div className="w-full md:w-1/3 grid grid-cols-1 gap-4">
              <div className="bg-surface-container-low rounded-[1.5rem] p-6">
                <div className="flex justify-between items-center mb-4">
                  <span className="font-headline font-bold text-sm uppercase tracking-wider text-primary">System Pulse</span>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-primary-container rounded-full animate-pulse"></div>
                    <span className="text-xs font-bold text-on-surface-variant">Active</span>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Extraction Accuracy</span>
                    <span className="text-sm font-bold text-primary">99.8%</span>
                  </div>
                  <div className="w-full h-2 bg-surface-container-high rounded-full overflow-hidden">
                    <div className="h-full bg-primary-container rounded-full w-[99.8%]"></div>
                  </div>
                </div>
              </div>
              <div className="bg-on-surface text-surface rounded-[1.5rem] p-6 flex flex-col justify-between h-40">
                <span className="material-symbols-outlined text-primary-container text-3xl">account_balance_wallet</span>
                <div>
                  <p className="text-surface/60 text-xs font-medium mb-1">Total Processed (MTD)</p>
                  <h4 className="font-headline font-bold text-2xl text-white">€12,450.00</h4>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Recent Files & Spending Footprint */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left: Recent Uploads */}
          <div className="lg:col-span-5 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="font-headline font-bold text-2xl">Files</h2>
              <button className="text-primary text-sm font-bold flex items-center gap-1 hover:underline">
                View Archive <span className="material-symbols-outlined text-sm">chevron_right</span>
              </button>
            </div>
            <div className="space-y-4">
              {[
                { icon: 'description', name: 'AIB_Statement_Dec.pdf', meta: 'Dec 28, 2023 • 2.4 MB', status: 'Extracted', extracted: true },
                { icon: 'receipt_long', name: 'Tesco_Superstore.jpg', meta: 'Just now • 840 KB', status: 'Processing', extracted: false },
                { icon: 'receipt_long', name: 'ESB_Bill_Winter.pdf', meta: 'Yesterday • 1.1 MB', status: 'Extracted', extracted: true },
              ].map((file) => (
                <div key={file.name} className="bg-surface-container-lowest p-5 rounded-[1.5rem] flex items-center gap-4 transition-transform hover:-translate-y-1">
                  <div className="w-12 h-12 bg-surface-container-high rounded-xl flex items-center justify-center text-primary">
                    <span className="material-symbols-outlined">{file.icon}</span>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-on-surface leading-tight">{file.name}</h4>
                    <p className="text-xs text-on-surface-variant">{file.meta}</p>
                  </div>
                  {file.extracted ? (
                    <div className="bg-primary-container/20 px-3 py-1 rounded-full">
                      <span className="text-[10px] font-extrabold text-on-primary-container uppercase">Extracted</span>
                    </div>
                  ) : (
                    <div className="bg-surface-container-high px-3 py-1 rounded-full flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce"></div>
                      <span className="text-[10px] font-extrabold text-on-surface-variant uppercase">Processing</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Right: Spending Footprint */}
          <div className="lg:col-span-7 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="font-headline font-bold text-2xl">Spending Footprint</h2>
              <div className="flex bg-surface-container-high p-1 rounded-full">
                <button className="bg-surface-container-lowest text-primary px-4 py-1.5 rounded-full text-xs font-bold shadow-sm">Map View</button>
                <button className="text-on-surface-variant px-4 py-1.5 rounded-full text-xs font-bold">List View</button>
              </div>
            </div>
            <div className="relative w-full h-[400px] rounded-[2rem] overflow-hidden shadow-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img alt="Map of spending in Dublin" className="w-full h-full object-cover grayscale opacity-50 brightness-110" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDL5YYGA2o4h9V7sg13Imi7nbaAWRKcAp-dNkBuKS1Dvl3PfWjntzbqUX7v3aEBu93O_7Xs22ungvfTUU4sp5Z-d7_27kYiDfbEFEpa3kT-Q9BWXaymX-HA2JkIUePzISY5bdefcTlwnqtPIaKlPVAfV7OWX7buBxaJeXHihB86N8resXXcqbvR0BldiMkcORJ8dJynBdyAgbFj1iIOok2NBmYLBaSB_0OzgrMTspZVOPmjA7ftm0JhjAE1_zcmZRV3EaGaWtnbT-0" />
              <div className="absolute inset-0 p-8 flex flex-col justify-end">
                <div className="glass-panel p-6 rounded-[2rem] flex flex-wrap gap-6 items-center border border-white/20">
                  <div>
                    <p className="text-[10px] font-bold text-on-surface-variant uppercase mb-1">Top Location</p>
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary text-xl">location_on</span>
                      <span className="font-headline font-bold text-lg">Tesco, Dundrum</span>
                    </div>
                  </div>
                  <div className="h-10 w-px bg-outline-variant/30 hidden sm:block"></div>
                  <div>
                    <p className="text-[10px] font-bold text-on-surface-variant uppercase mb-1">Last Spends</p>
                    <div className="flex -space-x-3">
                      <div className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center border-2 border-white font-bold text-on-primary-container text-xs">T</div>
                      <div className="w-10 h-10 rounded-full bg-[#E5002B] flex items-center justify-center border-2 border-white font-bold text-white text-xs">D</div>
                      <div className="w-10 h-10 rounded-full bg-[#004D99] flex items-center justify-center border-2 border-white font-bold text-white text-xs">E</div>
                    </div>
                  </div>
                  <div className="h-10 w-px bg-outline-variant/30 hidden sm:block"></div>
                  <div className="flex-1 text-right">
                    <p className="text-[10px] font-bold text-on-surface-variant uppercase mb-1">Extract Ratio</p>
                    <p className="font-headline font-extrabold text-xl text-primary">84% Geocoded</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              {['Grocery: €420.50', 'Utilities: €189.00', 'Dining: €125.20', 'Health: €65.00'].map((chip) => (
                <span key={chip} className="bg-surface-container-low px-4 py-2 rounded-full text-xs font-bold border border-outline-variant/10 text-on-surface">{chip}</span>
              ))}
            </div>
          </div>
        </div>
      </main>

      <BottomNavBar />
    </div>
  )
}
