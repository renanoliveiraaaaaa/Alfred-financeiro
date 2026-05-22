'use client'

import { useRef, type ReactNode, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { useFocusTrap, useEscapeKey } from '@/lib/useFocusTrap'

type Props = {
  open: boolean
  onClose: () => void
  children: ReactNode
  titleId?: string
  closeOnBackdrop?: boolean
  closeOnEscape?: boolean
  backdropClassName?: string
  panelClassName?: string
  panelRef?: React.RefObject<HTMLDivElement>
}

export default function ModalShell({
  open,
  onClose,
  children,
  titleId,
  closeOnBackdrop = true,
  closeOnEscape = true,
  backdropClassName = 'fixed inset-0 z-[999] flex flex-col sm:items-center sm:justify-center bg-black/60 backdrop-blur-sm px-0 sm:px-4 py-4 sm:py-0 overflow-y-auto animate-backdrop-enter',
  panelClassName = 'w-full max-w-md sm:rounded-xl rounded-t-xl border-0 sm:border border-border bg-surface shadow-2xl animate-modal-enter mt-auto sm:mt-0 outline-none',
  panelRef: externalPanelRef,
}: Props) {
  const internalRef = useRef<HTMLDivElement>(null)
  const panelRef = (externalPanelRef ?? internalRef) as RefObject<HTMLDivElement>

  useFocusTrap(open, panelRef)
  useEscapeKey(open && closeOnEscape, onClose)

  if (!open) return null

  const modal = (
    <div
      className={backdropClassName}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={(e) => {
        if (closeOnBackdrop && e.target === e.currentTarget) onClose()
      }}
    >
      <div ref={panelRef} tabIndex={-1} className={panelClassName}>
        {children}
      </div>
    </div>
  )

  return typeof document !== 'undefined' ? createPortal(modal, document.body) : null
}
