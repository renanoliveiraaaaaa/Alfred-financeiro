'use client'

import { useCallback, useRef, useEffect } from 'react'

/**
 * Formata número para string BRL (ex: 25.5 -> "25,50")
 */
function formatToBRL(value: number): string {
  if (value === 0) return ''
  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

/**
 * Extrai dígitos da string e converte para valor em reais (centavos / 100)
 */
function parseDigitsToValue(digits: string): number {
  if (!digits) return 0
  const cents = parseInt(digits, 10)
  if (isNaN(cents)) return 0
  return cents / 100
}

type CurrencyInputProps = {
  value: number
  onChange: (value: number) => void
  placeholder?: string
  className?: string
  required?: boolean
  autoFocus?: boolean
  id?: string
  disabled?: boolean
}

/**
 * Input de moeda BRL com máscara dinâmica e teclado numérico no mobile.
 * - inputMode="decimal" para teclado numérico nativo
 * - type="text" para evitar quebra da máscara no iOS/Android
 * - Formatação ao vivo: dígitos entram da direita (centavos primeiro)
 */
export default function CurrencyInput({
  value,
  onChange,
  placeholder = '0,00',
  className = '',
  required = false,
  autoFocus = false,
  id,
  disabled = false,
}: CurrencyInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const cursorRef = useRef<number | null>(null)

  const displayValue = formatToBRL(value)

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value
      const digits = raw.replace(/\D/g, '')
      const newValue = parseDigitsToValue(digits)
      onChange(newValue)
    },
    [onChange]
  )

  useEffect(() => {
    if (cursorRef.current !== null && inputRef.current) {
      inputRef.current.setSelectionRange(cursorRef.current, cursorRef.current)
      cursorRef.current = null
    }
  }, [displayValue])

  return (
    <input
      ref={inputRef}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      role="spinbutton"
      aria-valuemin={0}
      aria-valuenow={value}
      placeholder={placeholder}
      value={displayValue}
      onChange={handleChange}
      className={className}
      required={required}
      autoFocus={autoFocus}
      id={id}
      disabled={disabled}
    />
  )
}
