'use client'

import { DEFAULT_CUSTOM_THEME, FONT_OPTIONS, type CustomTheme } from '@/lib/customTheme'
import { useI18n } from '@/lib/i18n'

type Props = {
  value: CustomTheme | null
  onChange: (theme: CustomTheme | null) => void
}

export default function CustomThemeEditor({ value, onChange }: Props) {
  const { t } = useI18n()
  const theme = value ?? DEFAULT_CUSTOM_THEME

  const update = (patch: Partial<CustomTheme>) => {
    onChange({ ...DEFAULT_CUSTOM_THEME, ...value, ...patch })
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-medium text-main">{t('profile.customTheme')}</p>
        <p className="text-xs text-muted mt-0.5">{t('profile.customTheme.desc')}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {([
          ['brand', 'Brand'],
          ['background', 'Background'],
          ['surface', 'Surface'],
        ] as const).map(([key, label]) => (
          <div key={key}>
            <label className="block text-xs font-medium text-muted mb-1.5">{label}</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={theme[key] ?? DEFAULT_CUSTOM_THEME[key]}
                onChange={(e) => update({ [key]: e.target.value })}
                className="h-10 w-12 rounded border border-border cursor-pointer"
                aria-label={label}
              />
              <input
                type="text"
                value={theme[key] ?? ''}
                onChange={(e) => update({ [key]: e.target.value })}
                className="flex-1 rounded-lg border border-border bg-background px-2 py-1.5 text-xs font-mono text-main"
              />
            </div>
          </div>
        ))}
      </div>

      <div>
        <label htmlFor="custom-font" className="block text-xs font-medium text-muted mb-1.5">
          Font
        </label>
        <select
          id="custom-font"
          value={theme.fontFamily ?? 'inherit'}
          onChange={(e) => update({ fontFamily: e.target.value })}
          className="block w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-main"
        >
          {FONT_OPTIONS.map((f) => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onChange({ ...DEFAULT_CUSTOM_THEME })}
          className="text-xs font-medium text-brand hover:opacity-80"
        >
          {t('dashboard.customize.reset')}
        </button>
        <button
          type="button"
          onClick={() => onChange(null)}
          className="text-xs font-medium text-muted hover:text-main"
        >
          {t('dashboard.customize.hidden')}
        </button>
      </div>
    </div>
  )
}
