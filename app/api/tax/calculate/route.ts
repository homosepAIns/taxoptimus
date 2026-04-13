import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { spawnSync } from 'child_process'
import { writeFileSync, readFileSync, unlinkSync, mkdtempSync, rmdirSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

export const runtime = 'nodejs'
export const maxDuration = 60

// Maps income_profiles.tax_status → Python UserProfile.marital_status
function toMaritalStatus(taxStatus: string, isOneParent: boolean): [string, boolean] {
  switch (taxStatus) {
    case 'married-one':  return ['Married_1_Income', false]
    case 'married-two':  return ['Married_2_Incomes', false]
    case 'one-parent':   return ['Single', true]
    default:             return ['Single', false]
  }
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

  const body = await req.json()
  const {
    gross_income,
    age,
    tax_status,
    has_medical_card,
    employment_type       = 'PAYE',
    remote_working_days   = 0,
    annual_wfh_utility_costs = 0,
    annual_rent_paid      = 0,
    qualifying_health_expenses = 0,
    bik                   = 0,
    employer_health_premium = 0,
  } = body

  const [marital_status, claims_single_child_carer] = toMaritalStatus(tax_status, tax_status === 'one-parent')

  const profileInput = {
    gross_income,
    age,
    marital_status,
    employment_type,
    medical_card: has_medical_card,
    remote_working_days,
    annual_wfh_utility_costs,
    annual_rent_paid,
    qualifying_health_expenses,
    bik,
    employer_health_premium,
    claims_single_child_carer,
    tax_year: 2026,
  }

  const inputPayload = {
    mode: 'calculate',
    profile: profileInput,
    investments: {},
  }

  let tmpDir: string | null = null
  let inputPath: string | null = null
  let outputPath: string | null = null

  try {
    tmpDir     = mkdtempSync(join(tmpdir(), 'taxcalc-'))
    inputPath  = join(tmpDir, 'input.json')
    outputPath = join(tmpDir, 'output.json')

    writeFileSync(inputPath, JSON.stringify(inputPayload))

    const scriptPath = join(process.cwd(), 'tax_calculator.py')
    const proc = spawnSync('python', [scriptPath, '--input', inputPath, '--output', outputPath], {
      timeout: 55_000,
      encoding: 'utf-8',
    })

    if (proc.status !== 0) {
      console.error('[tax/calculate] Python stderr:', proc.stderr)
      throw new Error(proc.stderr || 'Python tax_calculator failed')
    }

    const result = JSON.parse(readFileSync(outputPath, 'utf-8'))
    return NextResponse.json(result)

  } catch (err) {
    console.error('[tax/calculate] Error:', err)
    return NextResponse.json({ error: 'Calculation failed', detail: String(err) }, { status: 500 })

  } finally {
    try { if (inputPath)  unlinkSync(inputPath)  } catch { /* ignore */ }
    try { if (outputPath) unlinkSync(outputPath) } catch { /* ignore */ }
    try { if (tmpDir)     rmdirSync(tmpDir)      } catch { /* ignore */ }
  }
}
