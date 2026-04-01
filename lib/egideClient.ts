import {
  getEgideApiKey,
  getEgideAuthPrefix,
  getEgideFileFieldName,
  getEgidePdfExtractUrlFromParts,
} from '@/lib/egideEnv'

const MIN_CHARS = 80

function pickTextFromJson(data: unknown): string | null {
  if (data == null) return null
  if (typeof data === 'string') {
    const t = data.trim()
    return t.length >= MIN_CHARS ? t : null
  }
  if (typeof data !== 'object') return null
  const o = data as Record<string, unknown>
  const nested = (x: unknown): string | null => {
    if (typeof x === 'string' && x.trim().length >= MIN_CHARS) return x.trim()
    if (x && typeof x === 'object') return pickTextFromJson(x)
    return null
  }
  const keys = ['text', 'plain_text', 'plainText', 'content', 'body', 'markdown', 'extracted_text']
  for (const k of keys) {
    const v = o[k]
    if (typeof v === 'string' && v.trim().length >= MIN_CHARS) return v.trim()
  }
  if (o.data !== undefined) {
    const inner = nested(o.data)
    if (inner) return inner
  }
  if (o.result !== undefined) {
    const inner = nested(o.result)
    if (inner) return inner
  }
  return null
}

/**
 * Envia o PDF ao endpoint Egide configurado e devolve texto plano (OCR / leitura),
 * para alimentar as heurísticas locais do Alfred.
 * Retorna null se não estiver configurado, falhar a rede ou a resposta não tiver texto útil.
 */
export async function extractPlainTextFromEgidePdf(buffer: Buffer): Promise<string | null> {
  const url = getEgidePdfExtractUrlFromParts()
  const apiKey = getEgideApiKey()
  if (!url || !apiKey) return null

  const field = getEgideFileFieldName()
  const authPrefix = getEgideAuthPrefix()

  const form = new FormData()
  form.append(field, new Blob([new Uint8Array(buffer)], { type: 'application/pdf' }), 'document.pdf')

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `${authPrefix}${apiKey}`.trim(),
      },
      body: form,
    })

    const raw = await res.text()
    if (!res.ok) {
      console.warn('[Egide]', res.status, raw.slice(0, 200))
      return null
    }

    const ct = (res.headers.get('content-type') ?? '').toLowerCase()
    const trimmed = raw.trim()
    if (ct.includes('application/json') || trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        const json = JSON.parse(raw) as unknown
        const fromJson = pickTextFromJson(json)
        if (fromJson) return fromJson
      } catch {
        /* segue para texto bruto */
      }
    }

    if (trimmed.length >= MIN_CHARS) return trimmed
    return null
  } catch (e) {
    console.warn('[Egide] fetch failed', e)
    return null
  }
}
