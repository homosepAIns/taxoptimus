import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

const FASTAPI_URL = process.env.FASTAPI_URL || 'http://127.0.0.1:8000'

function toMaritalStatus(taxStatus: string): { marital_status: string; claims_single_child_carer: boolean } {
  switch (taxStatus) {
    case 'married-one':  return { marital_status: 'Married_1_Income', claims_single_child_carer: false }
    case 'married-two':  return { marital_status: 'Married_2_Incomes', claims_single_child_carer: false }
    case 'one-parent':   return { marital_status: 'Single',          claims_single_child_carer: true }
    default:             return { marital_status: 'Single',          claims_single_child_carer: false }
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

  try {
    const [incomeRes, taxRes] = await Promise.all([
      supabase.from('income_profiles').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('tax_profiles').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle()
    ])

    if (!incomeRes.data) return NextResponse.json({ error: 'Income profile missing' }, { status: 400 })
    
    const inc = incomeRes.data
    const tax = taxRes.data || {}
    const { marital_status, claims_single_child_carer } = toMaritalStatus(inc.tax_status)

    const payload = {
      profile: {
        gross_income: Number(inc.gross_income),
        age: Number(inc.age),
        marital_status,
        employment_type: tax.employment_type || 'PAYE',
        medical_card: !!inc.has_medical_card,
        second_income: Number(tax.second_income || 0),
        rent_a_room_income: Number(tax.rent_a_room_income || 0),
        micro_generation_income: Number(tax.micro_generation_income || 0),
        annual_rent_paid: Number(tax.annual_rent_paid || 0),
        qualifying_health_expenses: Number(tax.qualifying_health_expenses || 0),
        bik: Number(tax.bik || 0),
        employer_health_premium: Number(tax.employer_health_premium || 0),
        additional_tax_credits: Number(tax.additional_tax_credits || 0),
        is_blind: !!tax.is_blind,
        has_incapacitated_child: !!tax.has_incapacitated_child,
        claims_home_carer: !!tax.claims_home_carer,
        claims_single_child_carer: !!claims_single_child_carer,
        claims_dependent_relative: !!tax.claims_dependent_relative,
        widowed_years_since: Number(tax.widowed_years_since ?? -1),
        tax_year: Number(tax.tax_year || 2026),
        remote_working_days: Number(tax.remote_working_days || 0),
        annual_wfh_utility_costs: Number(tax.annual_wfh_utility_costs || 0),
        qualifying_tuition_fees: Number(tax.qualifying_tuition_fees || 0),
        flat_rate_expense: Number(tax.flat_rate_expense || 0),
        nursing_home_fees: Number(tax.nursing_home_fees || 0),
        employee_health_insurance: Number(tax.employee_health_insurance || 0),
      },
      investments: {
        pension_contribution: Number(tax.pension_contribution || 0),
        voucher_allocation: Number(tax.voucher_allocation || 0),
        cycle_to_work: Number(tax.cycle_to_work || 0),
        cycle_type: tax.cycle_type || 'regular',
        cycle_to_work_mode: tax.cycle_to_work_mode || 'annual',
        travel_pass: Number(tax.travel_pass || 0),
        income_protection_premium: Number(tax.income_protection_premium || 0),
        charitable_donations: Number(tax.charitable_donations || 0),
        eiis_investment: Number(tax.eiis_investment || 0),
        deeds_of_covenant: Number(tax.deeds_of_covenant || 0),
      }
    }

    const response = await fetch(`${FASTAPI_URL}/bounds`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`FastAPI Bounds Error: ${errorText}`)
    }

    const result = await response.json()
    return NextResponse.json(result)

  } catch (err) {
    console.error('[tax/bounds] Proxy Error:', err)
    return NextResponse.json({ error: 'Bounds check failed', detail: String(err) }, { status: 500 })
  }
}
