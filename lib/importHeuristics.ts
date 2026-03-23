import type { ParsedTransaction } from '@/lib/parsers/types'

/**
 * Heurísticas extras sobre o texto do extrato (OFX/CSV).
 * Não substituem o usuário: só sugerem rótulos e forma de pagamento na revisão.
 */

export const IMPORT_KIND_LABELS: Record<string, string> = {
  credit_card_bill: 'Pagamento de fatura de cartão',
  boleto_payment: 'Pagamento de boleto',
  pix_out: 'PIX enviado',
  pix_in: 'PIX recebido',
  transfer_bank: 'Transferência (TED/DOC/outra conta)',
  atm_cash: 'Saque em caixa eletrônico',
  bank_fee: 'Tarifa ou encargo bancário',
  investment: 'Investimentos / aplicação / resgate',
}

function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

/**
 * Detecta o “tipo” do lançamento a partir da descrição (português BR, bancos comuns).
 */
export function detectImportKind(
  description: string,
  txType: 'revenue' | 'expense',
): string | undefined {
  const u = description.toUpperCase()
  const n = norm(description)

  // Contas (água/luz) também falam “fatura” — evitar marcar como cartão
  const utilityFatura =
    /ENERGIA|ENEL|CEMIG|CPFL|LIGHT|LUZ\s|AGUA\s|SABESP|SANEPAR|GAS\s|INTERNET|VIVO\s|CLARO\s|TIM\s|OI\s|NET\s|SKY\s/i.test(
      u,
    )

  // Pagamento de fatura de cartão (conta corrente → operadora)
  const looksLikeCardBill =
    (/PAG(AMENTO|TO|)\s+(DE\s+)?FATURA/i.test(u) && /CART|CRED|CARD|VISA|MASTER|ELO|AMEX/i.test(u)) ||
    /FATURA\s+(DE\s+)?(CART|CRED)|PAG(AMENTO|TO)\s+CART(AO|ÃO)\s+CRED/i.test(u) ||
    /LIQ\s*\.?\s*FAT|LIQUIDAC\w*\s+FAT|PAGTO\s+FAT\s+CART|PGTO\s+FAT/i.test(u) ||
    /DEB\.?\s*AUT.*FAT|DEBITO\s+AUT.*CART|DEB\s+AUT.*FATURA/i.test(u) ||
    (/ITAU\s*CARD|NUBANK|NU\s+PAG|C6\s+BANK|INTER\s+PASS/i.test(u) &&
      /FAT|CART|CRED|CARD/i.test(u) &&
      /PAG|PGTO|LIQ|DEB/i.test(u))

  if (!utilityFatura && looksLikeCardBill) {
    return 'credit_card_bill'
  }

  if (/SAQUE\s|SAQ\.|^\s*SAQ\s|ATM\s|ELEVADOR\s+BAN|CAC\s+AUT/i.test(u) || /\bSAQUE\b/i.test(u)) {
    return 'atm_cash'
  }

  if (
    /TARIFA|ANUIDADE|IOF|MANUTENCAO\s+CONTA|MANUTEN\w*\s+CONTA|CUSTO\s+OPER|PACOTE\s+SERV|SERVICOS\s+BANC/i.test(
      u,
    )
  ) {
    return 'bank_fee'
  }

  if (/BOLETO|COMPENSAC\w*\s+BOL|LIQ\s+BOL|PAG\s+TIT|PAGAMENTO\s+TITULO/i.test(u)) {
    return 'boleto_payment'
  }

  if (/PIX/i.test(u)) {
    if (txType === 'revenue') return 'pix_in'
    if (/TRANSF|ENVI|QR|COBR|PGTO/i.test(u)) return 'pix_out'
    return txType === 'expense' ? 'pix_out' : 'pix_in'
  }

  if (/TED|DOC\s|STR\d|TRANSFERENCIA|TRANSF\s+CC|TRANSF\s+ENTRE|ENTRE\s+CONTAS/i.test(u)) {
    return 'transfer_bank'
  }

  if (/APLIC\.?\s|RESGATE|CDB|LCI|LCA|TESOURO\s+DIRETO|REND\.?\s+PAGO|APLICAC\w+/i.test(u)) {
    return 'investment'
  }

  if (n.includes('fatura') && /cart|cred|visa|master|elo/i.test(n) && !utilityFatura) {
    return 'credit_card_bill'
  }

  return undefined
}

function suggestedPaymentForKind(
  kind: string | undefined,
  txType: 'revenue' | 'expense',
): ParsedTransaction['suggested_payment_method'] | undefined {
  if (txType !== 'expense') return undefined
  switch (kind) {
    case 'pix_out':
      return 'pix'
    case 'credit_card_bill':
    case 'boleto_payment':
    case 'transfer_bank':
    case 'bank_fee':
    case 'investment':
      return 'debito'
    case 'atm_cash':
      return 'especie'
    default:
      return undefined
  }
}

function suggestedCategoryForKind(
  kind: string | undefined,
  txType: 'revenue' | 'expense',
): string | undefined {
  if (txType !== 'expense') return undefined
  switch (kind) {
    case 'credit_card_bill':
      return 'fatura_cartao'
    default:
      return undefined
  }
}

/** Enriquece transação parseada com dicas de importação */
export function enrichParsedTransaction(t: ParsedTransaction): ParsedTransaction {
  const kind = detectImportKind(t.description, t.type)
  const hint = kind ? IMPORT_KIND_LABELS[kind] : undefined
  const suggested_payment_method = suggestedPaymentForKind(kind, t.type)
  const suggested_category = suggestedCategoryForKind(kind, t.type) ?? t.suggested_category

  return {
    ...t,
    ...(kind ? { detected_kind: kind } : {}),
    ...(hint ? { import_hint: hint } : {}),
    ...(suggested_payment_method ? { suggested_payment_method } : {}),
    ...(suggested_category ? { suggested_category } : {}),
  }
}

export function enrichParsedTransactions(transactions: ParsedTransaction[]): ParsedTransaction[] {
  return transactions.map(enrichParsedTransaction)
}
