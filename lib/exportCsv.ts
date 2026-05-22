/**
 * Utilitário de exportação de dados para CSV e Excel.
 */

import * as XLSX from 'xlsx'

export type ExportRow = Record<string, string | number | boolean | null | undefined>
export type ExportSheet = { name: string; rows: ExportRow[] }

function escapeCsvCell(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return ''
  const str = String(value)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

export function downloadCsv(rows: ExportRow[], filename: string) {
  if (rows.length === 0) return

  const headers = Object.keys(rows[0])
  const csvLines = [
    headers.map(escapeCsvCell).join(','),
    ...rows.map((row) => headers.map((h) => escapeCsvCell(row[h])).join(',')),
  ]

  const bom = '\uFEFF' // BOM UTF-8 para Excel reconhecer acentos
  const blob = new Blob([bom + csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/** Nome de aba válido no Excel (máx. 31 caracteres, sem \ / ? * [ ]). */
function sanitizeSheetName(name: string): string {
  return name.replace(/[\\/?*[\]]/g, '').slice(0, 31) || 'Dados'
}

export function downloadExcel(sheets: ExportSheet[], filename: string) {
  const wb = XLSX.utils.book_new()
  for (const sheet of sheets) {
    if (sheet.rows.length === 0) continue
    const ws = XLSX.utils.json_to_sheet(sheet.rows)
    XLSX.utils.book_append_sheet(wb, ws, sanitizeSheetName(sheet.name))
  }
  if (wb.SheetNames.length === 0) return
  const base = filename.replace(/\.xlsx$/i, '')
  XLSX.writeFile(wb, `${base}.xlsx`)
}

export function formatCurrencyBR(value: number): string {
  return value.toFixed(2).replace('.', ',')
}

export function formatDateBR(dateStr: string | null | undefined): string {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('pt-BR')
}
