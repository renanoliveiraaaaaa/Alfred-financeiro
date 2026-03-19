import { ParsedTransaction } from './types'
import { parseNubankCsv } from './nubank-csv'
import { parseInterCsv } from './inter-csv'
import { parseGenericCsv } from './generic-csv'
import { parseOfx } from './ofx-parser'

export type SupportedBank =
  | 'nubank'
  | 'inter'
  | 'itau'
  | 'bradesco'
  | 'bb'
  | 'c6'
  | 'santander'
  | 'caixa'
  | 'generic'

export type FileFormat = 'csv' | 'ofx' | 'qfx'

export type { ParsedTransaction }

/**
 * Factory: seleciona o parser correto com base no banco e formato do arquivo.
 *
 * @param content  Conteúdo textual do arquivo
 * @param bank     Banco selecionado pelo usuário
 * @param format   Extensão do arquivo (csv | ofx | qfx)
 */
export function parseStatement(
  content: string,
  bank: SupportedBank,
  format: FileFormat,
): ParsedTransaction[] {
  // OFX/QFX usa sempre o mesmo parser, independente do banco
  if (format === 'ofx' || format === 'qfx') {
    return parseOfx(content)
  }

  // CSV: parser específico por banco
  if (format === 'csv') {
    switch (bank) {
      case 'nubank':
        return parseNubankCsv(content)
      case 'inter':
        return parseInterCsv(content)
      default:
        return parseGenericCsv(content)
    }
  }

  return []
}

/**
 * Detecta o formato do arquivo pela extensão do nome.
 */
export function detectFormat(fileName: string): FileFormat | null {
  const ext = fileName.split('.').pop()?.toLowerCase()
  if (ext === 'csv') return 'csv'
  if (ext === 'ofx') return 'ofx'
  if (ext === 'qfx') return 'qfx'
  return null
}
