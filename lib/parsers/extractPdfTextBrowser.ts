/**
 * Extração de texto de PDF apenas no browser (pdf.js + Web Worker).
 * Usado antes da server action para evitar parse pesado no servidor quando a heurística local bastar.
 */

const MAX_PAGES = 32

export async function extractPdfTextInBrowser(arrayBuffer: ArrayBuffer): Promise<string> {
  if (typeof window === 'undefined') return ''

  const { getDocument, GlobalWorkerOptions, version } = await import('pdfjs-dist')
  GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${version}/build/pdf.worker.min.mjs`

  // Cópia: getDocument/worker pode fazer transfer/detach do ArrayBuffer — o chamador ainda precisa do original (ex.: base64).
  const data = new Uint8Array(arrayBuffer.slice(0))
  const loadingTask = getDocument({ data })
  const pdf = await loadingTask.promise
  const last = Math.min(pdf.numPages, MAX_PAGES)
  const parts: string[] = []

  for (let p = 1; p <= last; p++) {
    const page = await pdf.getPage(p)
    const content = await page.getTextContent()
    const line = content.items
      .map((item) => ('str' in item && typeof item.str === 'string' ? item.str : ''))
      .filter(Boolean)
      .join(' ')
    if (line) parts.push(line)
  }

  return parts.join('\n\n')
}
