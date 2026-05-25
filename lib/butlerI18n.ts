import ptButler from '@/locales/butler-pt.json'
import enButler from '@/locales/butler-en.json'
import type { Locale } from './i18n'
import { formatMessage } from './i18nFormat'

const MESSAGES: Record<Locale, Record<string, string>> = {
  pt: ptButler as Record<string, string>,
  en: enButler as Record<string, string>,
}

export function butlerT(key: string, locale: Locale = 'pt'): string {
  return MESSAGES[locale][key] ?? MESSAGES.pt[key] ?? key
}

export function butlerFormat(
  key: string,
  locale: Locale,
  vars: Record<string, string | number> = {},
): string {
  return formatMessage(butlerT(key, locale), vars)
}
