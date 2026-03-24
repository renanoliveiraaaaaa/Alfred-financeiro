import { PDFParse } from 'pdf-parse'

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
 */
export async function extractPdfPlainText(
  buffer: Buffer,
  options?: ExtractPdfPlainTextOptions,
): Promise<string> {
  const data = new Uint8Array(buffer)
  const parser = new PDFParse({ data })
  try {
    const max = options?.maxPages
    const parseParams =
      max != null && max > 0 ? { first: max } : undefined
    const result = await parser.getText(parseParams)
    return (result.text ?? '').trim()
  } finally {
    await parser.destroy()
  }
}
