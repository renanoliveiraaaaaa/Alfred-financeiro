import type { SupabaseClient } from '@supabase/supabase-js'
import { ACTIVE_ORG_CHANGE_EVENT } from '@/lib/useActiveOrganizationRevision'

/** Alinhado com `OrganizationSwitcher` e `ACTIVE_ORG_COOKIE_NAME`. */
const STORAGE_KEY = 'alfred.activeOrganizationId'
const COOKIE_NAME = 'alfred.activeOrganizationId'

export type OrganizationRole = 'owner' | 'admin' | 'member'

export type ActiveOrganizationContext = {
  organizationId: string
  type: 'personal' | 'business'
  role: OrganizationRole
}

/**
 * Persiste org ativa no browser (localStorage + cookie) e notifica listeners.
 */
export function persistActiveOrganizationId(organizationId: string) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, organizationId)
  const maxAge = 60 * 60 * 24 * 365
  document.cookie = `${COOKIE_NAME}=${encodeURIComponent(organizationId)};path=/;max-age=${maxAge};SameSite=Lax`
  window.dispatchEvent(new CustomEvent(ACTIVE_ORG_CHANGE_EVENT))
}

/**
 * Resolve a org ativa no browser (localStorage + validação de membership, ou org pessoal).
 */
export async function resolveActiveOrganizationIdForClient(
  supabase: SupabaseClient,
  userId: string,
): Promise<string | null> {
  const ctx = await resolveActiveOrganizationContextForClient(supabase, userId)
  return ctx?.organizationId ?? null
}

/**
 * Org ativa + tipo + role do utilizador (para equipa business, etc.).
 */
export async function resolveActiveOrganizationContextForClient(
  supabase: SupabaseClient,
  userId: string,
): Promise<ActiveOrganizationContext | null> {
  if (typeof window === 'undefined') return null

  const stored = window.localStorage.getItem(STORAGE_KEY)?.trim() ?? ''
  if (stored) {
    const { data } = await supabase
      .from('organization_members')
      .select('organization_id, role, organizations(type)')
      .eq('profile_id', userId)
      .eq('organization_id', stored)
      .maybeSingle()

    const orgType = (data as { organizations?: { type?: 'personal' | 'business' } } | null)
      ?.organizations?.type
    if (data?.organization_id && orgType) {
      return {
        organizationId: data.organization_id,
        type: orgType,
        role: data.role as OrganizationRole,
      }
    }
  }

  const { data: org } = await supabase
    .from('organizations')
    .select('id, type')
    .eq('owner_id', userId)
    .eq('type', 'personal')
    .maybeSingle()

  if (!org?.id) return null

  return {
    organizationId: org.id,
    type: org.type as 'personal' | 'business',
    role: 'owner',
  }
}
