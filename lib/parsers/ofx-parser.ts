import { ParsedTransaction } from './types'
import { suggestCategory } from '@/lib/auto-categorize'

export type ParseOfxOptions = {
  /** Banco escolhido na tela (refina heurísticas) */
  selectedBank?: string
  /**
   * Se true, não aplica a regra "PIX TRANSF → despesa" (útil se você recebe muitos PIX com esse texto).
   */
  skipItauPixTransfExpenseRule?: boolean
}

/**
 * Lê BANKID do OFX — suporta SGML (<BANKID>0341) e XML com namespace (<FI:BANKID>0341</FI:BANKID>).
 */
export function detectBankIdFromOfx(content: string): string | null {
  const m = content.match(/<(?:[\w.-]+:)?BANKID>(\d+)/i)
  return m ? m[1].trim() : null
}

/**
 * Tenta detectar o banco a partir do conteúdo OFX (BANKID + ORG/FI/INTU.BID).
 * Retorna o valor adequado para `SupportedBank` ou null se não reconhecido.
 */
export function detectBankFromOfxContent(content: string): string | null {
  const bankId = detectBankIdFromOfx(content)
  if (bankId) {
    const n = bankId.replace(/^0+/, '') || bankId
    if (n === '341' || n === '0341') return 'itau'
    if (n === '237') return 'bradesco'
    if (n === '1' || n === '001') return 'bb'
    if (n === '104') return 'caixa'
    if (n === '33' || n === '033') return 'santander'
    if (n === '260' || n === '077') return 'inter'
    if (n === '336') return 'c6'
  }
  // Fallback: procura ORG no cabeçalho OFX
  const orgMatch = content.match(/<(?:[\w.-]+:)?ORG>([^<\r\n]+)/i)
  if (orgMatch) {
    const org = orgMatch[1].trim().toUpperCase()
    if (/ITAU|ITA[UÚ]/.test(org)) return 'itau'
    if (/BRADESCO/.test(org)) return 'bradesco'
    if (/BANCO DO BRASIL|BB\.COM/.test(org)) return 'bb'
    if (/CAIXA|CEF/.test(org)) return 'caixa'
    if (/SANTANDER/.test(org)) return 'santander'
    if (/INTER/.test(org)) return 'inter'
    if (/C6/.test(org)) return 'c6'
    if (/NUBANK|NU PAGAMENTOS/.test(org)) return 'nubank'
  }
  return null
}

function isItauBankId(bankId: string | null): boolean {
  if (!bankId) return false
  const trimmed = bankId.trim()
  const noZeros = trimmed.replace(/^0+/, '') || trimmed
  return noZeros === '341' || trimmed === '0341'
}

/** Regra extra Itaú OFX102: CREDIT+ em tudo, mas PIX TRANSF costuma ser saída. */
function useItauPixTransfRule(bankId: string | null, opts: ParseOfxOptions): boolean {
  if (opts.skipItauPixTransfExpenseRule) return false
  if (opts.selectedBank === 'itau') return true
  return isItauBankId(bankId)
}

/**
 * Classifica receita vs despesa quando o banco não segue o padrão OFX (ex.: só CREDIT + valor positivo).
 */
function inferOfxTransactionType(
  trnType: string | null,
  valueSigned: number,
  memoNorm: string,
  itauPixRule: boolean,
): 'revenue' | 'expense' {
  // Padrão OFX: valor negativo = saída
  if (valueSigned < 0) return 'expense'

  const tt = (trnType || '').toUpperCase().trim()

  // Tipos OFX comuns de saída de conta
  if (
    /^(DEBIT|DEBITO|ATM|CHECK|FEE|PAYMENT|WITHDRAWAL|POS|DIRECTDEBIT|REPEATPMT)$/i.test(tt) &&
    tt !== 'CREDIT'
  ) {
    return 'expense'
  }
  if (/DEBIT|DEBITO|WITHDRAW|ATM|FEE|CHECK|PAYMENT|DIRECTDEBIT/i.test(tt) && !/^CREDIT|DEP|DIRECTDEP|INT$/i.test(tt)) {
    return 'expense'
  }

  // --- MEMO: entradas típicas (Brasil) ---
  if (
    /REND\s+PAGO|RENDIMENTO|APLIC\s+AUT|APLIC\.?\s*AUT|DEV\s+PIX|PIX\s+ORIGEM\s+CART|CRED\.?\s*SAL|CR[ÉE]DITO\s+SAL|TED.*(CR[ÉE]D|RECEB)|DOC.*(CR[ÉE]D|RECEB)|DEPOSITO|DEP[ÓO]SITO/i.test(
      memoNorm,
    )
  ) {
    return 'revenue'
  }

  // --- MEMO: saídas típicas ---
  if (
    /PAGAMENTO|PAGTO|PGTO|BOLETO|FATURA|COMPRA\s|SAQUE\s|TARIFA|ENCARGO|ANUIDADE|IOF|SEGURO|DEB\.?\s*AUT|DÉB\.?\s*AUT|PIX\s+COBR|PIX\s+QR|PAG\s+TIT|DEBITO\s+AUT/i.test(
      memoNorm,
    )
  ) {
    return 'expense'
  }

  // Itaú OFX102: quase tudo vem CREDIT+; PIX TRANSF costuma ser envio (saída), exceto rend./devol.
  if (
    itauPixRule &&
    /^PIX\s+TRANSF/i.test(memoNorm) &&
    !/REND|DEV\s+PIX|APLIC|RENDIMENTO/i.test(memoNorm)
  ) {
    return 'expense'
  }

  if (tt === 'CREDIT' || tt === 'DEP' || tt === 'DIRECTDEP' || tt === 'INT') return 'revenue'

  return valueSigned >= 0 ? 'revenue' : 'expense'
}

/**
 * Parser para arquivos OFX/QFX (Open Financial Exchange).
 */
export function parseOfx(content: string, opts: ParseOfxOptions = {}): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = []
  const bankId = detectBankIdFromOfx(content)
  const itauPixRule = useItauPixTransfRule(bankId, opts)

  const blocks = extractBlocks(content)

  for (const block of blocks) {
    const trnType = getField(block, 'TRNTYPE')
    const dtPosted = getField(block, 'DTPOSTED')
    const trnAmt = getField(block, 'TRNAMT')
    const name = getField(block, 'NAME') ?? ''
    const memo = getField(block, 'MEMO') ?? ''
    const payee = getField(block, 'PAYEE') ?? ''
    const fitid = getField(block, 'FITID') ?? ''

    if (!dtPosted || !trnAmt) continue

    const date = parseOfxDate(dtPosted)
    if (!date) continue

    const normalizedAmt = trnAmt.replace(/\s/g, '').replace(',', '.')
    const valueSigned = parseFloat(normalizedAmt)
    if (isNaN(valueSigned)) continue

    const rawDesc = [memo, name, payee].map((s) => s.trim()).find(Boolean) ?? ''
    const description =
      rawDesc ||
      (fitid ? `Ref. ${fitid}` : '') ||
      `Lançamento OFX (${date})`

    const memoNorm = description.toUpperCase()
    const type = inferOfxTransactionType(trnType, valueSigned, memoNorm, itauPixRule)

    transactions.push({
      date,
      description,
      amount: Math.abs(valueSigned),
      type,
      suggested_category: type === 'expense' ? suggestCategory(description) : undefined,
      original_text: block.substring(0, 200),
    })
  }

  return transactions
}

function extractBlocks(content: string): string[] {
  const blocks: string[] = []

  const xmlRegex = /<(?:[\w.-]+:)?STMTTRN>([\s\S]*?)<\/(?:[\w.-]+:)?STMTTRN>/gi
  let match: RegExpExecArray | null
  while ((match = xmlRegex.exec(content)) !== null) {
    blocks.push(match[1])
  }

  if (blocks.length > 0) return blocks

  const parts = content.split(/<(?:[\w.-]+:)?STMTTRN>/i)
  for (let i = 1; i < parts.length; i++) {
    blocks.push(parts[i])
  }

  return blocks
}

function getField(block: string, field: string): string | null {
  const xmlRe = new RegExp(`<(?:[\\w.-]+:)?${field}>([^<]*)<\\/(?:[\\w.-]+:)?${field}>`, 'i')
  const xmlMatch = block.match(xmlRe)
  if (xmlMatch && xmlMatch[1].trim() !== '') return xmlMatch[1].trim()

  const sgmlRe = new RegExp(`<(?:[\\w.-]+:)?${field}>([^\\r\\n<]*)`, 'i')
  const sgmlMatch = block.match(sgmlRe)
  if (sgmlMatch && sgmlMatch[1].trim() !== '') return sgmlMatch[1].trim()

  return null
}

function parseOfxDate(raw: string): string | null {
  const digits = raw.replace(/[^\d]/g, '').substring(0, 8)
  if (digits.length < 8) return null

  const year = digits.substring(0, 4)
  const month = digits.substring(4, 6)
  const day = digits.substring(6, 8)

  const mo = parseInt(month, 10)
  const d = parseInt(day, 10)

  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null

  return `${year}-${month}-${day}`
}
