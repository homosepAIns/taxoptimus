'use client'

interface Props {
  data: any
  onClose: () => void
}

function fmt(n: any) {
  if (typeof n !== 'number') return n
  return n.toLocaleString('en-IE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function TaxBreakdownModal({ data, onClose }: Props) {
  if (!data) return null

  const core = data['Core Financials'] || {}
  const deductions = data['Tax Deductions'] || {}
  const summary = data['Summary'] || {}

  return (
    <div className="fixed inset-0 z-[70] bg-on-surface/40 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-surface rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-outline-variant/20">
        
        {/* Header */}
        <div className="p-8 bg-surface-container-lowest border-b border-outline-variant/10 flex justify-between items-center">
          <div>
            <h2 className="font-headline font-extrabold text-2xl text-on-surface leading-tight">Detailed Tax Breakdown</h2>
            <p className="text-on-surface-variant text-sm font-medium mt-1">Full 2026 Irish Tax Calculation Engine Results</p>
          </div>
          <button onClick={onClose} className="w-12 h-12 rounded-full hover:bg-surface-container-high flex items-center justify-center transition-colors active:scale-90">
            <span className="material-symbols-outlined text-2xl">close</span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 space-y-10">
          
          {/* Summary Section */}
          <section>
            <h3 className="text-[11px] font-bold text-primary uppercase tracking-widest mb-4 flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-primary rounded-full"></span>
              High-Level Summary
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { label: 'Total Tax Deduced', value: summary['Total Tax Deduced'], cls: 'text-error' },
                { label: 'Take Home CASH (Annual)', value: summary['Take Home CASH'], cls: 'text-primary font-extrabold' },
                { label: 'Effective Tax Rate', value: `${summary['Effective Tax Rate (%)']}%`, cls: 'text-error' },
                { label: 'Marginal Tax Rate', value: `${summary['Marginal Tax Rate (%)']}%`, cls: 'text-orange-500' },
              ].map((item) => (
                <div key={item.label} className="bg-surface-container-low p-4 rounded-2xl flex justify-between items-center">
                  <span className="text-sm font-medium text-on-surface-variant">{item.label}</span>
                  <span className={`text-base font-bold ${item.cls}`}>€{fmt(item.value)}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Tax Deductions Section */}
          <section>
            <h3 className="text-[11px] font-bold text-primary uppercase tracking-widest mb-4 flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-primary rounded-full"></span>
              Tax Deductions Breakdown
            </h3>
            <div className="bg-surface-container-lowest border border-outline-variant/10 rounded-2xl overflow-hidden">
              <table className="w-full text-left text-sm border-collapse">
                <tbody className="divide-y divide-outline-variant/10">
                  {Object.entries(deductions).map(([key, val]) => (
                    <tr key={key} className="hover:bg-surface-container-low/50 transition-colors">
                      <td className="py-3 px-5 text-on-surface-variant font-medium">{key}</td>
                      <td className={`py-3 px-5 text-right font-bold ${Number(val) > 0 ? 'text-on-surface' : 'text-on-surface-variant/40'}`}>
                        {Number(val) > 0 ? `€${fmt(val)}` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Core Financials Section */}
          <section>
            <h3 className="text-[11px] font-bold text-primary uppercase tracking-widest mb-4 flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-primary rounded-full"></span>
              Input Financial Values
            </h3>
            <div className="bg-surface-container-lowest border border-outline-variant/10 rounded-2xl overflow-hidden">
              <table className="w-full text-left text-sm border-collapse">
                <tbody className="divide-y divide-outline-variant/10">
                  {Object.entries(core).map(([key, val]) => (
                    <tr key={key} className="hover:bg-surface-container-low/50 transition-colors">
                      <td className="py-3 px-5 text-on-surface-variant font-medium">{key}</td>
                      <td className="py-3 px-5 text-right font-bold text-on-surface">€{fmt(val)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

        </div>

        {/* Footer */}
        <div className="p-6 bg-surface-container-lowest border-t border-outline-variant/10 flex justify-center">
          <button 
            onClick={onClose}
            className="editorial-gradient text-white px-10 py-3.5 rounded-2xl font-bold text-base shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
          >
            Got it, thanks!
          </button>
        </div>
      </div>
    </div>
  )
}
