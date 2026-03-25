export type ExtractPdfPlainTextOptions = {
  /**
   * Só extrai as primeiras N páginas (muito mais rápido em PDFs longos).
   * Faturas/extratos costumam trazer os lançamentos no início.
   */
  maxPages?: number
}

type PdfParserInstance = {
  getText: (params?: { first?: number }) => Promise<{ text?: string }>
  destroy: () => Promise<void>
}

/**
 * Extrai texto bruto de um PDF (Node.js / server action).
 * Falha em PDFs só-imagem (sem camada de texto).
 *
 * Import dinâmico: evita 500 no bundle se pdf-parse/pdfjs falhar no ambiente serverless;
 * erros viram string vazia e o fluxo segue para Gemini ou mensagem amigável.
 */
export async function extractPdfPlainText(
  buffer: Buffer,
  options?: ExtractPdfPlainTextOptions,
): Promise<string> {
  let parser: PdfParserInstance | null = null
  try {
    const mod = await import('pdf-parse')
    const PDFParse = mod.PDFParse as new (opts: { data: Uint8Array }) => PdfParserInstance
    const data = new Uint8Array(buffer)
    parser = new PDFParse({ data })
    const max = options?.maxPages
    const parseParams =
      max != null && max > 0 ? { first: max } : undefined
    const result = await parser.getText(parseParams)
    return (result.text ?? '').trim()
  } catch {
    return ''
  } finally {
    if (parser) {
      try {
        await parser.destroy()
      } catch {
        /* ignore */
      }
    }
  }
}
