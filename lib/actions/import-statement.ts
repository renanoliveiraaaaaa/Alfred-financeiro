'use server'

import { createSupabaseServerClient } from '@/lib/supabaseServer'

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
        amount: tx.amount,
        description: tx.description.trim(),
        date: tx.date,
        expected_date: tx.date,
        received: true,
        source: 'import',
        import_session_id: sessionId,
      })
    } else {
      const category = tx.category || 'outros'
      const paymentMethod = tx.payment_method || 'debito'

      expenses.push({
        user_id: user.id,
        amount: tx.amount,
        description: tx.description.trim(),
        category,
        payment_method: paymentMethod,
        due_date: tx.date,
        paid: true,
        source: 'import',
        import_session_id: sessionId,
      })
    }
  }

  // Batch insert receitas
  if (revenues.length > 0) {
    const { error: revError } = await supabase.from('revenues').insert(revenues)
    if (revError) {
      // Reverte: atualiza sessão como falha
      await supabase
        .from('import_sessions')
        .update({ status: 'failed' })
        .eq('id', sessionId)
      return { success: false, error: `Erro ao importar receitas: ${revError.message}` }
    }
    imported += revenues.length
  }

  // Batch insert despesas
  if (expenses.length > 0) {
    const { error: expError } = await supabase.from('expenses').insert(expenses)
    if (expError) {
      // Reverte parcialmente: marca sessão como falha
      await supabase
        .from('import_sessions')
        .update({ status: 'failed' })
        .eq('id', sessionId)
      return { success: false, error: `Erro ao importar despesas: ${expError.message}` }
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
