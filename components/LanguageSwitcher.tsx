"use client";

import { useI18n, locales } from "@/lib/i18n";

export default function LanguageSwitcher() {
  const { locale, setLocale } = useI18n();

  return (
    <div className="flex items-center gap-2">
      {locales.map((lng) => (
        <button
          key={lng}
          onClick={() => setLocale(lng)}
          className={`px-2 py-1 rounded text-xs font-medium border transition-colors ${
            locale === lng
              ? "bg-brand text-white border-brand"
              : "bg-background text-muted border-border hover:text-main hover:border-brand"
          }`}
          aria-pressed={locale === lng}
        >
          {lng === "pt" ? "Português" : "English"}
        </button>
      ))}
    </div>
  );
}
