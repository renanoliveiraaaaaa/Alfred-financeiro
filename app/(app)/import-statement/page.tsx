'use client'

import { useState, useRef, useCallback } from 'react'
import { FileUp, Upload, X, Loader2, AlertCircle, FileText } from 'lucide-react'
import ImportReviewModal, { ReviewTransaction } from '@/components/ImportReviewModal'
import { useGreetingPronoun } from '@/lib/greeting'

const BANK_OPTIONS = [
  { value: 'nubank', label: 'Nubank' },
  { value: 'inter', label: 'Banco Inter' },
  { value: 'itau', label: 'Itaú' },
  { value: 'bradesco', label: 'Bradesco' },
  { value: 'bb', label: 'Banco do Brasil' },
  { value: 'c6', label: 'C6 Bank' },
  { value: 'santander', label: 'Santander' },
  { value: 'caixa', label: 'Caixa Econômica' },
  { value: 'generic', label: 'Genérico (CSV/OFX)' },
]

const ACCEPT = '.csv,.ofx,.qfx'

export default function ImportStatementPage() {
  const pronoun = useGreetingPronoun()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [file, setFile] = useState<File | null>(null)
  const [bank, setBank] = useState('generic')
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [transactions, setTransactions] = useState<ReviewTransaction[]>([])
  const [modalOpen, setModalOpen] = useState(false)

  const handleFileSelect = (selected: File | null) => {
    setError(null)
    setFile(selected)
  }

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragging(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped) handleFileSelect(dropped)
  }, [])

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragging(true)
  }

  const handleDragLeave = () => setDragging(false)

  const handleProcess = async () => {
    if (!file) {
      setError('Selecione um arquivo para continuar.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('bank', bank)

      const res = await fetch('/api/parse-statement', {
        method: 'POST',
        body: formData,
      })

      const json = await res.json()

      if (!res.ok || json.error) {
        setError(json.error ?? 'Erro ao processar o arquivo.')
        return
      }

      if (!json.transactions || json.transactions.length === 0) {
        setError('Nenhuma transação encontrada no arquivo. Verifique o formato e o banco selecionado.')
        return
      }

      // Atribui IDs únicos para uso no modal
      const withIds: ReviewTransaction[] = json.transactions.map(
        (t: Omit<ReviewTransaction, 'id'>, idx: number) => ({
          ...t,
          id: `${idx}-${t.date}-${t.amount}`,
        }),
      )

      setTransactions(withIds)
      setModalOpen(true)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro inesperado.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const cls = {
    label: 'block text-xs font-medium text-muted uppercase tracking-wider mb-1.5',
    input: 'block w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm text-main placeholder-muted focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-colors',
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-semibold text-main flex items-center gap-2">
          <FileUp className="h-5 w-5 text-brand" />
          Importar Extrato
        </h1>
        <p className="text-sm text-muted mt-1">
          {pronoun
            ? `Prezado(a) ${pronoun}, importe extratos bancários para catalogar transações de períodos anteriores.`
            : 'Importe extratos bancários para catalogar transações de períodos anteriores.'}
        </p>
      </div>

      {/* Main card */}
      <div className="glass-card rounded-xl border border-border bg-surface p-6 space-y-5">
        {/* Bank selector */}
        <div>
          <label className={cls.label}>Banco / Instituição</label>
          <select
            className={cls.input}
            value={bank}
            onChange={(e) => setBank(e.target.value)}
          >
            {BANK_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* File drop zone */}
        <div>
          <label className={cls.label}>Arquivo de extrato</label>
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            className={`relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-8 cursor-pointer transition-colors ${
              dragging
                ? 'border-brand bg-brand/5'
                : 'border-border hover:border-brand/50 hover:bg-background/50'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPT}
              className="sr-only"
              onChange={(e) => handleFileSelect(e.target.files?.[0] ?? null)}
            />

            {file ? (
              <>
                <FileText className="h-8 w-8 text-brand" />
                <div className="text-center">
                  <p className="text-sm font-medium text-main">{file.name}</p>
                  <p className="text-xs text-muted mt-0.5">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleFileSelect(null)
                    if (fileInputRef.current) fileInputRef.current.value = ''
                  }}
                  className="absolute top-2 right-2 p-1.5 rounded-lg text-muted hover:text-main hover:bg-background transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </>
            ) : (
              <>
                <Upload className="h-8 w-8 text-muted" />
                <div className="text-center">
                  <p className="text-sm font-medium text-main">
                    Arraste o arquivo ou clique para selecionar
                  </p>
                  <p className="text-xs text-muted mt-0.5">CSV, OFX ou QFX</p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 px-3 py-2.5 text-xs text-red-700 dark:text-red-300">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        {/* Submit */}
        <button
          type="button"
          onClick={handleProcess}
          disabled={loading || !file}
          className="w-full min-h-[44px] inline-flex items-center justify-center gap-2 rounded-lg bg-brand text-white text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-colors"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Processando extrato...
            </>
          ) : (
            <>
              <FileUp className="h-4 w-4" /> Processar extrato
            </>
          )}
        </button>
      </div>

      {/* Info card */}
      <div className="glass-card rounded-xl border border-border bg-surface p-4 space-y-2">
        <p className="text-xs font-medium text-muted uppercase tracking-wider">Formatos suportados</p>
        <ul className="space-y-1 text-xs text-muted">
          <li><span className="text-main font-medium">CSV</span> — Nubank, Inter e formato genérico</li>
          <li><span className="text-main font-medium">OFX / QFX</span> — Itaú, Bradesco, Banco do Brasil, Santander, Caixa</li>
        </ul>
        <p className="text-xs text-muted pt-1">
          Após o processamento, você poderá revisar, editar e confirmar cada transação antes de importar.
        </p>
      </div>

      {/* Review modal */}
      <ImportReviewModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        transactions={transactions}
        bank={bank}
        fileName={file?.name ?? 'extrato'}
      />
    </div>
  )
}
