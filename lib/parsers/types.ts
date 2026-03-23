export interface ParsedTransaction {
  date: string // YYYY-MM-DD
  description: string // Texto original do extrato
  amount: number // Valor absoluto
  type: 'revenue' | 'expense' // Crédito = receita, Débito = despesa
  suggested_category?: string // Auto-categorização
  original_text: string // Texto bruto para auditoria
  /** Tipo inferido pelo texto (ex.: pagamento de fatura de cartão) */
  detected_kind?: string
  /** Rótulo amigável para exibir na revisão de importação */
  import_hint?: string
  /** Sugestão de forma de pagamento para despesas (modal pré-preenche) */
  suggested_payment_method?: 'debito' | 'credito' | 'especie' | 'credito_parcelado' | 'pix'
}
