import { supabase } from '@/lib/supabase'

/**
 * If the user completed the landing-page tax calculator before signing up / logging in,
 * their inputs were saved to localStorage. Call this right after a successful auth event
 * to move that data into income_profiles and clear the local copy.
 */
export async function flushPendingCalc(userId: string): Promise<void> {
  const raw = localStorage.getItem('taxoptimus_pending_calc')
  if (!raw) return

  try {
    const data = JSON.parse(raw)
    const { error } = await supabase.from('income_profiles').insert({
      user_id:                 userId,
      gross_income:            data.grossIncome,
      tax_status:              data.taxStatus,
      age:                     data.age,
      has_medical_card:        data.hasMedicalCard,
      prsi_annual:             data.prsiAnnual,
      usc_annual:              data.uscAnnual,
      income_tax_annual:       data.incomeTaxAnnual,
      net_monthly:             data.netMonthly,
      pension_monthly:         data.pensionMonthly    ?? null,
      potential_annual_saving: data.potentialAnnualSaving ?? null,
    })
    if (!error) localStorage.removeItem('taxoptimus_pending_calc')
    else console.error('[flushPendingCalc] insert error:', error)
  } catch (e) {
    console.error('[flushPendingCalc] parse error:', e)
  }
}
