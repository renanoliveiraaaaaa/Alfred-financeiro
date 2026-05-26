'use client'

import Link from 'next/link'
import { createSupabaseClient } from '@/lib/supabaseClient'
import { Clock, LogOut, Mail } from 'lucide-react'
import { useI18n } from '@/lib/i18n'
import BillingCheckout from '@/components/billing/BillingCheckout'

const CONTACT_EMAIL = 'contato@alfredfinanceiro.com.br'

type Props = {
  stripeEnabled: boolean
}

export default function ExpiredPageClient({ stripeEnabled }: Props) {
  const supabase = createSupabaseClient()
  const { t } = useI18n()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-2xl text-center space-y-6">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-500/15 border border-amber-200 dark:border-amber-500/30">
          <Clock className="h-8 w-8 text-amber-600 dark:text-amber-400" />
        </div>

        <div>
          <h1 className="text-xl font-semibold text-main">{t('expired.title')}</h1>
          <p className="mt-3 text-sm text-muted leading-relaxed">
            {stripeEnabled ? t('expired.bodyCheckout') : t('expired.body')}
          </p>
        </div>

        <BillingCheckout stripeEnabled={stripeEnabled} />

        <div className="flex flex-col gap-3 justify-center pt-2">
          {!stripeEnabled && (
            <a
              href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent('Solicitação de acesso — Alfred — Assistente Financeiro')}`}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium bg-brand text-white hover:opacity-90 transition-colors min-h-[44px]"
            >
              <Mail className="h-4 w-4" />
              {t('expired.contact')}
            </a>
          )}
          {stripeEnabled && (
            <a
              href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent('Dúvida sobre planos — Alfred — Assistente Financeiro')}`}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium border border-border text-muted hover:bg-background transition-colors min-h-[44px]"
            >
              <Mail className="h-4 w-4" />
              {t('expired.contactPlans')}
            </a>
          )}
          <button
            onClick={handleLogout}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium border border-border text-muted hover:bg-background transition-colors min-h-[44px]"
          >
            <LogOut className="h-4 w-4" />
            {t('expired.logout')}
          </button>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium text-brand hover:underline min-h-[44px]"
          >
            {t('expired.home')}
          </Link>
        </div>
      </div>
    </div>
  )
}
