function stripQuotes(s: string): string {
  const t = s.trim()
  if (t.length >= 2) {
    if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
      return t.slice(1, -1).trim()
    }
  }
  return t
}

/**
 * Chave da API Gemini no servidor (server actions / rotas).
 * Prioridade: GOOGLE_GEMINI_API_KEY, depois GEMINI_API_KEY e GOOGLE_GENERATIVE_AI_API_KEY.
 * Remove aspas acidentais (cópia da Vercel / .env).
 */
export function getGeminiApiKey(): string | undefined {
  const raw =
    process.env.GOOGLE_GEMINI_API_KEY ||
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
    ''
  const k = stripQuotes(raw)
  return k || undefined
}

/** Modelo usado em fatura/extrato (override com GEMINI_MODEL). */
export function getGeminiModelId(): string {
  const m = stripQuotes(process.env.GEMINI_MODEL || 'gemini-2.5-flash')
  return m || 'gemini-2.5-flash'
}

/**
 * Mensagem para o utilizador quando a chamada à API Gemini falha.
 * Trata 429 / quota sem expor o corpo técnico completo.
 */
export function formatGeminiCallError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err)
  const lower = msg.toLowerCase()
  if (
    lower.includes('429') ||
    lower.includes('quota') ||
    lower.includes('too many requests') ||
    lower.includes('resource_exhausted') ||
    lower.includes('rate limit')
  ) {
    return (
      'Cota da API Gemini esgotada (limite gratuito ou pedidos por minuto). ' +
      'Aguarde cerca de um minuto e tente de novo, ou ative faturação em Google AI Studio / Google Cloud Billing. ' +
      'Pode também definir GEMINI_MODEL para outro modelo (ex.: gemini-2.5-flash ou gemini-1.5-flash) no .env.local ou na Vercel.'
    )
  }
  return `Erro ao chamar Gemini: ${msg}`
}
