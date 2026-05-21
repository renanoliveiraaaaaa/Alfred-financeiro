import { createContext, useContext } from 'react';

export type Locale = 'pt' | 'en';

export const defaultLocale: Locale = 'pt';

export const locales: Locale[] = ['pt', 'en'];

export const I18nContext = createContext<{
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
}>({
  locale: defaultLocale,
  setLocale: () => {},
  t: (key) => key,
});

export function useI18n() {
  return useContext(I18nContext);
}
