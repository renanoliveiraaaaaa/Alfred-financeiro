"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { I18nContext, defaultLocale, locales, type Locale } from "./i18n";

export const LOCALE_STORAGE_KEY = "alfred_locale";

function loadMessages(locale: Locale) {
  try {
    const bundles = [
      `../locales/${locale}.json`,
      `../locales/toast-${locale}.json`,
      `../locales/auth-${locale}.json`,
      `../locales/import-${locale}.json`,
      `../locales/modal-${locale}.json`,
      `../locales/onboarding-${locale}.json`,
      `../locales/errors-${locale}.json`,
      `../locales/security-${locale}.json`,
    ];
    let merged: Record<string, string> = {};
    for (const path of bundles) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        merged = { ...merged, ...require(path) };
      } catch {
        /* optional bundle */
      }
    }
    return merged;
  } catch {
    return {};
  }
}

function detectBrowserLocale(): Locale {
  if (typeof window === "undefined") return defaultLocale;
  const navLang =
    navigator.language?.toLowerCase() ||
    navigator.languages?.[0]?.toLowerCase() ||
    "";
  if (navLang.startsWith("en")) return "en";
  if (navLang.startsWith("pt")) return "pt";
  return defaultLocale;
}

export default function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(defaultLocale);
  const [messages, setMessages] = useState<Record<string, string>>(() =>
    loadMessages(defaultLocale),
  );
  const [ready, setReady] = useState(false);

  const applyLocale = useCallback((next: Locale) => {
    if (!locales.includes(next)) return;
    setLocaleState(next);
    setMessages(loadMessages(next));
    if (typeof document !== "undefined") {
      document.documentElement.lang = next === "en" ? "en" : "pt-BR";
    }
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    let initial = detectBrowserLocale();
    try {
      const saved = localStorage.getItem(LOCALE_STORAGE_KEY) as Locale | null;
      if (saved && locales.includes(saved)) initial = saved;
    } catch {
      /* ignore */
    }
    applyLocale(initial);
    setReady(true);
  }, [applyLocale]);

  const t = useMemo(
    () => (key: string) => messages[key] ?? key,
    [messages],
  );

  const value = useMemo(
    () => ({ locale, setLocale: applyLocale, t, ready }),
    [locale, applyLocale, t, ready],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export { useI18n } from "./i18n";
