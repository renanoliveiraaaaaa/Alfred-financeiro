'use server'

import { createSupabaseServerClient } from '@/lib/supabaseServer'

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
    return { ok: false, error: 'Indique um nome com pelo menos 2 caracteres.' }
  }
  if (trimmed.length > 120) {
    return { ok: false, error: 'Nome demasiado longo.' }
  }

  const supabase = createSupabaseServerClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return { ok: false, error: 'Sessão inválida. Inicie sessão novamente.' }
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
        return { ok: false, error: memErr.message }
      }

      return { ok: true, organizationId: org.id }
    }

    if (orgErr?.message?.includes('duplicate') || orgErr?.code === '23505') {
      slug = `${base}-${crypto.randomUUID().slice(0, 8)}`
      continue
    }

    return { ok: false, error: orgErr?.message ?? 'Não foi possível criar a organização.' }
  }

  return { ok: false, error: 'Não foi possível gerar um identificador único. Tente outro nome.' }
}
