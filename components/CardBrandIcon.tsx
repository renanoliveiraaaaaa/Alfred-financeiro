'use client'

const BRANDS = ['visa', 'mastercard', 'amex', 'elo', 'hipercard', 'outros'] as const
export type CardBrand = (typeof BRANDS)[number]

function normalizeBrand(brand: string | null | undefined): CardBrand {
  if (!brand) return 'outros'
  const b = brand.toLowerCase().trim()
  if (b === 'visa') return 'visa'
  if (b === 'mastercard' || b.includes('master')) return 'mastercard'
  if (b === 'amex' || b.includes('american')) return 'amex'
  if (b === 'elo') return 'elo'
  if (b === 'hipercard' || b.includes('hiper')) return 'hipercard'
  return 'outros'
}

type Props = {
  brand: string | null | undefined
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

const sizes = { sm: 20, md: 28, lg: 36 }

export default function CardBrandIcon({ brand, className = '', size = 'md' }: Props) {
  const b = normalizeBrand(brand)
  const s = sizes[size]
  const fill = 'currentColor'

  switch (b) {
    case 'visa':
      return (
        <svg viewBox="0 0 48 16" width={s * 1.5} height={s} className={className}>
          <text x="0" y="12" fontFamily="Georgia, serif" fontSize="11" fontWeight="bold" fontStyle="italic" fill={fill} opacity="0.95">
            VISA
          </text>
        </svg>
      )
    case 'mastercard':
      return (
        <svg viewBox="0 0 24 16" width={s * 1.5} height={s} className={className}>
          <circle cx="9" cy="8" r="6" fill="rgba(255,255,255,0.9)" />
          <circle cx="15" cy="8" r="6" fill="rgba(255,255,255,0.6)" />
          <path d="M12 3.5a6.5 6.5 0 0 1 0 9 6.5 6.5 0 0 1 0-9z" fill="rgba(255,255,255,0.5)" />
        </svg>
      )
    case 'amex':
      return (
        <svg viewBox="0 0 48 16" width={s * 1.5} height={s} className={className}>
          <rect x="0" y="2" width="18" height="10" rx="1" fill="none" stroke={fill} strokeWidth="0.8" opacity="0.9" />
          <text x="3" y="9" fontFamily="Arial, sans-serif" fontSize="5" fontWeight="bold" fill={fill}>
            AMEX
          </text>
        </svg>
      )
    case 'elo':
      return (
        <svg viewBox="0 0 36 16" width={s * 1.5} height={s} className={className}>
          <text x="0" y="11" fontFamily="Arial, sans-serif" fontSize="9" fontWeight="bold" fill={fill} opacity="0.95">
            ELO
          </text>
        </svg>
      )
    case 'hipercard':
      return (
        <svg viewBox="0 0 56 16" width={s * 1.5} height={s} className={className}>
          <text x="0" y="11" fontFamily="Arial, sans-serif" fontSize="7" fontWeight="bold" fill={fill} opacity="0.95">
            HIPERCARD
          </text>
        </svg>
      )
    default:
      return (
        <svg viewBox="0 0 32 16" width={s * 1.5} height={s} className={className}>
          <rect x="0" y="3" width="22" height="9" rx="1" fill="none" stroke={fill} strokeWidth="0.6" opacity="0.7" />
          <text x="4" y="9.5" fontFamily="Arial, sans-serif" fontSize="5" fill={fill} opacity="0.8">
            CARD
          </text>
        </svg>
      )
  }
}

export const BRAND_OPTIONS: { value: string; label: string }[] = [
  { value: 'visa', label: 'Visa' },
  { value: 'mastercard', label: 'Mastercard' },
  { value: 'amex', label: 'American Express' },
  { value: 'elo', label: 'Elo' },
  { value: 'hipercard', label: 'Hipercard' },
  { value: 'outros', label: 'Outros' },
]
