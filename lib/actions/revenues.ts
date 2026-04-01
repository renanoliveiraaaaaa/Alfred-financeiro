'use server'

import { resolveActiveOrganizationId } from '@/lib/activeOrganizationServer'
import { createSupabaseServerClient } from '@/lib/supabaseServer'

export type CreateRevenueInput = {
  amount: number
  description: string
  date: string
  expected_date: string | null
  received: boolean
}

export type ActionResult = { success: true } | { success: false; error: string }

export async function createRevenue(input: CreateRevenueInput): Promise<ActionResult> {
  if (input.amount <= 0) return { success: false, error: 'Valor deve ser maior que zero.' }
  if (!input.description.trim()) return { success: false, error: 'Descrição é obrigatória.' }
  if (!input.date) return { success: false, error: 'Data efetiva é obrigatória.' }

  const supabase = createSupabaseServerClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { success: false, error: 'Usuário não autenticado.' }

  const orgRes = await resolveActiveOrganizationId()
  if (!orgRes.ok) return { success: false, error: orgRes.error }

  const { error: insertError } = await supabase.from('revenues').insert({
    user_id: user.id,
    organization_id: orgRes.organizationId,
    amount: input.amount,
    description: input.description.trim(),
    date: input.date,
    expected_date: input.expected_date || null,
    received: input.received,
  })

  if (insertError) return { success: false, error: insertError.message }
  return { success: true }
}
