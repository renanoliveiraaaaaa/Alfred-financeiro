'use server'

import { resolveActiveOrganizationId } from '@/lib/activeOrganizationServer'
import { createSupabaseServerClient } from '@/lib/supabaseServer'

// Valores válidos após a migration consolidada (20260318200000_consolidate_all_pending.sql).
// Qualquer valor fora dessas listas cai no fallback para nunca violar o CHECK constraint.
const SAFE_CATEGORIES = new Set([
  'mercado', 'alimentacao', 'compras', 'transporte', 'combustivel',
  'veiculo', 'assinaturas', 'saude', 'educacao',
  'lazer', 'moradia', 'fatura_cartao', 'outros',
])

const SAFE_PAYMENT_METHODS = new Set([
  'credito', 'debito', 'especie', 'credito_parcelado', 'pix',
])

function safeCategory(value: string | undefined): string {
  if (value && SAFE_CATEGORIES.has(value)) return value
  return 'outros'
}

function safePaymentMethod(value: string | undefined): string {
  if (value && SAFE_PAYMENT_METHODS.has(value)) return value
  return 'debito'
}

export interface ImportTransaction {
  date: string
  description: string
  amount: number
  type: 'revenue' | 'expense'
  category?: string
  payment_method?: string
}

export interface ConfirmImportInput {
  bank: string
  file_name: string
  period_start: string
  period_end: string
  transactions: ImportTransaction[]
}

export type ActionResult =
  | { success: true; session_id: string; imported: number; skipped: number }
  | { success: false; error: string }

export async function confirmImport(input: ConfirmImportInput): Promise<ActionResult> {
  const supabase = createSupabaseServerClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return { success: false, error: 'Usuário não autenticado.' }
  }

  const orgRes = await resolveActiveOrganizationId()
  if (!orgRes.ok) {
    return { success: false, error: orgRes.error }
  }
  const organizationId = orgRes.organizationId

  if (!input.transactions || input.transactions.length === 0) {
    return { success: false, error: 'Nenhuma transação para importar.' }
  }

  // Calcula o período com base nas transações, caso não informado
  const dates = input.transactions.map((t) => t.date).sort()
  const periodStart = input.period_start || dates[0]
  const periodEnd = input.period_end || dates[dates.length - 1]

  // 1. Cria a sessão de importação
  const { data: session, error: sessionError } = await supabase
    .from('import_sessions')
    .insert({
      user_id: user.id,
      file_name: input.file_name,
      bank: input.bank,
      period_start: periodStart,
      period_end: periodEnd,
      total_transactions: input.transactions.length,
      imported_transactions: 0,
      skipped_transactions: 0,
      status: 'processing',
    })
    .select('id')
    .single()

  if (sessionError || !session) {
    return { success: false, error: sessionError?.message ?? 'Erro ao criar sessão de importação.' }
  }

  const sessionId = session.id
  let imported = 0
  let skipped = 0

  const revenues: object[] = []
  const expenses: object[] = []

  for (const tx of input.transactions) {
    if (!tx.date || !tx.description || tx.amount <= 0) {
      skipped++
      continue
    }

    if (tx.type === 'revenue') {
      revenues.push({
        user_id: user.id,
        organization_id: organizationId,
        amount: tx.amount,
        description: tx.description.trim(),
        date: tx.date,
        expected_date: tx.date,
        received: true,
        source: 'import',
        import_session_id: sessionId,
      })
    } else {
      expenses.push({
        user_id: user.id,
        organization_id: organizationId,
        amount: tx.amount,
        description: tx.description.trim(),
        category: safeCategory(tx.category),
        payment_method: safePaymentMethod(tx.payment_method),
        due_date: tx.date,
        paid: true,
        source: 'import',
        import_session_id: sessionId,
      })
    }
  }

  // Helper de rollback: apaga tudo que já foi inserido e marca a sessão como falha
  const rollback = async (reason: string): Promise<ActionResult> => {
    await Promise.all([
      supabase.from('revenues').delete().eq('import_session_id', sessionId),
      supabase.from('expenses').delete().eq('import_session_id', sessionId),
      supabase.from('import_sessions').update({ status: 'failed' }).eq('id', sessionId),
    ])
    return { success: false, error: reason }
  }

  // Batch insert receitas
  if (revenues.length > 0) {
    const { error: revError } = await supabase.from('revenues').insert(revenues)
    if (revError) {
      return rollback(`Erro ao importar receitas: ${revError.message}`)
    }
    imported += revenues.length
  }

  // Batch insert despesas
  if (expenses.length > 0) {
    const { error: expError } = await supabase.from('expenses').insert(expenses)
    if (expError) {
      // Receitas já inseridas são desfeitas antes de retornar o erro
      return rollback(`Erro ao importar despesas: ${expError.message}`)
    }
    imported += expenses.length
  }

  // Atualiza a sessão com os contadores finais
  await supabase
    .from('import_sessions')
    .update({
      imported_transactions: imported,
      skipped_transactions: skipped,
      status: 'completed',
    })
    .eq('id', sessionId)

  return { success: true, session_id: sessionId, imported, skipped }
}
