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
 * Aceita nome alternativo usado noutros tutoriais.
 * Remove aspas acidentais (cópia da Vercel / .env).
 */
export function getGeminiApiKey(): string | undefined {
  const raw =
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
    ''
  const k = stripQuotes(raw)
  return k || undefined
}
