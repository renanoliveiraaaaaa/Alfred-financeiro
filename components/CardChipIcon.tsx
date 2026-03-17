'use client'

type Props = {
  className?: string
  size?: number
}

export default function CardChipIcon({ className = '', size = 24 }: Props) {
  return (
    <svg viewBox="0 0 32 24" width={size} height={size * 0.75} className={className}>
      <rect x="2" y="4" width="28" height="16" rx="2" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.4)" strokeWidth="0.5" />
      <line x1="2" y1="12" x2="8" y2="12" stroke="rgba(255,255,255,0.35)" strokeWidth="0.5" />
      <line x1="24" y1="12" x2="30" y2="12" stroke="rgba(255,255,255,0.35)" strokeWidth="0.5" />
      <line x1="16" y1="4" x2="16" y2="8" stroke="rgba(255,255,255,0.35)" strokeWidth="0.5" />
      <line x1="16" y1="16" x2="16" y2="20" stroke="rgba(255,255,255,0.35)" strokeWidth="0.5" />
      <rect x="4" y="6" width="8" height="4" rx="0.5" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.4)" strokeWidth="0.3" />
    </svg>
  )
}
