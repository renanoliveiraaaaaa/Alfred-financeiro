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
 * Chave da API Egide no servidor (server actions / rotas).
 * Aceita VITE_EGIDE_API_KEY para quem copia .env de um projeto Vite — no Next.js a chave não fica pública.
 */
export function getEgideApiKey(): string | undefined {
  const raw =
    process.env.EGIDE_API_KEY ||
    process.env.VITE_EGIDE_API_KEY ||
    ''
  const k = stripQuotes(raw)
  return k || undefined
}

/** URL completa do endpoint POST que recebe o PDF (recomendado). */
export function getEgidePdfExtractUrl(): string | undefined {
  const u = stripQuotes(process.env.EGIDE_PDF_EXTRACT_URL || '')
  return u || undefined
}

/**
 * Alternativa: base + path. Ex.: base https://api.exemplo.com path /v1/pdf/extract
 */
export function getEgidePdfExtractUrlFromParts(): string | undefined {
  const direct = getEgidePdfExtractUrl()
  if (direct) return direct

  const base = stripQuotes(process.env.EGIDE_API_BASE_URL || '').replace(/\/+$/, '')
  if (!base) return undefined

  const path = stripQuotes(process.env.EGIDE_PDF_EXTRACT_PATH || '/extract')
  const p = path.startsWith('/') ? path : `/${path}`
  return `${base}${p}`
}

/** Prefixo do header Authorization (ex.: "Bearer ", "Token "). */
export function getEgideAuthPrefix(): string {
  const p = stripQuotes(process.env.EGIDE_AUTHORIZATION_PREFIX ?? 'Bearer ')
  return p.endsWith(' ') ? p : `${p} `
}

/** Nome do campo multipart do ficheiro (muitas APIs usam "file"). */
export function getEgideFileFieldName(): string {
  return stripQuotes(process.env.EGIDE_FILE_FIELD || 'file') || 'file'
}

export function isEgideConfigured(): boolean {
  return Boolean(getEgideApiKey() && getEgidePdfExtractUrlFromParts())
}
