'use server'

import { revalidatePath } from 'next/cache'
import { resolveActiveOrganizationContext } from '@/lib/activeOrganizationServer'
import { createSupabaseServerClient } from '@/lib/supabaseServer'
import { sendEmail, buildOrgInviteHtml } from '@/lib/email'
import { buildServerI18nError } from '@/lib/serverErrorI18n'

export type OrgTeamMember = {
  profileId: string
  fullName: string | null
  role: 'owner' | 'admin' | 'member'
}

export type OrgPendingInvite = {
  id: string
  email: string
  role: 'admin' | 'member'
  expiresAt: string
}

type TeamOk = { ok: true }
type Fail = { ok: false; error: string }

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

async function requireBusinessOrgAdmin(): Promise<
  | { ok: true; organizationId: string; userId: string }
  | Fail
> {
  const ctxRes = await resolveActiveOrganizationContext()
  if (!ctxRes.ok) return ctxRes

  const { context } = ctxRes
  if (context.type !== 'business') {
    return { ok: false, error: 'org.team.error.businessOnly' }
  }
  if (context.role !== 'owner' && context.role !== 'admin') {
    return { ok: false, error: 'org.team.error.forbidden' }
  }

  const supabase = createSupabaseServerClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) return { ok: false, error: 'error.unauthorized' }

  return { ok: true, organizationId: context.organizationId, userId: user.id }
}

export async function listOrgTeam(): Promise<
  | (TeamOk & { members: OrgTeamMember[]; invites: OrgPendingInvite[]; orgName: string })
  | Fail
> {
  const gate = await requireBusinessOrgAdmin()
  if (!gate.ok) return gate

  const supabase = createSupabaseServerClient()
  const { organizationId } = gate

  const [membersRes, invitesRes, orgRes] = await Promise.all([
    supabase
      .from('organization_members')
      .select('profile_id, role, profiles(full_name)')
      .eq('organization_id', organizationId)
      .order('role', { ascending: true }),
    supabase
      .from('organization_invites')
      .select('id, email, role, expires_at')
      .eq('organization_id', organizationId)
      .is('accepted_at', null)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false }),
    supabase.from('organizations').select('name').eq('id', organizationId).maybeSingle(),
  ])

  if (membersRes.error) {
    return {
      ok: false,
      error: buildServerI18nError('org.team.error.loadMembers', { detail: membersRes.error.message }),
    }
  }
  if (invitesRes.error) {
    return {
      ok: false,
      error: buildServerI18nError('org.team.error.loadInvites', { detail: invitesRes.error.message }),
    }
  }

  const members: OrgTeamMember[] = (membersRes.data ?? []).map((row) => {
    const profile = row.profiles as { full_name?: string | null } | null
    return {
      profileId: row.profile_id,
      fullName: profile?.full_name ?? null,
      role: row.role as OrgTeamMember['role'],
    }
  })

  const invites: OrgPendingInvite[] = (invitesRes.data ?? []).map((row) => ({
    id: row.id,
    email: row.email,
    role: row.role as OrgPendingInvite['role'],
    expiresAt: row.expires_at,
  }))

  return { ok: true, members, invites, orgName: orgRes.data?.name ?? '' }
}

export async function createOrgInvite(
  email: string,
  role: 'admin' | 'member',
): Promise<(TeamOk & { emailSent: boolean }) | Fail> {
  const gate = await requireBusinessOrgAdmin()
  if (!gate.ok) return gate

  const normalized = email.trim().toLowerCase()
  if (!isValidEmail(normalized)) {
    return { ok: false, error: 'org.team.error.emailInvalid' }
  }

  const supabase = createSupabaseServerClient()
  const { organizationId, userId } = gate

  const { data: org } = await supabase
    .from('organizations')
    .select('name')
    .eq('id', organizationId)
    .maybeSingle()

  const { data: invite, error: insertErr } = await supabase
    .from('organization_invites')
    .insert({
      organization_id: organizationId,
      email: normalized,
      role,
      invited_by: userId,
    })
    .select('token')
    .single()

  if (insertErr || !invite?.token) {
    const duplicate = insertErr?.code === '23505'
    if (duplicate) {
      return { ok: false, error: 'org.team.error.invitePending' }
    }
    return {
      ok: false,
      error: buildServerI18nError('org.team.error.inviteFailed', { detail: insertErr?.message ?? '' }),
    }
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const inviteUrl = `${appUrl.replace(/\/$/, '')}/invite/${invite.token}`
  const orgName = org?.name?.trim() || 'Business'

  const emailRes = await sendEmail({
    to: normalized,
    subject: `Convite — ${orgName} (Alfred Financeiro)`,
    html: buildOrgInviteHtml({ orgName, inviteUrl, role, locale: 'pt' }),
    text: `Foi convidado para ${orgName}. Aceite em: ${inviteUrl}`,
  })

  revalidatePath('/settings')
  return { ok: true, emailSent: emailRes.ok && !emailRes.stub }
}

export async function cancelOrgInvite(inviteId: string): Promise<TeamOk | Fail> {
  const gate = await requireBusinessOrgAdmin()
  if (!gate.ok) return gate

  const supabase = createSupabaseServerClient()
  const { error } = await supabase
    .from('organization_invites')
    .delete()
    .eq('id', inviteId)
    .eq('organization_id', gate.organizationId)
    .is('accepted_at', null)

  if (error) {
    return {
      ok: false,
      error: buildServerI18nError('org.team.error.cancelFailed', { detail: error.message }),
    }
  }

  revalidatePath('/settings')
  return { ok: true }
}

export async function removeOrgMember(profileId: string): Promise<TeamOk | Fail> {
  const gate = await requireBusinessOrgAdmin()
  if (!gate.ok) return gate

  if (profileId === gate.userId) {
    return { ok: false, error: 'org.team.error.cannotRemoveSelf' }
  }

  const supabase = createSupabaseServerClient()
  const { error } = await supabase
    .from('organization_members')
    .delete()
    .eq('organization_id', gate.organizationId)
    .eq('profile_id', profileId)
    .neq('role', 'owner')

  if (error) {
    return {
      ok: false,
      error: buildServerI18nError('org.team.error.removeFailed', { detail: error.message }),
    }
  }

  revalidatePath('/settings')
  return { ok: true }
}

export async function acceptOrganizationInvite(
  token: string,
): Promise<(TeamOk & { organizationId: string }) | Fail> {
  const trimmed = token.trim()
  if (!trimmed) {
    return { ok: false, error: 'org.invite.error.invalid' }
  }

  const supabase = createSupabaseServerClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return { ok: false, error: 'org.invite.error.authRequired' }
  }

  const { data, error } = await supabase.rpc('accept_organization_invite', {
    p_token: trimmed,
  })

  if (error) {
    const msg = error.message ?? ''
    if (msg.includes('invite_email_mismatch')) {
      return { ok: false, error: 'org.invite.error.emailMismatch' }
    }
    if (msg.includes('invite_no_email')) {
      return { ok: false, error: 'org.invite.error.noEmail' }
    }
    return { ok: false, error: 'org.invite.error.invalid' }
  }

  if (!data) {
    return { ok: false, error: 'org.invite.error.invalid' }
  }

  revalidatePath('/settings')
  revalidatePath('/dashboard')
  return { ok: true, organizationId: data as string }
}
