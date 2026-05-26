import { createClient } from '@supabase/supabase-js'

/** Cliente service-role sem generic estrito (evita `never` em updates parciais). */
export function createSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY em falta')
  }
  return createClient(url, key, { auth: { persistSession: false } })
}
