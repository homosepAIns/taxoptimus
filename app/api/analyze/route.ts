import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const maxDuration = 120

const FASTAPI_URL = process.env.FASTAPI_URL || 'http://127.0.0.1:8000'

interface AnalysisTx {
  description: string
  amount: number
  category: string
  date: string | null
}

interface AnalysisResult {
  document_type: string
  document_date: string | null
  currency: string
  total_amount: number
  transactions: AnalysisTx[]
  category_summary: Record<string, number>
  insights: string[]
}

export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const form = await req.formData()
  const file = form.get('file') as File | null
  const mode = (form.get('mode') as string) ?? 'bank_statement'
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')

  const { data: docRow, error: insertError } = await supabase.from('documents').insert({
    user_id:      user.id,
    file_name:    file.name,
    file_size:    file.size,
    file_type:    file.type || (isPdf ? 'application/pdf' : 'image/jpeg'),
    storage_path: '',
    status:       'processing',
  }).select().single()

  if (insertError) {
    console.error('[analyze] INSERT failed:', JSON.stringify(insertError))
    return NextResponse.json({ error: 'Failed to create document record', detail: insertError.message }, { status: 500 })
  }

  try {
    const proxyForm = new FormData()
    const blob = new Blob([await file.arrayBuffer()], { type: file.type })
    proxyForm.append('file', blob, file.name)
    proxyForm.append('mode', mode)

    const response = await fetch(`${FASTAPI_URL}/analyze`, {
      method: 'POST',
      body: proxyForm,
    })

    if (!response.ok) {
      const errText = await response.text()
      throw new Error(`FastAPI /analyze error (${response.status}): ${errText}`)
    }

    const result: AnalysisResult = await response.json()

    if (!result.total_amount && result.transactions?.length) {
      result.total_amount = result.transactions.reduce((s, t) => s + (t.amount || 0), 0)
    }

    const txRows = (result.transactions ?? [])
      .filter(t => t.amount > 0)
      .map(t => ({
        user_id:           user.id,
        document_id:       docRow?.id ?? null,
        merchant:          (t.description ?? '').slice(0, 200),
        amount:            t.amount,
        category:          t.category ?? 'Other',
        transaction_date:  t.date ?? new Date().toISOString().split('T')[0],
        description:       (t.description ?? '').slice(0, 500),
        is_vat_applicable: false,
        vat_amount:        null,
        geocoded_location: null,
      }))

    if (txRows.length > 0) {
      await supabase.from('transactions').insert(txRows)
    }

    if (docRow?.id) {
      const { error: updateError } = await supabase.from('documents').update({
        status:      'extracted',
        report_json: result,
      }).eq('id', docRow.id)
      if (updateError) console.error('[analyze] UPDATE failed:', JSON.stringify(updateError))
    }

    return NextResponse.json({ ...result, document_id: docRow?.id })

  } catch (err) {
    console.error('[analyze] Error:', err)
    if (docRow?.id) {
      await supabase.from('documents').update({ status: 'error' }).eq('id', docRow.id)
    }
    return NextResponse.json({ error: 'Analysis failed', detail: String(err) }, { status: 500 })
  }
}
