/**
 * Chave da API Gemini no servidor (server actions / rotas).
 * Aceita nome alternativo usado noutros tutoriais.
 */
export function getGeminiApiKey(): string | undefined {
  const k =
    process.env.GEMINI_API_KEY?.trim() ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim()
  return k || undefined
}
