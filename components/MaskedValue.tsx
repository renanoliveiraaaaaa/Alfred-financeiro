'use client'

import { usePrivacy } from '@/lib/privacyContext'
import { formatCurrency } from '@/lib/format'

type Props = {
  value: number
  className?: string
}

export default function MaskedValue({ value, className }: Props) {
  const { isPrivacyMode } = usePrivacy()

  return (
    <span className={className}>
      {isPrivacyMode ? 'R$ •••••' : formatCurrency(value)}
    </span>
  )
}
