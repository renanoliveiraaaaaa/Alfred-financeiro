import { NextRequest, NextResponse } from 'next/server'
import { parseStatement, detectFormat, SupportedBank } from '@/lib/parsers'

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
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const bank = (formData.get('bank') as string | null) ?? 'generic'

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
    const transactions = parseStatement(content, bank as SupportedBank, format)

    return NextResponse.json({ transactions, total: transactions.length })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro inesperado ao processar o arquivo.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
