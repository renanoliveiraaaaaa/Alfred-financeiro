export type CustomTheme = {
  brand?: string
  background?: string
  surface?: string
  fontFamily?: string
}

export const DEFAULT_CUSTOM_THEME: CustomTheme = {
  brand: '#2563eb',
  background: '#f8fafc',
  surface: '#ffffff',
  fontFamily: 'inherit',
}

export function parseCustomTheme(raw: unknown): CustomTheme | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const theme: CustomTheme = {}
  if (typeof o.brand === 'string' && o.brand) theme.brand = o.brand
  if (typeof o.background === 'string' && o.background) theme.background = o.background
  if (typeof o.surface === 'string' && o.surface) theme.surface = o.surface
  if (typeof o.fontFamily === 'string' && o.fontFamily) theme.fontFamily = o.fontFamily
  return Object.keys(theme).length > 0 ? theme : null
}

export function applyCustomTheme(theme: CustomTheme | null) {
  const html = document.documentElement
  const keys: (keyof CustomTheme)[] = ['brand', 'background', 'surface', 'fontFamily']
  keys.forEach((k) => html.style.removeProperty(k === 'fontFamily' ? 'font-family' : `--${k}`))

  if (!theme) return

  if (theme.brand) html.style.setProperty('--brand', theme.brand)
  if (theme.background) html.style.setProperty('--background', theme.background)
  if (theme.surface) html.style.setProperty('--surface', theme.surface)
  if (theme.fontFamily) html.style.setProperty('font-family', theme.fontFamily)
}

export function clearCustomTheme() {
  applyCustomTheme(null)
}

export const FONT_OPTIONS = [
  { value: 'inherit', label: 'Padrão do sistema' },
  { value: 'Georgia, serif', label: 'Georgia (serif)' },
  { value: '"Palatino Linotype", Palatino, serif', label: 'Palatino' },
  { value: 'system-ui, sans-serif', label: 'System UI' },
  { value: '"Courier New", monospace', label: 'Courier (mono)' },
]
