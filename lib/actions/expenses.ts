'use server'

import { revalidatePath } from 'next/cache'
import { resolveActiveOrganizationId } from '@/lib/activeOrganizationServer'
import { createSupabaseServerClient } from '@/lib/supabaseServer'
import { calculateInstallmentDates, addMonths } from '@/lib/installments'

type PaymentMethod = 'credito' | 'debito' | 'especie' | 'credito_parcelado' | 'pix'

export type CreateExpenseInput = {
  amount: number
  description: string
  category: string
  payment_method: PaymentMethod
  installments: number
  due_date: string
  paid: boolean
  invoice_url?: string | null
  credit_card_id?: string | null
}

export type ActionResult = { success: true } | { success: false; error: string }

export async function createExpense(input: CreateExpenseInput): Promise<ActionResult> {
  if (input.amount <= 0) return { success: false, error: 'Valor deve ser maior que zero.' }
  if (!input.description.trim()) return { success: false, error: 'Descrição é obrigatória.' }
  if (!input.due_date) return { success: false, error: 'Data de vencimento é obrigatória.' }

  const isParcelado = input.payment_method === 'credito_parcelado'
  if (isParcelado && (input.installments < 2 || input.installments > 120)) {
    return { success: false, error: 'Parcelas devem ser entre 2 e 120.' }
  }

  const supabase = createSupabaseServerClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { success: false, error: 'Usuário não autenticado.' }

  const orgRes = await resolveActiveOrganizationId()
  if (!orgRes.ok) return { success: false, error: orgRes.error }
  const organizationId = orgRes.organizationId

  if (isParcelado) {
    const n = input.installments
    const perInstallment = Math.round((input.amount / n) * 100) / 100
    const remainder = Math.round((input.amount - perInstallment * n) * 100) / 100

    let dueDates: string[]

    if (input.credit_card_id) {
      const { data: card } = await supabase
        .from('credit_cards')
        .select('closing_day, due_day')
        .eq('id', input.credit_card_id)
        .maybeSingle()

      if (card) {
        dueDates = calculateInstallmentDates(
          input.due_date,
          card.closing_day,
          card.due_day,
          n,
        )
      } else {
        dueDates = Array.from({ length: n }, (_, i) => addMonths(input.due_date, i))
      }
    } else {
      dueDates = Array.from({ length: n }, (_, i) => addMonths(input.due_date, i))
    }

    const rows = Array.from({ length: n }, (_, i) => ({
      user_id: user.id,
      organization_id: organizationId,
      amount: i === 0 ? perInstallment + remainder : perInstallment,
      description: `${input.description.trim()} (${i + 1}/${n})`,
      category: input.category,
      payment_method: 'credito_parcelado' as const,
      installments: n,
      installment_number: i + 1,
      due_date: dueDates[i],
      paid: i === 0 ? input.paid : false,
      invoice_url: input.invoice_url || null,
      credit_card_id: input.credit_card_id || null,
    }))

    const { error: insertError } = await supabase.from('expenses').insert(rows)
    if (insertError) return { success: false, error: insertError.message }
  } else {
    const { error: insertError } = await supabase.from('expenses').insert({
      user_id: user.id,
      organization_id: organizationId,
      amount: input.amount,
      description: input.description.trim(),
      category: input.category,
      payment_method: input.payment_method,
      installments: null,
      installment_number: null,
      due_date: input.due_date,
      paid: input.paid,
      invoice_url: input.invoice_url || null,
      credit_card_id: input.credit_card_id || null,
    })
    if (insertError) return { success: false, error: insertError.message }
  }

  return { success: true }
}

export type MoveTransactionResult = { ok: true } | { ok: false; error: string }

/**
 * Move uma despesa para outra organização (conciliação de contexto Pessoal/Business).
 */
export async function moveTransaction(transactionId: string, targetOrgId: string): Promise<MoveTransactionResult> {
  const tid = transactionId?.trim()
  const oid = targetOrgId?.trim()
  if (!tid || !oid) return { ok: false, error: 'Parâmetros inválidos.' }

  const supabase = createSupabaseServerClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) return { ok: false, error: 'Sessão inválida.' }

  const { data: row, error: fetchErr } = await supabase
    .from('expenses')
    .select('id, user_id, organization_id')
    .eq('id', tid)
    .maybeSingle()

  if (fetchErr || !row) return { ok: false, error: 'Despesa não encontrada.' }
  if (row.user_id !== user.id) return { ok: false, error: 'Sem permissão para esta despesa.' }
  if (row.organization_id === oid) return { ok: false, error: 'A despesa já está nesta organização.' }

  const { data: membership, error: memErr } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('profile_id', user.id)
    .eq('organization_id', oid)
    .maybeSingle()

  if (memErr || !membership) return { ok: false, error: 'Não tem acesso à organização de destino.' }

  const { error: updErr } = await supabase
    .from('expenses')
    .update({ organization_id: oid })
    .eq('id', tid)
    .eq('user_id', user.id)

  if (updErr) return { ok: false, error: updErr.message }

  revalidatePath('/dashboard')
  revalidatePath('/expenses')
  revalidatePath(`/expenses/${tid}`)
  return { ok: true }
}
