import { cookies } from 'next/headers'
import { createSupabaseServerClient } from '@/lib/supabaseServer'

/** Cookie definido por `OrganizationSwitcher` (e alinhado com `butlerInsightServer`). */
export const ACTIVE_ORG_COOKIE_NAME = 'alfred.activeOrganizationId'

/**
 * Resolve a organização ativa do utilizador: cookie (se membro) ou org `personal` do owner.
 */
export async function resolveActiveOrganizationId(): Promise<
  { ok: true; organizationId: string } | { ok: false; error: string }
> {
  const supabase = createSupabaseServerClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return { ok: false, error: 'crud.error.auth' }
  }

  const cookieRaw = cookies().get(ACTIVE_ORG_COOKIE_NAME)?.value?.trim() ?? null

  if (cookieRaw) {
    const { data: membership } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('profile_id', user.id)
      .eq('organization_id', cookieRaw)
      .maybeSingle()

    if (membership?.organization_id) {
      return { ok: true, organizationId: membership.organization_id }
    }
  }

  const { data: personal } = await supabase
    .from('organizations')
    .select('id')
    .eq('owner_id', user.id)
    .eq('type', 'personal')
    .maybeSingle()

  if (!personal?.id) {
    return { ok: false, error: 'error.orgNotFound' }
  }

  return { ok: true, organizationId: personal.id }
}

export type OrganizationRole = 'owner' | 'admin' | 'member'

export type ActiveOrganizationContext = {
  organizationId: string
  type: 'personal' | 'business'
  role: OrganizationRole
}

/** Org ativa + tipo + role (server actions / equipa business). */
export async function resolveActiveOrganizationContext(): Promise<
  { ok: true; context: ActiveOrganizationContext } | { ok: false; error: string }
> {
  const orgRes = await resolveActiveOrganizationId()
  if (!orgRes.ok) return orgRes

  const supabase = createSupabaseServerClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) return { ok: false, error: 'crud.error.auth' }

  const { data, error } = await supabase
    .from('organization_members')
    .select('role, organizations(type)')
    .eq('organization_id', orgRes.organizationId)
    .eq('profile_id', user.id)
    .maybeSingle()

  if (error || !data?.role) {
    return { ok: false, error: 'error.orgNotFound' }
  }

  const orgType = (data as { organizations?: { type?: 'personal' | 'business' } }).organizations?.type
  if (!orgType) {
    return { ok: false, error: 'error.orgNotFound' }
  }

  return {
    ok: true,
    context: {
      organizationId: orgRes.organizationId,
      type: orgType,
      role: data.role as OrganizationRole,
    },
  }
}
