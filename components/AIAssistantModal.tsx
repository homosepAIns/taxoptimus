'use client'

interface Props {
  onClose: () => void
}

export default function AIAssistantModal({ onClose }: Props) {
  return (
    <div className="fixed inset-0 z-[60] bg-on-surface/20 backdrop-blur-sm flex items-end md:items-center justify-center p-4">
      <div className="w-full max-w-lg bg-surface rounded-t-2xl md:rounded-2xl shadow-[0px_12px_32px_rgba(13,28,50,0.15)] overflow-hidden flex flex-col max-h-[795px]">
        {/* Header */}
        <div className="p-6 bg-surface-container-lowest border-b border-outline-variant/10 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full signature-gradient flex items-center justify-center text-white shadow-lg">
              <span className="material-symbols-outlined" style={{ fontVariationSettings: '"FILL" 1' }}>smart_toy</span>
            </div>
            <div>
              <h2 className="font-headline font-bold text-on-surface leading-tight">TaxOptimus AI</h2>
              <p className="text-primary text-xs font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-primary-container rounded-full"></span>
                Online &amp; Analyzing
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-on-surface-variant hover:text-on-surface transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Chat Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* AI Message */}
          <div className="flex flex-col items-start gap-2 max-w-[85%]">
            <div className="bg-surface-container-high rounded-2xl rounded-tl-none p-4 shadow-sm">
              <p className="text-on-surface leading-relaxed">
                Hi! Based on your recent payslip and ESB bill, I've found a{' '}
                <span className="font-bold text-primary">€45 saving</span> on your electricity. Want me to apply for the credit?
              </p>
            </div>
            <span className="text-[10px] text-on-surface-variant font-medium ml-2 uppercase tracking-wider">Just now</span>
          </div>

          {/* Context Data Snippets */}
          <div className="space-y-3">
            <p className="text-[11px] font-bold text-on-surface-variant uppercase tracking-widest px-2">Data Extraction Context</p>
            <div className="grid grid-cols-1 gap-3">
              <div className="bg-surface-container-lowest border border-outline-variant/20 rounded-xl p-4 flex items-center gap-4">
                <div className="w-10 h-10 bg-secondary-container/30 rounded-lg flex items-center justify-center text-secondary">
                  <span className="material-symbols-outlined">description</span>
                </div>
                <div className="flex-1">
                  <p className="text-[11px] font-bold text-on-surface-variant leading-none mb-1">PAYSLIP_MAY_24.PDF</p>
                  <div className="flex justify-between items-end">
                    <span className="text-xs text-on-surface italic">"Net Pay: €3,450.21"</span>
                    <span className="text-[10px] bg-primary-container/10 text-primary px-2 py-0.5 rounded-full font-bold">MATCHED</span>
                  </div>
                </div>
              </div>
              <div className="bg-surface-container-lowest border border-outline-variant/20 rounded-xl p-4 flex items-center gap-4">
                <div className="w-10 h-10 bg-error-container/20 rounded-lg flex items-center justify-center text-error">
                  <span className="material-symbols-outlined">bolt</span>
                </div>
                <div className="flex-1">
                  <p className="text-[11px] font-bold text-on-surface-variant leading-none mb-1">ESB_STATEMENT_Q2.PDF</p>
                  <div className="flex justify-between items-end">
                    <span className="text-xs text-on-surface italic">"Account: 9940... Saving Eligibility: Yes"</span>
                    <span className="text-[10px] bg-primary-container/10 text-primary px-2 py-0.5 rounded-full font-bold">IDENTIFIED</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Suggested Actions */}
          <div className="flex flex-wrap gap-2 pt-2">
            <button className="signature-gradient text-white px-5 py-2.5 rounded-full text-sm font-bold shadow-lg shadow-primary/20 active:scale-95 transition-transform">
              Apply Credit Now
            </button>
            <button className="bg-surface-container-high text-on-surface px-5 py-2.5 rounded-full text-sm font-medium hover:bg-surface-container-highest transition-colors">
              Show Calculations
            </button>
            <button onClick={onClose} className="bg-surface-container-high text-on-surface px-5 py-2.5 rounded-full text-sm font-medium hover:bg-surface-container-highest transition-colors">
              Later
            </button>
          </div>
        </div>

        {/* Input Area */}
        <div className="p-4 bg-surface-container-lowest border-t border-outline-variant/10">
          <div className="relative flex items-center">
            <input
              className="w-full bg-surface-container-low border-none rounded-full py-4 pl-6 pr-14 text-sm focus:ring-2 focus:ring-primary/20 placeholder:text-on-surface-variant/50"
              placeholder="Ask me anything about your finances..."
              type="text"
            />
            <button className="absolute right-2 w-10 h-10 bg-primary rounded-full text-white flex items-center justify-center shadow-md active:scale-90 transition-transform">
              <span className="material-symbols-outlined">arrow_upward</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
