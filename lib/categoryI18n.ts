export const DEFAULT_CATEGORY_KEYS = [
  'mercado',
  'alimentacao',
  'compras',
  'transporte',
  'combustivel',
  'veiculo',
  'assinaturas',
  'saude',
  'educacao',
  'lazer',
  'moradia',
  'fatura_cartao',
  'outros',
] as const

export const PAYMENT_METHOD_KEYS = [
  'pix',
  'debito',
  'credito',
  'especie',
  'credito_parcelado',
] as const

export type PaymentMethodKey = (typeof PAYMENT_METHOD_KEYS)[number]

export function getCategoryLabel(t: (key: string) => string, key: string): string {
  const localeKey = `category.${key}`
  const translated = t(localeKey)
  return translated === localeKey ? key : translated
}

export function getPaymentLabel(t: (key: string) => string, key: string): string {
  const localeKey = `payment.${key}`
  const translated = t(localeKey)
  return translated === localeKey ? key : translated
}

export function buildDefaultCategories(t: (key: string) => string) {
  return DEFAULT_CATEGORY_KEYS.map((value) => ({
    value,
    label: getCategoryLabel(t, value),
  }))
}

export function buildPaymentMethods(t: (key: string) => string) {
  return PAYMENT_METHOD_KEYS.map((value) => ({
    value,
    label: getPaymentLabel(t, value),
  }))
}

export function buildCategoryLabelsMap(t: (key: string) => string): Record<string, string> {
  const map: Record<string, string> = {}
  for (const key of DEFAULT_CATEGORY_KEYS) {
    map[key] = getCategoryLabel(t, key)
  }
  return map
}

export function buildPaymentLabelsMap(t: (key: string) => string): Record<string, string> {
  const map: Record<string, string> = {}
  for (const key of PAYMENT_METHOD_KEYS) {
    map[key] = getPaymentLabel(t, key)
  }
  return map
}
