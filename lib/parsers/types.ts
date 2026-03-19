export interface ParsedTransaction {
  date: string             // YYYY-MM-DD
  description: string      // Texto original do extrato
  amount: number           // Valor absoluto
  type: 'revenue' | 'expense'   // Crédito = receita, Débito = despesa
  suggested_category?: string    // Auto-categorização
  original_text: string    // Texto bruto para auditoria
}
