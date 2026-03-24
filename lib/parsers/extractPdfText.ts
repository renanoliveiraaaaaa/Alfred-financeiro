import { PDFParse } from 'pdf-parse'

/**
 * Extrai texto bruto de um PDF (Node.js / server action).
 * Falha em PDFs só-imagem (sem camada de texto).
 */
export async function extractPdfPlainText(buffer: Buffer): Promise<string> {
  const data = new Uint8Array(buffer)
  const parser = new PDFParse({ data })
  try {
    const result = await parser.getText()
    return (result.text ?? '').trim()
  } finally {
    await parser.destroy()
  }
}
