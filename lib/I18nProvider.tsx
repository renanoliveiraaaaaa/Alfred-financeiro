"use client";

import React, { useState, useMemo } from "react";
import { I18nContext, defaultLocale, locales, Locale } from "./i18n";

function loadMessages(locale: Locale) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const base = require(`../locales/${locale}.json`);
    let toast = {};
    let auth = {};
    try {
      toast = require(`../locales/toast-${locale}.json`);
    } catch {}
    try {
      auth = require(`../locales/auth-${locale}.json`);
    } catch {}
    return { ...base, ...toast, ...auth };
  } catch {
    return {};
  }
}

export default function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState<Locale>(defaultLocale);
  const [messages, setMessages] = useState(loadMessages(defaultLocale));

  const changeLocale = (newLocale: Locale) => {
    setLocale(newLocale);
    setMessages(loadMessages(newLocale));
  };

  const t = useMemo(
    () => (key: string) => messages[key] || key,
    [messages]
  );

  const value = useMemo(
    () => ({ locale, setLocale: changeLocale, t }),
    [locale, t]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
