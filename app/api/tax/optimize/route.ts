import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { spawnSync } from 'child_process'
import { writeFileSync, readFileSync, unlinkSync, mkdtempSync, rmdirSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

export const runtime = 'nodejs'
export const maxDuration = 60

function toMaritalStatus(taxStatus: string): [string, boolean] {
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
    employment_type            = 'PAYE',
    remote_working_days        = 0,
    annual_wfh_utility_costs   = 0,
    annual_rent_paid           = 0,
    qualifying_health_expenses = 0,
    bik                        = 0,
    employer_health_premium    = 0,
    // Investment levers (starting values / manual overrides)
    pension_contribution       = 0,
    voucher_allocation         = 0,
    cycle_to_work              = 0,
    cycle_type                 = 'regular',
    travel_pass                = 0,
    income_protection_premium  = 0,
    required_liquid_cash       = 0,
  } = body

  const [marital_status, claims_single_child_carer] = toMaritalStatus(tax_status)

  const inputPayload = {
    mode: 'optimize',
    profile: {
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
    },
    investments: {
      pension_contribution,
      voucher_allocation,
      cycle_to_work,
      cycle_type,
      travel_pass,
      income_protection_premium,
    },
    required_liquid_cash,
  }

  let tmpDir: string | null = null
  let inputPath: string | null = null
  let outputPath: string | null = null

  try {
    tmpDir     = mkdtempSync(join(tmpdir(), 'taxopt-'))
    inputPath  = join(tmpDir, 'input.json')
    outputPath = join(tmpDir, 'output.json')

    writeFileSync(inputPath, JSON.stringify(inputPayload))

    const scriptPath = join(process.cwd(), 'tax_calculator.py')
    const proc = spawnSync('python', [scriptPath, '--input', inputPath, '--output', outputPath], {
      timeout: 55_000,
      encoding: 'utf-8',
    })

    if (proc.status !== 0) {
      console.error('[tax/optimize] Python stderr:', proc.stderr)
      throw new Error(proc.stderr || 'Python optimizer failed')
    }

    const result = JSON.parse(readFileSync(outputPath, 'utf-8'))
    return NextResponse.json(result)

  } catch (err) {
    console.error('[tax/optimize] Error:', err)
    return NextResponse.json({ error: 'Optimization failed', detail: String(err) }, { status: 500 })

  } finally {
    try { if (inputPath)  unlinkSync(inputPath)  } catch { /* ignore */ }
    try { if (outputPath) unlinkSync(outputPath) } catch { /* ignore */ }
    try { if (tmpDir)     rmdirSync(tmpDir)      } catch { /* ignore */ }
  }
}
