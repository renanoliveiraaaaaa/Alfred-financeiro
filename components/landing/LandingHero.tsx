'use client'

import { useMemo } from 'react'
import Image from 'next/image'
import { useI18n } from '@/lib/i18n'

export default function LandingHero() {
  const { t } = useI18n()

  const bullets = useMemo(
    () => [
      { title: t('auth.hero.bullet1.title'), hint: t('auth.hero.bullet1.hint') },
      { title: t('auth.hero.bullet2.title'), hint: t('auth.hero.bullet2.hint') },
      { title: t('auth.hero.bullet3.title'), hint: t('auth.hero.bullet3.hint') },
    ],
    [t],
  )

  return (
    <div className="relative flex min-h-[42vh] flex-col justify-center overflow-hidden px-8 py-12 lg:min-h-0 lg:flex-1 lg:px-12 lg:py-16">
      <div
        className="pointer-events-none absolute -left-1/4 top-1/2 h-[min(120%,800px)] w-[min(120%,800px)] -translate-y-1/2 rounded-full bg-emerald-500/15 blur-[120px]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute bottom-0 right-0 h-64 w-64 translate-x-1/4 translate-y-1/4 rounded-full bg-amber-500/10 blur-[100px]"
        aria-hidden
      />

      <div className="relative z-10 mx-auto w-full max-w-lg space-y-10">
        <div className="animate-stagger-up">
          <div className="mb-8 flex items-center gap-4">
            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-white/5 shadow-lg ring-1 ring-white/10">
              <Image
                src="/apple-icon.svg"
                alt={t('auth.hero.brand')}
                width={64}
                height={64}
                className="h-full w-full object-contain p-2"
                priority
              />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-emerald-400/90">
                {t('auth.hero.brand')}
              </p>
              <p className="text-sm text-slate-400">{t('auth.hero.tagline')}</p>
            </div>
          </div>

          <h1 className="text-balance text-3xl font-semibold leading-tight tracking-tight text-white sm:text-4xl lg:text-[2.15rem] xl:text-4xl">
            {t('auth.hero.headline')}
          </h1>
        </div>

        <ul className="space-y-5">
          {bullets.map((item, i) => (
            <li
              key={item.title}
              className="animate-stagger-up"
              style={{ animationDelay: `${100 + i * 100}ms` }}
            >
              <div className="flex gap-4 rounded-xl border border-white/5 bg-white/[0.03] px-4 py-3.5 backdrop-blur-sm transition-colors hover:border-emerald-500/20 hover:bg-white/[0.05]">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-xs font-semibold text-emerald-300">
                  {i + 1}
                </span>
                <div>
                  <p className="font-medium text-slate-100">{item.title}</p>
                  <p className="mt-0.5 text-sm text-slate-400">{item.hint}</p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
