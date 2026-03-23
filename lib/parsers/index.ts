import { ParsedTransaction } from './types'
import { parseNubankCsv } from './nubank-csv'
import { parseInterCsv } from './inter-csv'
import { parseGenericCsv } from './generic-csv'
import { parseOfx, detectBankFromOfxContent } from './ofx-parser'
import { enrichParsedTransactions } from '@/lib/importHeuristics'

export { detectBankFromOfxContent } from './ofx-parser'

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
 * @param extra    OFX: `skipItauPixTransfExpenseRule` desliga PIX TRANSF → despesa (Itaú)
 */
export function parseStatement(
  content: string,
  bank: SupportedBank,
  format: FileFormat,
  extra?: { skipItauPixTransfExpenseRule?: boolean },
): ParsedTransaction[] {
  if (format === 'ofx' || format === 'qfx') {
    // Auto-detecção: se o usuário não escolheu um banco específico, tenta inferir pelo conteúdo
    const effectiveBank =
      bank === 'generic' ? (detectBankFromOfxContent(content) ?? bank) : bank
    return enrichParsedTransactions(
      parseOfx(content, {
        selectedBank: effectiveBank,
        skipItauPixTransfExpenseRule: extra?.skipItauPixTransfExpenseRule,
      }),
    )
  }

  // CSV: parser específico por banco
  if (format === 'csv') {
    switch (bank) {
      case 'nubank':
        return enrichParsedTransactions(parseNubankCsv(content))
      case 'inter':
        return enrichParsedTransactions(parseInterCsv(content))
      default:
        return enrichParsedTransactions(parseGenericCsv(content))
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
