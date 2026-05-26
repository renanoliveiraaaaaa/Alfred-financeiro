import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabaseServer'
import { parseStatement, detectFormat, detectBankFromOfxContent, SupportedBank } from '@/lib/parsers'
import { rateLimit } from '@/lib/rateLimit'

/**
 * POST /api/parse-statement
 *
 * Recebe FormData com:
 *   - file: Blob/File (CSV, OFX ou QFX)
 *   - bank: string (nubank | inter | itau | bradesco | bb | c6 | santander | caixa | generic)
 *
 * Retorna JSON com as transações parseadas (não persiste nada).
 * Erros devolvem chaves i18n (`import.api.*`) para tradução no cliente.
 */
export async function POST(request: NextRequest) {
  try {
    const supabaseAuth = createSupabaseServerClient()
    const {
      data: { user },
      error: authError,
    } = await supabaseAuth.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'import.api.unauthorized' }, { status: 401 })
    }

    const rl = rateLimit(`parse-statement:${user.id}`, 30, 60_000)
    if (!rl.ok) {
      return NextResponse.json(
        { error: 'import.api.rateLimit' },
        {
          status: 429,
          headers: rl.retryAfterSec ? { 'Retry-After': String(rl.retryAfterSec) } : {},
        },
      )
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const bank = (formData.get('bank') as string | null) ?? 'generic'
    const skipItauPix =
      formData.get('skip_itau_pix_rule') === '1' || formData.get('skip_itau_pix_rule') === 'true'

    if (!file) {
      return NextResponse.json({ error: 'import.api.noFile' }, { status: 400 })
    }

    const format = detectFormat(file.name)
    if (!format) {
      return NextResponse.json({ error: 'import.api.unsupportedFormat' }, { status: 400 })
    }

    const content = await file.text()

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
      detected_bank: detectedBank,
    })
  } catch (err: unknown) {
    console.error('[parse-statement]', err)
    return NextResponse.json({ error: 'import.api.unexpected' }, { status: 500 })
  }
}
