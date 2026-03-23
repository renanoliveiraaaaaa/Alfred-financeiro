'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import Link from 'next/link'
import { FileUp, Upload, X, Loader2, AlertCircle, FileText, Sparkles, History, Zap } from 'lucide-react'
import ImportReviewModal, { ReviewTransaction } from '@/components/ImportReviewModal'
import { useGreetingPronoun } from '@/lib/greeting'
import { parseBankStatementPdf } from '@/lib/actions/parse-bank-statement-pdf'

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

const BANK_ID_LABELS: Record<string, string> = {
  itau: 'Itaú',
  bradesco: 'Bradesco',
  bb: 'Banco do Brasil',
  caixa: 'Caixa Econômica',
  santander: 'Santander',
  inter: 'Banco Inter',
  c6: 'C6 Bank',
  nubank: 'Nubank',
}

const ACCEPT_OFX = '.csv,.ofx,.qfx'
const ACCEPT_PDF = '.pdf'

type ImportMode = 'ofx' | 'pdf'

/** Detecta o banco a partir dos primeiros ~4 KB do arquivo OFX (lado cliente, sem rede). */
function sniffBankFromOfxText(text: string): string | null {
  const head = text.substring(0, 4096)
  const bankIdMatch = head.match(/<(?:[\w.-]+:)?BANKID>(\d+)/i)
  if (bankIdMatch) {
    const n = bankIdMatch[1].replace(/^0+/, '') || bankIdMatch[1]
    if (n === '341') return 'itau'
    if (n === '237') return 'bradesco'
    if (n === '1') return 'bb'
    if (n === '104') return 'caixa'
    if (n === '33') return 'santander'
    if (n === '260' || n === '077') return 'inter'
    if (n === '336') return 'c6'
  }
  const orgMatch = head.match(/<(?:[\w.-]+:)?ORG>([^<\r\n]+)/i)
  if (orgMatch) {
    const org = orgMatch[1].toUpperCase()
    if (/ITAU|ITA[UÚ]/.test(org)) return 'itau'
    if (/BRADESCO/.test(org)) return 'bradesco'
    if (/BANCO DO BRASIL|BB\.COM/.test(org)) return 'bb'
    if (/CAIXA|CEF/.test(org)) return 'caixa'
    if (/SANTANDER/.test(org)) return 'santander'
    if (/INTER/.test(org)) return 'inter'
    if (/C6/.test(org)) return 'c6'
    if (/NUBANK|NU PAGAMENTOS/.test(org)) return 'nubank'
  }
  return null
}

export default function ImportStatementPage() {
  const pronoun = useGreetingPronoun()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const pdfInputRef = useRef<HTMLInputElement>(null)

  const [mode, setMode] = useState<ImportMode>('ofx')

  // ── Estado OFX ──
  const [file, setFile] = useState<File | null>(null)
  const [bank, setBank] = useState('generic')
  const [autoDetectedBank, setAutoDetectedBank] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [skipItauPixRule, setSkipItauPixRule] = useState(false)

  // ── Estado PDF ──
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [pdfDragging, setPdfDragging] = useState(false)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [pdfError, setPdfError] = useState<string | null>(null)

  // ── Modal compartilhado ──
  const [transactions, setTransactions] = useState<ReviewTransaction[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [modalBank, setModalBank] = useState('generic')
  const [modalFileName, setModalFileName] = useState('')

  /** Ao selecionar arquivo OFX/QFX, lê o início do arquivo e tenta detectar o banco */
  useEffect(() => {
    if (!file) {
      setAutoDetectedBank(null)
      return
    }
    const ext = file.name.split('.').pop()?.toLowerCase()
    if (ext !== 'ofx' && ext !== 'qfx') {
      setAutoDetectedBank(null)
      return
    }

    // Lê apenas os primeiros 4 KB para não travar
    const blob = file.slice(0, 4096)
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = (e.target?.result as string) ?? ''
      const detected = sniffBankFromOfxText(text)
      setAutoDetectedBank(detected)
      if (detected && bank === 'generic') {
        setBank(detected)
      }
    }
    reader.readAsText(blob, 'ISO-8859-1')
  }, [file])

  const handleFileSelect = (selected: File | null) => {
    setError(null)
    setFile(selected)
    if (!selected) {
      setBank('generic')
      setAutoDetectedBank(null)
    }
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

  const openModal = (txs: Omit<ReviewTransaction, 'id'>[], bankName: string, fileName: string) => {
    const withIds: ReviewTransaction[] = txs.map((t, idx) => ({
      ...t,
      id: `${idx}-${t.date}-${t.amount}`,
    }))
    setTransactions(withIds)
    setModalBank(bankName)
    setModalFileName(fileName)
    setModalOpen(true)
  }

  // ── Processar OFX/CSV ──
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
      if (skipItauPixRule) {
        formData.append('skip_itau_pix_rule', '1')
      }

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

      if (json.detected_bank && json.detected_bank !== bank) {
        setBank(json.detected_bank)
      }

      openModal(json.transactions, bank, file.name)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro inesperado.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  // ── Processar PDF com Gemini ──
  const handlePdfProcess = async () => {
    if (!pdfFile) {
      setPdfError('Selecione um arquivo PDF para continuar.')
      return
    }

    setPdfLoading(true)
    setPdfError(null)

    try {
      const buffer = await pdfFile.arrayBuffer()
      const base64 = Buffer.from(buffer).toString('base64')

      const result = await parseBankStatementPdf(base64, pdfFile.type)

      if (!result.success) {
        setPdfError(result.error)
        return
      }

      openModal(result.transactions, result.bank, pdfFile.name)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro inesperado.'
      setPdfError(msg)
    } finally {
      setPdfLoading(false)
    }
  }

  const showItauHint = bank === 'itau' || file?.name.toLowerCase().endsWith('.ofx') || file?.name.toLowerCase().endsWith('.qfx')

  const cls = {
    label: 'block text-xs font-medium text-muted uppercase tracking-wider mb-1.5',
    input: 'block w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm text-main placeholder-muted focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-colors',
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
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
        <Link
          href="/import-history"
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-sm font-medium text-muted hover:text-main hover:bg-background transition-colors shrink-0"
        >
          <History className="h-4 w-4" />
          Ver histórico
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-background border border-border">
        <button
          onClick={() => setMode('ofx')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
            mode === 'ofx'
              ? 'bg-surface shadow-sm text-main border border-border'
              : 'text-muted hover:text-main'
          }`}
        >
          <FileText className="h-4 w-4" />
          CSV / OFX
        </button>
        <button
          onClick={() => setMode('pdf')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
            mode === 'pdf'
              ? 'bg-surface shadow-sm text-main border border-border'
              : 'text-muted hover:text-main'
          }`}
        >
          <Zap className="h-4 w-4 text-amber-500" />
          PDF com IA
        </button>
      </div>

      {/* ── MODO PDF ── */}
      {mode === 'pdf' && (
        <>
          <div className="glass-card rounded-xl border border-border bg-surface p-6 space-y-5">
            <div className="flex items-start gap-3 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 px-4 py-3">
              <Zap className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700 dark:text-amber-300">
                O Gemini AI lê o PDF do seu extrato e extrai todas as transações automaticamente. Funciona com qualquer banco.
              </p>
            </div>

            {/* Drop zone PDF */}
            <div>
              <label className={cls.label}>Arquivo PDF do extrato</label>
              <div
                onDrop={(e) => {
                  e.preventDefault()
                  setPdfDragging(false)
                  const f = e.dataTransfer.files[0]
                  if (f?.type === 'application/pdf') { setPdfFile(f); setPdfError(null) }
                  else setPdfError('Apenas arquivos PDF são suportados.')
                }}
                onDragOver={(e) => { e.preventDefault(); setPdfDragging(true) }}
                onDragLeave={() => setPdfDragging(false)}
                onClick={() => pdfInputRef.current?.click()}
                className={`relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-8 cursor-pointer transition-colors ${
                  pdfDragging
                    ? 'border-brand bg-brand/5'
                    : 'border-border hover:border-brand/50 hover:bg-background/50'
                }`}
              >
                <input
                  ref={pdfInputRef}
                  type="file"
                  accept={ACCEPT_PDF}
                  className="sr-only"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) { setPdfFile(f); setPdfError(null) }
                  }}
                />
                {pdfFile ? (
                  <>
                    <FileText className="h-8 w-8 text-brand" />
                    <div className="text-center">
                      <p className="text-sm font-medium text-main">{pdfFile.name}</p>
                      <p className="text-xs text-muted mt-0.5">{(pdfFile.size / 1024).toFixed(1)} KB · PDF</p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setPdfFile(null); if (pdfInputRef.current) pdfInputRef.current.value = '' }}
                      className="absolute top-2 right-2 p-1.5 rounded-lg text-muted hover:text-main hover:bg-background transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </>
                ) : (
                  <>
                    <Upload className="h-8 w-8 text-muted" />
                    <div className="text-center">
                      <p className="text-sm font-medium text-main">Arraste o PDF ou clique para selecionar</p>
                      <p className="text-xs text-muted mt-0.5">Extrato de qualquer banco em PDF</p>
                    </div>
                  </>
                )}
              </div>
            </div>

            {pdfError && (
              <div className="flex items-start gap-2 rounded-lg border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 px-3 py-2.5 text-xs text-red-700 dark:text-red-300">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                {pdfError}
              </div>
            )}

            <button
              type="button"
              onClick={handlePdfProcess}
              disabled={pdfLoading || !pdfFile}
              className="w-full min-h-[44px] inline-flex items-center justify-center gap-2 rounded-lg bg-brand text-white text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-colors"
            >
              {pdfLoading ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Gemini analisando PDF...</>
              ) : (
                <><Zap className="h-4 w-4" /> Analisar PDF com IA</>
              )}
            </button>
          </div>

          <div className="glass-card rounded-xl border border-border bg-surface p-4 space-y-2">
            <p className="text-xs font-medium text-muted uppercase tracking-wider">Como funciona</p>
            <ul className="space-y-1 text-xs text-muted">
              <li>1. Faça o upload do PDF do extrato (exportado pelo app do banco)</li>
              <li>2. O Gemini AI lê e extrai todas as transações</li>
              <li>3. Você revisa, edita tipos (receita/despesa) e confirma</li>
              <li className="pt-1 text-[10px]">Requer <code className="bg-border/40 px-1 rounded">GEMINI_API_KEY</code> configurada no .env.local</li>
            </ul>
          </div>
        </>
      )}

      {/* ── MODO OFX/CSV ── */}
      {mode === 'ofx' && (
      <>
      {/* Main card */}
      <div className="glass-card rounded-xl border border-border bg-surface p-6 space-y-5">
        {/* Bank selector */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className={cls.label.replace('mb-1.5', '')}>Banco / Instituição</label>
            {autoDetectedBank && (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-brand rounded-full bg-brand/10 px-2 py-0.5">
                <Sparkles className="h-2.5 w-2.5" />
                Auto-detectado
              </span>
            )}
          </div>
          <select
            className={cls.input}
            value={bank}
            onChange={(e) => {
              setBank(e.target.value)
              setAutoDetectedBank(null)
            }}
          >
            {BANK_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          {autoDetectedBank && (
            <p className="mt-1.5 text-xs text-muted">
              O arquivo OFX foi reconhecido como{' '}
              <strong className="text-main">{BANK_ID_LABELS[autoDetectedBank] ?? autoDetectedBank}</strong>.
              As heurísticas específicas deste banco foram aplicadas automaticamente.
            </p>
          )}
        </div>

        {/* Ajuste Itaú OFX (opcional) */}
        {showItauHint && (
          <label className="flex items-start gap-3 cursor-pointer rounded-lg border border-border bg-background/50 px-3 py-2.5">
            <input
              type="checkbox"
              checked={skipItauPixRule}
              onChange={(e) => setSkipItauPixRule(e.target.checked)}
              className="mt-0.5 rounded border-border text-brand focus:ring-brand"
            />
            <span className="text-xs text-muted leading-snug">
              <span className="font-medium text-main">Não aplicar regra PIX Itaú</span>
              {' — '}
              Extratos Itaú (OFX 102) costumam marcar tudo como CREDIT. Por padrão, tratamos linhas{' '}
              <code className="text-[10px] bg-border/50 px-1 rounded">PIX TRANSF</code> (exceto rendimentos/devoluções)
              como <strong className="text-main">despesa</strong>. Marque aqui se você <strong>recebe</strong> PIX com
              essa descrição e prefere classificar tudo como receita no modal.
            </span>
          </label>
        )}

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
              accept={ACCEPT_OFX}
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
          <li><span className="text-main font-medium">OFX / QFX</span> — Itaú, Bradesco, Banco do Brasil, Santander, Caixa e outros (banco detectado automaticamente)</li>
        </ul>
        <p className="text-xs text-muted pt-1">
          O período importado é o que consta no arquivo (<code className="text-[10px] bg-border/40 px-1 rounded">DTSTART</code> /{' '}
          <code className="text-[10px] bg-border/40 px-1 rounded">DTEND</code> no OFX). Para meses fora do intervalo, gere um novo extrato no banco.
        </p>
        <p className="text-xs text-muted pt-1">
          Após o processamento, você poderá revisar, editar e confirmar cada transação antes de importar.
        </p>
      </div>

      {/* Info card */}
      <div className="glass-card rounded-xl border border-border bg-surface p-4 space-y-2">
        <p className="text-xs font-medium text-muted uppercase tracking-wider">Formatos suportados</p>
        <ul className="space-y-1 text-xs text-muted">
          <li><span className="text-main font-medium">CSV</span> — Nubank, Inter e formato genérico</li>
          <li><span className="text-main font-medium">OFX / QFX</span> — Itaú, Bradesco, Banco do Brasil, Santander, Caixa e outros (banco detectado automaticamente)</li>
        </ul>
        <p className="text-xs text-muted pt-1">
          O período importado é o que consta no arquivo (<code className="text-[10px] bg-border/40 px-1 rounded">DTSTART</code> /{' '}
          <code className="text-[10px] bg-border/40 px-1 rounded">DTEND</code> no OFX). Para meses fora do intervalo, gere um novo extrato no banco.
        </p>
        <p className="text-xs text-muted pt-1">
          Após o processamento, você poderá revisar, editar e confirmar cada transação antes de importar.
        </p>
      </div>
      </>
      )}

      {/* Review modal — compartilhado entre os dois modos */}
      <ImportReviewModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        transactions={transactions}
        bank={modalBank}
        fileName={modalFileName}
      />
    </div>
  )
}
