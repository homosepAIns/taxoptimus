import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const maxDuration = 60

// Base URL for FastAPI
const FASTAPI_URL = process.env.FASTAPI_URL || 'http://127.0.0.1:8000'

// Maps frontend tax_status keys to FastAPI/engine.py keys
function toMaritalStatus(taxStatus: string): { marital_status: string; claims_single_child_carer: boolean } {
  switch (taxStatus) {
    case 'married-one':  return { marital_status: 'Married_1_Income', claims_single_child_carer: false }
    case 'married-two':  return { marital_status: 'Married_2_Incomes', claims_single_child_carer: false }
    case 'one-parent':   return { marital_status: 'Single',          claims_single_child_carer: true }
    default:             return { marital_status: 'Single',          claims_single_child_carer: false }
  }
}

export async function POST(req: NextRequest) {
  // Allow anonymous calculations (e.g. for landing page chat).
  // Data is only persisted if the frontend saves it after login.
  const body = await req.json()
  const {
    // Basic Profile
    gross_income,
    age,
    tax_status,
    medical_card,
    has_medical_card,
    employment_type = 'PAYE',
    tax_year = 2026,

    // Extra Income
    second_income = 0,
    rent_a_room_income = 0,
    micro_generation_income = 0,

    // Life Circumstance Credits
    is_blind = false,
    has_incapacitated_child = false,
    claims_home_carer = false,
    claims_single_child_carer: body_claims_scc, // optional override
    claims_dependent_relative = false,
    widowed_years_since = -1,

    // Expenses & Reliefs
    remote_working_days = 0,
    annual_wfh_utility_costs = 0,
    annual_rent_paid = 0,
    qualifying_health_expenses = 0,
    qualifying_tuition_fees = 0,
    flat_rate_expense = 0,
    nursing_home_fees = 0,
    employee_health_insurance = 0,
    bik = 0,
    employer_health_premium = 0,
    additional_tax_credits = 0,

    // Investments (if manual values provided)
    pension_contribution = 0,
    voucher_allocation = 0,
    cycle_to_work = 0,
    cycle_type = 'regular',
    cycle_to_work_mode = 'annual',
    travel_pass = 0,
    income_protection_premium = 0,
    charitable_donations = 0,
    eiis_investment = 0,
    deeds_of_covenant = 0,
  } = body

  const { marital_status, claims_single_child_carer: default_claims_scc } = toMaritalStatus(tax_status)
  const final_claims_scc = body_claims_scc ?? default_claims_scc

  // Construct payload for FastAPI /calculate
  const payload = {
    profile: {
      gross_income: Number(gross_income),
      age: Number(age),
      marital_status,
      employment_type,
      medical_card: !!(medical_card ?? has_medical_card),
      second_income: Number(second_income),
      rent_a_room_income: Number(rent_a_room_income),
      annual_rent_paid: Number(annual_rent_paid),
      qualifying_health_expenses: Number(qualifying_health_expenses),
      bik: Number(bik),
      employer_health_premium: Number(employer_health_premium),
      additional_tax_credits: Number(additional_tax_credits),
      has_incapacitated_child: !!has_incapacitated_child,
      claims_home_carer: !!claims_home_carer,
      claims_single_child_carer: !!final_claims_scc,
      claims_dependent_relative: !!claims_dependent_relative,
      widowed_years_since: Number(widowed_years_since),
      tax_year: Number(tax_year),
      remote_working_days: Number(remote_working_days),
      annual_wfh_utility_costs: Number(annual_wfh_utility_costs),
      qualifying_tuition_fees: Number(qualifying_tuition_fees),
      flat_rate_expense: Number(flat_rate_expense),
      employee_health_insurance: Number(employee_health_insurance),
    },
    investments: {
      pension_contribution: Number(pension_contribution),
      voucher_allocation: Number(voucher_allocation),
      cycle_to_work: Number(cycle_to_work),
      cycle_type,
      cycle_to_work_mode,
      travel_pass: Number(travel_pass),
      income_protection_premium: Number(income_protection_premium),
      charitable_donations: Number(charitable_donations),
      eiis_investment: Number(eiis_investment),
      deeds_of_covenant: Number(deeds_of_covenant),
    }
  }

  try {
    const response = await fetch(`${FASTAPI_URL}/calculate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`FastAPI Error: ${errorText}`)
    }

    const data = await response.json()
    return NextResponse.json(data)

  } catch (err) {
    console.error('[tax/calculate] Proxy Error:', err)
    return NextResponse.json({ error: 'Calculation failed', detail: String(err) }, { status: 500 })
  }
}
