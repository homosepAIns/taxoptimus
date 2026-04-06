'use client'
import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function SavePendingCalc() {
  useEffect(() => {
    async function save() {
      const raw = localStorage.getItem('taxoptimus_pending_calc')
      if (!raw) return

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      try {
        const c = JSON.parse(raw)
        await supabase.from('income_profiles').insert({
          user_id:                session.user.id,
          gross_income:           c.grossIncome,
          tax_status:             c.taxStatus,
          age:                    c.age,
          has_medical_card:       c.hasMedicalCard,
          prsi_annual:            c.prsiAnnual,
          usc_annual:             c.uscAnnual,
          income_tax_annual:      c.incomeTaxAnnual,
          net_monthly:            c.netMonthly,
          pension_monthly:        c.pensionMonthly ?? null,
          potential_annual_saving: c.potentialAnnualSaving ?? null,
        })
      } catch (_) {
        // silently ignore
      } finally {
        localStorage.removeItem('taxoptimus_pending_calc')
      }
    }
    save()
  }, [])

  return null
}
