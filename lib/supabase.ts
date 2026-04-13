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
  remote_working_days: number
  annual_wfh_utility_costs: number
  annual_rent_paid: number
  qualifying_health_expenses: number
  bik: number
  employer_health_premium: number
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
