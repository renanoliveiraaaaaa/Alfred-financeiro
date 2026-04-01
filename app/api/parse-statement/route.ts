import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabaseServer'
import { parseStatement, detectFormat, detectBankFromOfxContent, SupportedBank } from '@/lib/parsers'

/**
 * POST /api/parse-statement
 *
 * Recebe FormData com:
 *   - file: Blob/File (CSV, OFX ou QFX)
 *   - bank: string (nubank | inter | itau | bradesco | bb | c6 | santander | caixa | generic)
 *
 * Retorna JSON com as transações parseadas (não persiste nada).
 */
export async function POST(request: NextRequest) {
  try {
    const supabaseAuth = createSupabaseServerClient()
    const {
      data: { user },
      error: authError,
    } = await supabaseAuth.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const bank = (formData.get('bank') as string | null) ?? 'generic'
    const skipItauPix =
      formData.get('skip_itau_pix_rule') === '1' || formData.get('skip_itau_pix_rule') === 'true'

    if (!file) {
      return NextResponse.json(
        { error: 'Nenhum arquivo enviado.' },
        { status: 400 },
      )
    }

    const format = detectFormat(file.name)
    if (!format) {
      return NextResponse.json(
        { error: 'Formato de arquivo não suportado. Use CSV, OFX ou QFX.' },
        { status: 400 },
      )
    }

    const content = await file.text()

    // Auto-detecção: se o banco for 'generic' e o arquivo for OFX, tenta inferir pelo conteúdo
    const detectedBank =
      (format === 'ofx' || format === 'qfx') && bank === 'generic'
        ? (detectBankFromOfxContent(content) ?? null)
        : null

    const effectiveBank = (detectedBank ?? bank) as SupportedBank

    const transactions = parseStatement(content, effectiveBank, format, {
      skipItauPixTransfExpenseRule: skipItauPix,
    })

    return NextResponse.json({
      transactions,
      total: transactions.length,
      detected_bank: detectedBank, // informado para a UI poder avisar o usuário
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro inesperado ao processar o arquivo.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
