export type ExtractPdfPlainTextOptions = {
  /**
   * Só extrai as primeiras N páginas (muito mais rápido em PDFs longos).
   * Faturas/extratos costumam trazer os lançamentos no início.
   */
  maxPages?: number
}

/**
 * Extrai texto bruto de um PDF (Node.js / server action).
 * Falha em PDFs só-imagem (sem camada de texto).
 *
 * Import dinâmico: evita 500 no bundle se pdfjs falhar no ambiente serverless;
 * erros viram string vazia e o fluxo segue para Gemini ou mensagem amigável.
 */
export async function extractPdfPlainText(
  buffer: Buffer,
  options?: ExtractPdfPlainTextOptions,
): Promise<string> {
  try {
    const { getDocument, GlobalWorkerOptions } = await import('pdfjs-dist')
    // Node.js não tem Workers — desabilitar para processar no thread principal
    GlobalWorkerOptions.workerSrc = ''
    const data = new Uint8Array(buffer)
    const loadingTask = getDocument({ data })
    const pdf = await loadingTask.promise
    const maxPages = options?.maxPages ?? pdf.numPages
    const last = Math.min(pdf.numPages, maxPages)
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
  } catch {
    return ''
  }
}
