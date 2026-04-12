'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import BottomNavBar from '@/components/BottomNavBar'
import TopAppBar from '@/components/TopAppBar'
import { supabase, type Document, type Transaction } from '@/lib/supabase'

// ── Constants ─────────────────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, string> = {
  'Food & Dining':      '#E74C3C',
  'Travel & Transport': '#3498DB',
  'Shopping':           '#9B59B6',
  'Entertainment':      '#1ABC9C',
  'Health & Medical':   '#F39C12',
  'Utilities & Bills':  '#2ECC71',
  'Education':          '#E67E22',
  'Finance & Banking':  '#34495E',
  'Personal Care':      '#E91E63',
  'Other':              '#95A5A6',
}

const CATEGORY_ICONS: Record<string, string> = {
  'Food & Dining':      'restaurant',
  'Travel & Transport': 'directions_car',
  'Shopping':           'shopping_bag',
  'Entertainment':      'theaters',
  'Health & Medical':   'medical_services',
  'Utilities & Bills':  'receipt_long',
  'Education':          'school',
  'Finance & Banking':  'account_balance',
  'Personal Care':      'spa',
  'Other':              'category',
}

type Mode = 'bank_statement' | 'bill'

interface AnalysisResult {
  document_type: string
  document_date: string | null
  currency: string
  total_amount: number
  transactions: { description: string; amount: number; category: string; date: string | null }[]
  category_summary: Record<string, number>
  insights: string[]
  document_id?: string
}

function fmt(n: number) {
  return n.toLocaleString('en-IE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function UploadPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dropRef = useRef<HTMLDivElement>(null)

  const [mode, setMode]           = useState<Mode>('bank_statement')
  const [file, setFile]           = useState<File | null>(null)
  const [dragging, setDragging]   = useState(false)
  const [status, setStatus]       = useState<'idle' | 'uploading' | 'analyzing' | 'done' | 'error'>('idle')
  const [statusMsg, setStatusMsg] = useState('')
  const [result, setResult]       = useState<AnalysisResult | null>(null)
  const [documents, setDocuments] = useState<Document[]>([])
  const [recentTx, setRecentTx]   = useState<Transaction[]>([])

  // Auth guard + load existing documents/transactions
  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.replace('/login'); return }

      const [docsRes, txRes] = await Promise.all([
        supabase.from('documents').select('*').eq('user_id', session.user.id)
          .order('uploaded_at', { ascending: false }).limit(10),
        supabase.from('transactions').select('*').eq('user_id', session.user.id)
          .order('transaction_date', { ascending: false }).limit(100),
      ])
      if (docsRes.data) setDocuments(docsRes.data as Document[])
      if (txRes.data)   setRecentTx(txRes.data as Transaction[])
    }
    init()
  }, [router])

  // Drag & drop
  const onDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setDragging(true) }, [])
  const onDragLeave = useCallback(() => setDragging(false), [])
  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped) setFile(dropped)
  }, [])

  async function handleAnalyze() {
    if (!file) return
    setStatus('uploading')
    setStatusMsg('Uploading file…')
    setResult(null)

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.replace('/login'); return }

    const form = new FormData()
    form.append('file', file)
    form.append('mode', mode)

    setStatus('analyzing')
    setStatusMsg('AI is reading your document…')

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: form,
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? err.detail ?? 'Unknown error')
      }

      const data: AnalysisResult = await res.json()
      setResult(data)
      setStatus('done')
      setStatusMsg(`Extracted ${data.transactions?.length ?? 0} transactions`)

      // Refresh documents and transactions lists
      const [docsRes, txRes] = await Promise.all([
        supabase.from('documents').select('*').eq('user_id', session.user.id)
          .order('uploaded_at', { ascending: false }).limit(10),
        supabase.from('transactions').select('*').eq('user_id', session.user.id)
          .order('transaction_date', { ascending: false }).limit(100),
      ])
      if (docsRes.data) setDocuments(docsRes.data as Document[])
      if (txRes.data)   setRecentTx(txRes.data as Transaction[])
    } catch (err) {
      setStatus('error')
      setStatusMsg(String(err))
    }
  }

  // Active categories in the current result
  const activeResultCats = result
    ? Object.entries(result.category_summary).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1])
    : []

  return (
    <div className="bg-surface text-on-surface font-body">
      <TopAppBar />

      <main className="pt-24 pb-32 px-6 max-w-5xl mx-auto space-y-10">

        {/* ── Upload card ── */}
        <section>
          <h1 className="font-headline font-extrabold text-4xl mb-2 tracking-tight">Upload Document</h1>
          <p className="text-on-surface-variant mb-8">Upload a bank statement or bill — our AI extracts every transaction automatically.</p>

          {/* Mode toggle */}
          <div className="flex gap-3 mb-6">
            {([['bank_statement', 'account_balance', 'Bank Statement'], ['bill', 'receipt_long', 'Bill / Receipt']] as const).map(([val, icon, label]) => (
              <button
                key={val}
                onClick={() => setMode(val)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold transition-all ${
                  mode === val
                    ? 'bg-primary text-white shadow-md'
                    : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high border border-outline-variant/20'
                }`}
              >
                <span className="material-symbols-outlined text-base">{icon}</span>
                {label}
              </button>
            ))}
          </div>

          {/* Drop zone */}
          <div
            ref={dropRef}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            className={`relative border-2 border-dashed rounded-3xl p-12 flex flex-col items-center justify-center text-center transition-all cursor-pointer ${
              dragging
                ? 'border-primary bg-primary/5 scale-[1.01]'
                : file
                ? 'border-primary/40 bg-primary/5'
                : 'border-outline-variant/30 bg-surface-container-lowest hover:border-primary/40'
            }`}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 shadow-md ${file ? 'bg-primary' : 'signature-gradient'}`}>
              <span className="material-symbols-outlined text-white text-3xl">
                {file ? 'description' : 'cloud_upload'}
              </span>
            </div>

            {file ? (
              <>
                <p className="font-bold text-lg text-on-surface">{file.name}</p>
                <p className="text-sm text-on-surface-variant mt-1">{fileSize(file.size)} · Click to change file</p>
              </>
            ) : (
              <>
                <p className="font-bold text-xl mb-1">Drop your file here</p>
                <p className="text-on-surface-variant text-sm">PDF, PNG, JPG, HEIC up to 25 MB</p>
              </>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.heic,.webp"
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) setFile(f) }}
            />
          </div>

          {/* Analyze button + status */}
          <div className="mt-5 flex flex-col sm:flex-row items-center gap-4">
            <button
              onClick={handleAnalyze}
              disabled={!file || status === 'analyzing' || status === 'uploading'}
              className="signature-gradient text-white px-8 py-3.5 rounded-2xl font-bold shadow-md hover:shadow-xl transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {(status === 'uploading' || status === 'analyzing') ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {statusMsg}
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: '"FILL" 1' }}>smart_toy</span>
                  Analyse with AI
                </>
              )}
            </button>

            {status === 'done' && (
              <div className="flex items-center gap-2 text-sm font-medium text-primary">
                <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: '"FILL" 1' }}>check_circle</span>
                {statusMsg}
              </div>
            )}
            {status === 'error' && (
              <div className="flex items-center gap-2 text-sm font-medium text-error">
                <span className="material-symbols-outlined text-base">error</span>
                {statusMsg}
              </div>
            )}
          </div>
        </section>

        {/* ── Analysis results ── */}
        {result && (
          <section className="space-y-6">
            {/* Header: doc type, date, total */}
            <div className="bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant/10 flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs text-on-surface-variant uppercase tracking-widest mb-1 font-semibold">{result.document_type}</p>
                <p className="font-headline font-extrabold text-3xl text-on-surface">{result.currency}{fmt(result.total_amount)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-on-surface-variant uppercase tracking-widest mb-1 font-semibold">Date</p>
                <p className="font-bold text-lg text-on-surface">{result.document_date ?? 'N/A'}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-on-surface-variant uppercase tracking-widest mb-1 font-semibold">Transactions</p>
                <p className="font-bold text-lg text-on-surface">{result.transactions?.length ?? 0} items</p>
              </div>
            </div>

            {/* Spending by Category */}
            <div className="bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant/10">
              <h3 className="font-bold text-lg mb-5 uppercase tracking-widest text-xs text-on-surface-variant">Spending by Category</h3>
              {activeResultCats.length > 0 ? (
                <div className="space-y-3">
                  {activeResultCats.map(([cat, amt]) => {
                    const pct = result.total_amount > 0 ? (amt / result.total_amount) * 100 : 0
                    const color = CATEGORY_COLORS[cat] ?? '#95A5A6'
                    const barFilled = Math.round(pct / 5) // up to 20 blocks
                    return (
                      <div key={cat} className="flex items-center gap-3 text-sm">
                        <span
                          className="w-44 flex-shrink-0 font-medium truncate text-on-surface"
                          style={{ color }}
                        >{cat}</span>
                        <span className="w-28 flex-shrink-0 font-bold text-on-surface tabular-nums text-right">
                          {result.currency}{fmt(amt)}
                        </span>
                        <div className="flex-1 h-2 bg-surface-container-low rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
                        </div>
                        <span className="w-12 flex-shrink-0 text-right text-on-surface-variant tabular-nums">
                          {pct.toFixed(1)}%
                        </span>
                      </div>
                    )
                  })}
                  <div className="flex items-center gap-3 text-sm border-t border-outline-variant/20 pt-3 mt-1">
                    <span className="w-44 flex-shrink-0 font-extrabold text-on-surface uppercase tracking-wide text-xs">Total</span>
                    <span className="w-28 flex-shrink-0 font-extrabold text-on-surface tabular-nums text-right">
                      {result.currency}{fmt(result.total_amount)}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-on-surface-variant text-sm">No category data available.</p>
              )}
            </div>

            {/* Transactions table */}
            {result.transactions?.length > 0 && (
              <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/10 overflow-hidden">
                <div className="px-6 pt-5 pb-3 border-b border-outline-variant/10">
                  <h3 className="uppercase tracking-widest text-xs font-bold text-on-surface-variant">
                    Transactions ({result.transactions.length} items)
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-outline-variant/10 text-xs text-on-surface-variant uppercase tracking-wide">
                        <th className="text-left px-6 py-3 font-semibold">Description</th>
                        <th className="text-left px-4 py-3 font-semibold">Category</th>
                        <th className="text-right px-4 py-3 font-semibold">Amount</th>
                        <th className="text-right px-6 py-3 font-semibold">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/10">
                      {result.transactions.map((tx, i) => {
                        const color = CATEGORY_COLORS[tx.category] ?? '#95A5A6'
                        return (
                          <tr key={i} className="hover:bg-surface-container-low transition-colors">
                            <td className="px-6 py-3 font-medium text-on-surface max-w-[200px] truncate">{tx.description}</td>
                            <td className="px-4 py-3">
                              <span className="flex items-center gap-1.5">
                                <span className="material-symbols-outlined text-xs flex-shrink-0" style={{ color }}>{CATEGORY_ICONS[tx.category] ?? 'category'}</span>
                                <span style={{ color }} className="font-medium">{tx.category}</span>
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right font-bold tabular-nums text-on-surface">{result.currency}{fmt(tx.amount)}</td>
                            <td className="px-6 py-3 text-right text-on-surface-variant tabular-nums">
                              {tx.date ? new Date(tx.date).toLocaleDateString('en-IE', { day: 'numeric', month: 'short', year: '2-digit' }) : '—'}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Insights */}
            {result.insights?.length > 0 && (
              <div className="bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant/10">
                <div className="flex items-center gap-2 mb-4">
                  <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: '"FILL" 1' }}>smart_toy</span>
                  <h3 className="uppercase tracking-widest text-xs font-bold text-on-surface-variant">Insights</h3>
                </div>
                <ul className="space-y-2.5">
                  {result.insights.map((ins, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-on-surface-variant leading-relaxed">
                      <span className="text-primary font-bold mt-0.5 flex-shrink-0">•</span>
                      {ins}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}

        {/* ── Uploaded Files ── */}
        <section className="space-y-5">
          <h2 className="font-headline font-bold text-2xl">Uploaded Files</h2>
          {documents.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {documents.map(doc => (
                <div key={doc.id} className="bg-surface-container-lowest p-4 rounded-2xl flex items-center gap-4 border border-outline-variant/10">
                  <div className="w-11 h-11 bg-surface-container-high rounded-xl flex items-center justify-center text-primary flex-shrink-0">
                    <span className="material-symbols-outlined">
                      {doc.file_type?.includes('pdf') ? 'picture_as_pdf' : 'image'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-on-surface truncate" title={doc.file_name}>{doc.file_name}</p>
                    <p className="text-xs text-on-surface-variant mt-0.5">
                      {new Date(doc.uploaded_at).toLocaleDateString('en-IE', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                    <p className="text-xs text-on-surface-variant">{fileSize(doc.file_size)}</p>
                  </div>
                  <span className={`text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full flex-shrink-0 ${
                    doc.status === 'extracted' ? 'bg-primary-container/20 text-primary' :
                    doc.status === 'error'     ? 'bg-error-container/20 text-error' :
                                                 'bg-surface-container-high text-on-surface-variant'
                  }`}>
                    {doc.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-surface-container-lowest rounded-2xl p-8 text-center border border-outline-variant/10">
              <span className="material-symbols-outlined text-4xl text-on-surface-variant/30 mb-3 block">folder_open</span>
              <p className="text-on-surface-variant text-sm">No documents uploaded yet</p>
            </div>
          )}
        </section>

      </main>

      <BottomNavBar />
    </div>
  )
}
