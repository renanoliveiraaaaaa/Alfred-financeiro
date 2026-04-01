/**
 * Extrai e faz parse de JSON devolvido pelo Gemini (com ou sem fences ```json).
 */

function stripJsonFences(text: string): string {
  let s = text.trim()
  s = s.replace(/^```(?:json)?\s*[\r\n]*/i, '')
  s = s.replace(/[\r\n]*```\s*$/i, '')
  return s.trim()
}

export type ParseGeminiJsonResult<T> =
  | { ok: true; data: T }
  | { ok: false; truncated: boolean; hint: string }

/**
 * Faz parse do texto da resposta Gemini. Deteta JSON truncado (resposta cortada a meio).
 */
export function parseGeminiJsonResponse<T>(text: string): ParseGeminiJsonResult<T> {
  const trimmed = text.trim()
  if (!trimmed) {
    return { ok: false, truncated: false, hint: 'Resposta vazia do modelo.' }
  }

  const inner = stripJsonFences(trimmed)

  const tryOnce = (s: string): T | null => {
    try {
      return JSON.parse(s) as T
    } catch {
      return null
    }
  }

  let data = tryOnce(inner)
  if (data === null) {
    const start = inner.indexOf('{')
    const end = inner.lastIndexOf('}')
    if (start >= 0 && end > start) {
      data = tryOnce(inner.slice(start, end + 1))
    }
  }

  if (data !== null) return { ok: true, data }

  let parseErr = ''
  try {
    JSON.parse(inner)
  } catch (e) {
    parseErr = e instanceof Error ? e.message : String(e)
  }

  const truncated =
    (inner.includes('{') && !inner.trimEnd().endsWith('}')) ||
    /unexpected end|unterminated string/i.test(parseErr)

  const hint = truncated
    ? 'A resposta da IA foi cortada (fatura com muitos lançamentos). Tente de novo; se persistir, importe em partes ou cadastre manualmente.'
    : `JSON inválido: ${parseErr || 'formato não reconhecido'}`

  return { ok: false, truncated, hint }
}
