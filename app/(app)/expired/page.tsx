'use client'

import Link from 'next/link'
import { createSupabaseClient } from '@/lib/supabaseClient'
import { Clock, LogOut } from 'lucide-react'

export default function ExpiredPage() {
  const supabase = createSupabaseClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa] dark:bg-manor-950 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md text-center space-y-6">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-500/15 border border-amber-200 dark:border-amber-500/30">
          <Clock className="h-8 w-8 text-amber-600 dark:text-amber-400" />
        </div>

        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
            O seu período de teste expirou
          </h1>
          <p className="mt-3 text-sm text-gray-600 dark:text-manor-400 leading-relaxed">
            Como estamos numa fase Beta fechada, por favor contacte o administrador para estender o seu acesso.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <button
            onClick={handleLogout}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium border border-gray-300 dark:border-manor-700 text-gray-600 dark:text-manor-400 hover:bg-gray-100 dark:hover:bg-manor-800 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Encerrar sessão
          </button>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium bg-gold-600 dark:bg-gold-500 text-white dark:text-manor-950 hover:bg-gold-500 dark:hover:bg-gold-400 transition-colors"
          >
            Voltar ao início
          </Link>
        </div>
      </div>
    </div>
  )
}
