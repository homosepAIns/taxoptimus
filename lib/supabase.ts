import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// ── Type helpers (extend as you build out tables) ─────────────────────────────

export type Document = {
  id: string
  user_id: string
  file_name: string
  file_size: number
  file_type: string
  storage_path: string
  status: 'processing' | 'extracted' | 'error'
  uploaded_at: string
  report_json: Record<string, unknown> | null
}

export type Transaction = {
  id: string
  user_id: string
  document_id: string | null
  merchant: string
  amount: number
  category: string
  transaction_date: string
  description: string
  is_vat_applicable: boolean
  vat_amount: number | null
  geocoded_location: string | null
  created_at: string
}

export type SavingsGoal = {
  id: string
  user_id: string
  name: string
  target_amount: number
  current_amount: number
  target_date: string | null
  created_at: string
}

export type AssetAllocation = {
  id: string
  user_id: string
  monthly_surplus: number
  age: number
  risk_tolerance: 'low' | 'balanced' | 'high'
  prsa_percentage: number
  etf_percentage: number
  prize_bonds_percentage: number
  calculated_at: string
}

export type TaxStatus = 'single' | 'married-one' | 'married-two' | 'one-parent'

export type TaxProfile = {
  id: string
  user_id: string
  employment_type: 'PAYE' | 'Self-Employed'
  age: number
  marital_status: string
  medical_card: boolean
  tax_year: number

  // Extra income
  second_income: number
  rent_a_room_income: number

  // Life circumstance credits
  has_incapacitated_child: boolean
  claims_home_carer: boolean
  claims_single_child_carer: boolean
  claims_dependent_relative: boolean
  widowed_years_since: number

  // Expenses & Reliefs
  remote_working_days: number
  annual_wfh_utility_costs: number
  annual_rent_paid: number
  qualifying_health_expenses: number
  qualifying_tuition_fees: number
  flat_rate_expense: number
  employee_health_insurance: number
  bik: number
  employer_health_premium: number
  additional_tax_credits: number
  eiis_max_willing: number
  deeds_max_willing: number
  micro_generation_income: number
  is_blind: boolean
  nursing_home_fees: number

  // Optimizer Levers
  required_liquid_cash: number
  pension_contribution: number
  voucher_allocation: number
  cycle_to_work: number
  cycle_type: 'regular' | 'ebike'
  cycle_to_work_mode: 'annual' | 'lump'
  travel_pass: number
  income_protection_premium: number
  charitable_donations: number
  eiis_investment: number
  deeds_of_covenant: number

  // Optimizer Weights
  weight_pension: number
  weight_cycle: number
  weight_travel: number
  weight_ip: number

  calc_result: Record<string, unknown> | null
  created_at: string
}

export type IncomeProfile = {
  id: string
  user_id: string
  // Inputs collected in the landing-page chat
  gross_income: number
  tax_status: TaxStatus
  age: number
  has_medical_card: boolean
  // Calculated deductions
  prsi_annual: number
  usc_annual: number
  income_tax_annual: number
  net_monthly: number
  // Optional follow-up (pension path)
  pension_monthly: number | null
  potential_annual_saving: number | null
  created_at: string
}
