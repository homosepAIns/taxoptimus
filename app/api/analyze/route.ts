import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { spawnSync } from 'child_process'
import { writeFileSync, readFileSync, unlinkSync, mkdtempSync, rmdirSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

export const runtime = 'nodejs'
export const maxDuration = 120

// ── Types ─────────────────────────────────────────────────────────────────────

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

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // 1. Verify auth
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // 2. Parse multipart form
  const form = await req.formData()
  const file = form.get('file') as File | null
  const mode = (form.get('mode') as string) ?? 'bank_statement'
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  const bytes  = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)
  const isPdf  = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')

  // 3. Insert document row (status = processing)
  const { data: docRow } = await supabase.from('documents').insert({
    user_id:      user.id,
    file_name:    file.name,
    file_size:    file.size,
    file_type:    file.type || (isPdf ? 'application/pdf' : 'image/jpeg'),
    storage_path: '',
    status:       'processing',
  }).select().single()

  // 4. Write file to temp dir, call Python script, read JSON back
  let tmpDir: string | null = null
  let inputPath: string | null = null
  let outputPath: string | null = null

  try {
    tmpDir     = mkdtempSync(join(tmpdir(), 'taxoptimus-'))
    inputPath  = join(tmpDir, file.name)
    outputPath = join(tmpDir, 'analysis.json')

    writeFileSync(inputPath, buffer)

    const scriptPath = join(process.cwd(), 'financial_analyzer.py')

    console.log(`[analyze] Calling Python: ${scriptPath} --file ${inputPath} --mode ${mode}`)

    const proc = spawnSync('python', [
      scriptPath,
      '--file',   inputPath,
      '--mode',   mode,
      '--output', outputPath,
    ], {
      timeout:  110_000,
      encoding: 'utf-8',
    })

    if (proc.status !== 0) {
      const errMsg = proc.stderr || proc.stdout || 'Python script failed'
      console.error('[analyze] Python stderr:', proc.stderr)
      throw new Error(errMsg)
    }

    console.log('[analyze] Python stdout:', proc.stdout?.slice(0, 200))

    const rawJson = readFileSync(outputPath, 'utf-8')
    const result: AnalysisResult = JSON.parse(rawJson)

    // Ensure total_amount is set
    if (!result.total_amount && result.transactions?.length) {
      result.total_amount = result.transactions.reduce((s, t) => s + (t.amount || 0), 0)
    }

    // 5. Save transactions to Supabase
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

    // 6. Mark document as extracted and store the report JSON
    if (docRow?.id) {
      await supabase.from('documents').update({
        status:      'extracted',
        report_json: result,
      }).eq('id', docRow.id)
    }

    return NextResponse.json({ ...result, document_id: docRow?.id })

  } catch (err) {
    console.error('[analyze] Error:', err)
    if (docRow?.id) {
      await supabase.from('documents').update({ status: 'error' }).eq('id', docRow.id)
    }
    return NextResponse.json({ error: 'Analysis failed', detail: String(err) }, { status: 500 })

  } finally {
    // Clean up temp files
    try { if (inputPath)  unlinkSync(inputPath)  } catch { /* ignore */ }
    try { if (outputPath) unlinkSync(outputPath) } catch { /* ignore */ }
    try { if (tmpDir)     rmdirSync(tmpDir)      } catch { /* ignore */ }
  }
}
