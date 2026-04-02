'use client'

import { useState } from 'react'
import { ArrowRightLeft, Loader2 } from 'lucide-react'
import { moveTransaction } from '@/lib/actions/expenses'
import { useToast } from '@/lib/toastContext'

type Props = {
  expenseId: string
  targetOrgId: string
  /** Nome curto da organização de destino (ex.: nome da empresa ou «Minhas Finanças») */
  targetLabel: string
  /** Só ícone (útil em tabelas) */
  compact?: boolean
  className?: string
  onMoved?: () => void
}

export default function ExpenseContextMoveButton({
  expenseId,
  targetOrgId,
  targetLabel,
  compact,
  className = '',
  onMoved,
}: Props) {
  const [loading, setLoading] = useState(false)
  const { toast, toastError } = useToast()

  const handleClick = async () => {
    if (loading) return
    setLoading(true)
    try {
      const r = await moveTransaction(expenseId, targetOrgId)
      if (!r.ok) {
        toastError(r.error)
        return
      }
      toast('Despesa movida para o contexto sugerido.', 'success')
      onMoved?.()
    } catch (e: unknown) {
      toastError(e instanceof Error ? e.message : 'Não foi possível mover a despesa.')
    } finally {
      setLoading(false)
    }
  }

  const label = `Mover para ${targetLabel}`

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      title={label}
      aria-label={label}
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg border border-border/80 bg-background/60 px-2.5 py-1.5 text-xs font-medium text-muted hover:text-brand hover:border-brand/40 hover:bg-brand/5 transition-colors disabled:opacity-50 touch-manipulation min-h-[36px] ${className}`}
    >
      {loading ? (
        <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
      ) : (
        <ArrowRightLeft className="h-3.5 w-3.5 shrink-0" />
      )}
      {!compact && <span className="max-w-[140px] truncate">{label}</span>}
    </button>
  )
}
