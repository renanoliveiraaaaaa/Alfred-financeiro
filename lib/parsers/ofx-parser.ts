import { ParsedTransaction } from './types'
import { suggestCategory } from '@/lib/auto-categorize'

/**
 * Parser para arquivos OFX/QFX (Open Financial Exchange).
 *
 * Suporta tanto o formato SGML legado (sem fechamento de tags)
 * quanto o formato XML moderno usado pelos bancos brasileiros
 * (Itaú, Bradesco, Banco do Brasil, Santander, Caixa, etc.).
 *
 * Campos extraídos de cada <STMTTRN>:
 *   TRNTYPE  - DEBIT | CREDIT | ...
 *   DTPOSTED - Data no formato YYYYMMDD ou YYYYMMDDHHmmss
 *   TRNAMT   - Valor (negativo = débito)
 *   NAME     - Nome do beneficiário / descrição curta
 *   MEMO     - Descrição completa (preferida quando disponível)
 */
export function parseOfx(content: string): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = []

  // Extrai todos os blocos <STMTTRN>...</STMTTRN>
  const blocks = extractBlocks(content)

  for (const block of blocks) {
    const trnType = getField(block, 'TRNTYPE')
    const dtPosted = getField(block, 'DTPOSTED')
    const trnAmt = getField(block, 'TRNAMT')
    const name = getField(block, 'NAME') ?? ''
    const memo = getField(block, 'MEMO') ?? ''

    if (!dtPosted || !trnAmt) continue

    const date = parseOfxDate(dtPosted)
    if (!date) continue

    const value = parseFloat(trnAmt.replace(',', '.'))
    if (isNaN(value)) continue

    const description = (memo || name).trim()
    if (!description) continue

    // TRNTYPE: CREDIT = receita; DEBIT/CHECK/ATM/PAYMENT = despesa
    // Fallback: sinal do valor
    let type: 'revenue' | 'expense'
    if (trnType) {
      type = trnType.toUpperCase() === 'CREDIT' ? 'revenue' : 'expense'
    } else {
      type = value >= 0 ? 'revenue' : 'expense'
    }

    transactions.push({
      date,
      description,
      amount: Math.abs(value),
      type,
      suggested_category: type === 'expense' ? suggestCategory(description) : undefined,
      original_text: block.substring(0, 200),
    })
  }

  return transactions
}

/**
 * Extrai blocos <STMTTRN>...</STMTTRN> (XML) ou
 * seções delimitadas por <STMTTRN>...<STMTTRN> (SGML legado).
 */
function extractBlocks(content: string): string[] {
  const blocks: string[] = []

  // Tenta XML primeiro: <STMTTRN>...</STMTTRN>
  const xmlRegex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi
  let match: RegExpExecArray | null
  while ((match = xmlRegex.exec(content)) !== null) {
    blocks.push(match[1])
  }

  if (blocks.length > 0) return blocks

  // Fallback SGML: divide pelo tag de abertura
  const parts = content.split(/<STMTTRN>/i)
  for (let i = 1; i < parts.length; i++) {
    // O bloco termina no próximo <STMTTRN> ou </BANKTRANLIST> ou fim
    blocks.push(parts[i])
  }

  return blocks
}

/**
 * Extrai o valor de um campo OFX:
 *   XML:  <FIELD>value</FIELD>
 *   SGML: <FIELD>value\n
 */
function getField(block: string, field: string): string | null {
  // XML
  const xmlRe = new RegExp(`<${field}>([^<]+)<\/${field}>`, 'i')
  const xmlMatch = block.match(xmlRe)
  if (xmlMatch) return xmlMatch[1].trim()

  // SGML (valor até fim de linha ou próxima tag)
  const sgmlRe = new RegExp(`<${field}>([^\r\n<]+)`, 'i')
  const sgmlMatch = block.match(sgmlRe)
  if (sgmlMatch) return sgmlMatch[1].trim()

  return null
}

/**
 * Converte data OFX para YYYY-MM-DD.
 * Formatos aceitos: YYYYMMDD, YYYYMMDDHHmmss, YYYYMMDDHHmmss.xxx[tz]
 */
function parseOfxDate(raw: string): string | null {
  const digits = raw.replace(/[^\d]/g, '').substring(0, 8)
  if (digits.length < 8) return null

  const year = digits.substring(0, 4)
  const month = digits.substring(4, 6)
  const day = digits.substring(6, 8)

  const y = parseInt(year, 10)
  const mo = parseInt(month, 10)
  const d = parseInt(day, 10)

  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null

  return `${year}-${month}-${day}`
}
