import { formatMessage } from './i18nFormat'

/** Serializa erro i18n do servidor: `key` ou `key|{"detail":"..."}` */
export function buildServerI18nError(key: string, params?: Record<string, string>): string {
  if (!params || Object.keys(params).length === 0) return key
  return `${key}|${JSON.stringify(params)}`
}

const I18N_KEY_PREFIXES = [
  'import.error.',
  'import.card.error.',
  'import.pdfBlockError',
  'org.error.',
  'crud.move.',
  'errors.gemini.',
  'error.',
  'crud.error.',
  'list.errors.',
  'auth.error.',
  'admin.error.',
]

function looksLikeI18nKey(raw: string): boolean {
  return I18N_KEY_PREFIXES.some((p) => raw.startsWith(p))
}

/** Traduz mensagem devolvida por server action (chave ou chave|JSON params). */
export function resolveServerError(raw: string, t: (key: string) => string): string {
  if (!looksLikeI18nKey(raw)) return raw

  const pipe = raw.indexOf('|')
  const key = pipe === -1 ? raw : raw.slice(0, pipe)
  const translated = t(key)
  if (translated === key) return raw

  if (pipe === -1) return translated

  let params: Record<string, string> = {}
  try {
    params = JSON.parse(raw.slice(pipe + 1)) as Record<string, string>
  } catch {
    params = { detail: raw.slice(pipe + 1) }
  }

  let msg = formatMessage(translated, params)

  if (params.excerpt) {
    const excerptMsg = t('errors.gemini.excerpt')
    if (excerptMsg !== 'errors.gemini.excerpt') {
      msg += `\n\n${formatMessage(excerptMsg, { excerpt: params.excerpt })}`
    }
  }

  return msg
}

/** Monta chave i18n para falha de parse JSON do Gemini (com excerpt opcional). */
export function buildGeminiJsonError(
  jsonResult: { truncated: boolean; hintKey: string; hintDetail?: string },
  excerpt?: string,
): string {
  const params: Record<string, string> = {}
  if (jsonResult.hintKey === 'errors.gemini.invalid' && jsonResult.hintDetail) {
    params.detail = jsonResult.hintDetail
  }
  if (excerpt && !jsonResult.truncated) {
    params.excerpt = excerpt
  }
  return buildServerI18nError(jsonResult.hintKey, Object.keys(params).length ? params : undefined)
}
