'use server'

import { createSupabaseServerClient } from '@/lib/supabaseServer'
import { buildServerI18nError } from '@/lib/serverErrorI18n'

export type CreateBusinessOrgResult =
  | { ok: true; organizationId: string }
  | { ok: false; error: string }

function slugifyBase(name: string): string {
  const t = name
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
  return t || 'empresa'
}

export async function createBusinessOrganization(companyName: string): Promise<CreateBusinessOrgResult> {
  const trimmed = companyName.trim()
  if (trimmed.length < 2) {
    return { ok: false, error: 'org.error.nameShort' }
  }
  if (trimmed.length > 120) {
    return { ok: false, error: 'org.error.nameLong' }
  }

  const supabase = createSupabaseServerClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return { ok: false, error: 'error.unauthorized' }
  }

  const base = slugifyBase(trimmed)
  const suffix = crypto.randomUUID().slice(0, 8)
  let slug = `${base}-${suffix}`

  for (let attempt = 0; attempt < 5; attempt++) {
    const { data: org, error: orgErr } = await supabase
      .from('organizations')
      .insert({
        owner_id: user.id,
        name: trimmed,
        slug,
        type: 'business',
      })
      .select('id')
      .single()

    if (!orgErr && org?.id) {
      const { error: memErr } = await supabase.from('organization_members').insert({
        organization_id: org.id,
        profile_id: user.id,
        role: 'owner',
      })

      if (memErr) {
        await supabase.from('organizations').delete().eq('id', org.id)
        return {
          ok: false,
          error: buildServerI18nError('org.error.memberFailed', { detail: memErr.message }),
        }
      }

      return { ok: true, organizationId: org.id }
    }

    if (orgErr?.message?.includes('duplicate') || orgErr?.code === '23505') {
      slug = `${base}-${crypto.randomUUID().slice(0, 8)}`
      continue
    }

    return {
      ok: false,
      error: buildServerI18nError('org.error.createFailed', { detail: orgErr?.message ?? '' }),
    }
  }

  return { ok: false, error: 'org.error.slugFailed' }
}
