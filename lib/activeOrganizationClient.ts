import type { SupabaseClient } from '@supabase/supabase-js'

/** Alinhado com `OrganizationSwitcher` e `ACTIVE_ORG_COOKIE_NAME`. */
const STORAGE_KEY = 'alfred.activeOrganizationId'

/**
 * Resolve a org ativa no browser (localStorage + validação de membership, ou org pessoal).
 */
export async function resolveActiveOrganizationIdForClient(
  supabase: SupabaseClient,
  userId: string,
): Promise<string | null> {
  if (typeof window === 'undefined') return null

  const stored = window.localStorage.getItem(STORAGE_KEY)?.trim() ?? ''
  if (stored) {
    const { data } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('profile_id', userId)
      .eq('organization_id', stored)
      .maybeSingle()
    if (data?.organization_id) return data.organization_id
  }

  const { data: org } = await supabase
    .from('organizations')
    .select('id')
    .eq('owner_id', userId)
    .eq('type', 'personal')
    .maybeSingle()

  return org?.id ?? null
}
