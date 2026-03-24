import type { ImportTransaction } from '@/lib/actions/import-statement'

const SKIP_LINE =
  /^(saldo|total|subtotal|pág|pag\.|continua|extrato|per[ií]odo|agencia|conta|cpf|cnpj|nome)/i
const SKIP_CONTAINS =
  /saldo\s+(anterior|final|dispon[ií]vel)|limite\s+(de\s+)?cr[eé]dito|fatura\s+atual|total\s+a\s+pagar/i

/** Valor BR: 1.234,56 ou 123,45 ou R$ 10,00; parênteses = negativo */
export function parseBrazilianMoney(raw: string): number | null {
  let s = raw.trim().replace(/^R\$\s*/i, '').replace(/\s/g, '')
  let neg = false
  if (s.startsWith('-')) {
    neg = true
    s = s.slice(1)
  }
  if (/^\(.*\)$/.test(s)) {
    neg = true
    s = s.slice(1, -1).trim()
  }
  if (!/^[\d.]+,\d{2}$/.test(s)) return null
  const normalized = s.replace(/\./g, '').replace(',', '.')
  const v = parseFloat(normalized)
  if (Number.isNaN(v) || v < 0) return null
  return neg ? -v : v
}

function normalizeYear(y: number): number {
  if (y < 100) return y >= 70 ? 1900 + y : 2000 + y
  return y
}

/** DD/MM/YYYY ou DD/MM/YY → YYYY-MM-DD */
function parseDateBr(d: string, m: string, y: string): string | null {
  const day = parseInt(d, 10)
  const month = parseInt(m, 10)
  let year = parseInt(y, 10)
  if (Number.isNaN(day) || Number.isNaN(month) || Number.isNaN(year)) return null
  year = normalizeYear(year)
  if (month < 1 || month > 12 || day < 1 || day > 31) return null
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function classifyBankText(desc: string, signedAmount: number | null): 'revenue' | 'expense' {
  const u = desc.toUpperCase()
  if (
    /PIX\s*RECEB|CREDITO|CR[EÉ]DITO|DEP[OÓ]SITO|TED\s*REC|RENDIMENTO|SAL[AÁ]RIO|RESGATE|ESTORNO\s*CR|RECEBID/i.test(
      u,
    )
  ) {
    return 'revenue'
  }
  if (
    /PIX\s*ENVI|DEBITO|D[EÉ]BITO|PAGAMENTO|SAQUE|TRANSF\s*ENV|FATURA|TARIFA|IOF|ANUIDADE|BOLETO/i.test(u)
  ) {
    return 'expense'
  }
  if (signedAmount !== null && signedAmount < 0) return 'revenue'
  return 'expense'
}

function guessPayment(desc: string): string {
  const u = desc.toUpperCase()
  if (/PIX/i.test(u)) return 'pix'
  if (/TED|DOC|TRANSF/i.test(u)) return 'ted'
  if (/SAQUE|DINHEIRO/i.test(u)) return 'especie'
  return 'debito'
}

function guessCategory(desc: string): string {
  const u = desc.toLowerCase()
  if (/ifood|rappi|uber\s*eats|restaurante|lanche|padaria/i.test(u)) return 'alimentacao'
  if (/uber|99|cabify|metro|onibus/i.test(u)) return 'transporte'
  if (/mercado|supermercado|carrefour|pao\s*de/i.test(u)) return 'mercado'
  if (/fatura|cartao|card/i.test(u)) return 'fatura_cartao'
  if (/netflix|spotify|assinatura|prime|disney/i.test(u)) return 'assinaturas'
  return 'outros'
}

export function guessBankFromPdfText(text: string): string {
  const u = text.slice(0, 8000).toUpperCase()
  if (/NU\s*BANK|NUBANK|NU\s*PAGAMENTOS/i.test(u)) return 'Nubank'
  if (/BANCO\s*INTER|INTER\s*MEDIUM/i.test(u)) return 'Banco Inter'
  if (/ITAU|ITA[ÚU]/i.test(u)) return 'Itaú'
  if (/BRADESCO/i.test(u)) return 'Bradesco'
  if (/BANCO\s*DO\s*BRASIL|\bBB\b/i.test(u)) return 'Banco do Brasil'
  if (/SANTANDER/i.test(u)) return 'Santander'
  if (/\bC6\s*BANK/i.test(u)) return 'C6 Bank'
  if (/CAIXA|CEF\b/i.test(u)) return 'Caixa'
  if (/XP\s*INVEST|BTG|RICO/i.test(u)) return 'Corretora'
  return 'PDF (texto)'
}

/**
 * Extrai transações de texto de extrato bancário (PDF digital).
 * Heurística genérica — funciona melhor com linhas "data + descrição + valor".
 */
export function parseBankTransactionsFromPdfText(text: string): ImportTransaction[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  const out: ImportTransaction[] = []
  const seen = new Set<string>()

  // Padrões: data no início, valor no fim (BR)
  const reEndAmount =
    /^(\d{2})\/(\d{2})\/(\d{2,4})\s+(.+?)\s+(-?[\d]{1,3}(?:\.\d{3})*,\d{2}|-?\d+,\d{2})\s*$/
  const reStartAmount =
    /^(-?[\d]{1,3}(?:\.\d{3})*,\d{2}|-?\d+,\d{2})\s+(\d{2})\/(\d{2})\/(\d{2,4})\s+(.+)$/

  for (const line of lines) {
    if (line.length < 12) continue
    if (SKIP_LINE.test(line) || SKIP_CONTAINS.test(line)) continue

    let dateStr: string | null = null
    let desc = ''
    let amountRaw = ''

    const m1 = line.match(reEndAmount)
    if (m1) {
      dateStr = parseDateBr(m1[1], m1[2], m1[3])
      desc = m1[4].trim()
      amountRaw = m1[5]
    } else {
      const m2 = line.match(reStartAmount)
      if (m2) {
        amountRaw = m2[1]
        dateStr = parseDateBr(m2[2], m2[3], m2[4])
        desc = m2[5].trim()
      }
    }

    if (!dateStr || !desc || desc.length < 2) continue

    const signed = parseBrazilianMoney(amountRaw)
    if (signed === null) continue
    const amount = Math.abs(signed)
    if (amount < 0.01 || amount > 9_999_999) continue

    const type = classifyBankText(desc, signed)
    const cat = guessCategory(desc)
    const pay = guessPayment(desc)

    const key = `${dateStr}|${desc.slice(0, 80)}|${amount.toFixed(2)}|${type}`
    if (seen.has(key)) continue
    seen.add(key)

    out.push({
      date: dateStr,
      description: desc.slice(0, 500),
      amount,
      type,
      category: cat,
      payment_method: pay,
    })
  }

  return out
}

export const MIN_LOCAL_BANK_TX = 3
