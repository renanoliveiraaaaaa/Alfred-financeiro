import { cookies } from 'next/headers'
import type { Metadata } from 'next'
import { LOCALE_STORAGE_KEY } from '@/lib/I18nProvider'
import type { Locale } from '@/lib/i18n'
import pt from '@/locales/pt.json'
import en from '@/locales/en.json'
import ptAdmin from '@/locales/admin-pt.json'
import enAdmin from '@/locales/admin-en.json'
import { formatMessage } from '@/lib/i18nFormat'

const MESSAGES: Record<Locale, Record<string, string>> = {
  pt: { ...(pt as Record<string, string>), ...(ptAdmin as Record<string, string>) },
  en: { ...(en as Record<string, string>), ...(enAdmin as Record<string, string>) },
}

function resolveLocale(raw: string | undefined): Locale {
  if (raw === 'en') return 'en'
  return 'pt'
}

export async function getServerLocale(): Promise<Locale> {
  const cookieStore = await cookies()
  return resolveLocale(cookieStore.get(LOCALE_STORAGE_KEY)?.value)
}

export function serverT(key: string, locale: Locale): string {
  return MESSAGES[locale][key] ?? MESSAGES.pt[key] ?? key
}

export function serverFormat(
  key: string,
  locale: Locale,
  vars: Record<string, string | number> = {},
): string {
  return formatMessage(serverT(key, locale), vars)
}

export async function createPageMetadata(titleKey: string): Promise<Metadata> {
  const locale = await getServerLocale()
  return { title: serverT(titleKey, locale) }
}
