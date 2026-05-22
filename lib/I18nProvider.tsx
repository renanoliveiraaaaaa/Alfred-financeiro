"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { I18nContext, defaultLocale, locales, type Locale } from "./i18n";

import ptBase from "@/locales/pt.json";
import enBase from "@/locales/en.json";
import ptToast from "@/locales/toast-pt.json";
import enToast from "@/locales/toast-en.json";
import ptAuth from "@/locales/auth-pt.json";
import enAuth from "@/locales/auth-en.json";
import ptImport from "@/locales/import-pt.json";
import enImport from "@/locales/import-en.json";
import ptModal from "@/locales/modal-pt.json";
import enModal from "@/locales/modal-en.json";
import ptOnboarding from "@/locales/onboarding-pt.json";
import enOnboarding from "@/locales/onboarding-en.json";
import ptErrors from "@/locales/errors-pt.json";
import enErrors from "@/locales/errors-en.json";
import ptSecurity from "@/locales/security-pt.json";
import enSecurity from "@/locales/security-en.json";
import ptApp from "@/locales/app-pt.json";
import enApp from "@/locales/app-en.json";

export const LOCALE_STORAGE_KEY = "alfred_locale";

const MESSAGES: Record<Locale, Record<string, string>> = {
  pt: {
    ...ptBase,
    ...ptToast,
    ...ptAuth,
    ...ptImport,
    ...ptModal,
    ...ptOnboarding,
    ...ptErrors,
    ...ptSecurity,
    ...ptApp,
  },
  en: {
    ...enBase,
    ...enToast,
    ...enAuth,
    ...enImport,
    ...enModal,
    ...enOnboarding,
    ...enErrors,
    ...enSecurity,
    ...enApp,
  },
};

function loadMessages(locale: Locale): Record<string, string> {
  return MESSAGES[locale] ?? MESSAGES.pt;
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
  }, [applyLocale]);

  const t = useMemo(
    () => (key: string) => messages[key] ?? key,
    [messages],
  );

  const value = useMemo(
    () => ({ locale, setLocale: applyLocale, t, ready: true }),
    [locale, applyLocale, t],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export { useI18n } from "./i18n";
