'use client'

import { useCallback, useEffect, useState } from 'react'
import { Loader2, Mail, Trash2, UserMinus, Users } from 'lucide-react'
import { createSupabaseClient } from '@/lib/supabaseClient'
import { resolveActiveOrganizationContextForClient } from '@/lib/activeOrganizationClient'
import { useActiveOrganizationRevision } from '@/lib/useActiveOrganizationRevision'
import { useI18n } from '@/lib/i18n'
import { formatMessage } from '@/lib/i18nFormat'
import { useToast } from '@/lib/toastContext'
import { resolveServerError } from '@/lib/serverErrorI18n'
import {
  cancelOrgInvite,
  createOrgInvite,
  listOrgTeam,
  removeOrgMember,
  type OrgPendingInvite,
  type OrgTeamMember,
} from '@/lib/actions/org-team'

export default function OrgTeamSection() {
  const supabase = createSupabaseClient()
  const orgRevision = useActiveOrganizationRevision()
  const { t } = useI18n()
  const { toast, toastError } = useToast()

  const [visible, setVisible] = useState(false)
  const [loading, setLoading] = useState(true)
  const [members, setMembers] = useState<OrgTeamMember[]>([])
  const [invites, setInvites] = useState<OrgPendingInvite[]>([])
  const [orgName, setOrgName] = useState('')

  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'member' | 'admin'>('member')
  const [inviting, setInviting] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data: auth } = await supabase.auth.getUser()
      const uid = auth.user?.id
      if (!uid) {
        setVisible(false)
        return
      }

      const ctx = await resolveActiveOrganizationContextForClient(supabase, uid)
      const canManage =
        ctx?.type === 'business' && (ctx.role === 'owner' || ctx.role === 'admin')
      setVisible(Boolean(canManage))
      if (!canManage) return

      const res = await listOrgTeam()
      if (!res.ok) {
        toastError(resolveServerError(res.error, t))
        return
      }

      setMembers(res.members)
      setInvites(res.invites)
      setOrgName(res.orgName)
    } finally {
      setLoading(false)
    }
  }, [supabase, t, toastError])

  useEffect(() => {
    load()
  }, [load, orgRevision])

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    setInviting(true)
    try {
      const res = await createOrgInvite(inviteEmail, inviteRole)
      if (!res.ok) {
        toastError(resolveServerError(res.error, t))
        return
      }
      setInviteEmail('')
      toast(
        res.emailSent ? t('org.team.success.invited') : t('org.team.success.invitedStub'),
      )
      await load()
    } finally {
      setInviting(false)
    }
  }

  const handleCancelInvite = async (id: string) => {
    setBusyId(id)
    try {
      const res = await cancelOrgInvite(id)
      if (!res.ok) {
        toastError(resolveServerError(res.error, t))
        return
      }
      toast(t('org.team.success.inviteCancelled'))
      await load()
    } finally {
      setBusyId(null)
    }
  }

  const handleRemoveMember = async (profileId: string) => {
    setBusyId(profileId)
    try {
      const res = await removeOrgMember(profileId)
      if (!res.ok) {
        toastError(resolveServerError(res.error, t))
        return
      }
      toast(t('org.team.success.memberRemoved'))
      await load()
    } finally {
      setBusyId(null)
    }
  }

  if (!visible) return null

  const roleLabel = (role: string) => {
    if (role === 'owner') return t('org.team.role.owner')
    if (role === 'admin') return t('org.team.role.admin')
    return t('org.team.role.member')
  }

  return (
    <div className="rounded-xl border border-border bg-surface shadow-sm glass-card">
      <div className="border-b border-border px-6 py-4 flex items-center gap-2">
        <Users className="h-4 w-4 text-muted" aria-hidden />
        <div>
          <h2 className="text-sm font-semibold text-main">{t('org.team.title')}</h2>
          <p className="text-xs text-muted mt-0.5">
            {formatMessage(t('org.team.subtitle'), {
              name: orgName || t('org.businessDefault'),
            })}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="px-6 py-8 flex justify-center text-muted">
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
        </div>
      ) : (
        <div className="px-6 py-4 space-y-6">
          <form onSubmit={handleInvite} className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 flex flex-col sm:flex-row gap-2">
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder={t('org.team.emailPlaceholder')}
                className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-main"
                required
              />
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as 'member' | 'admin')}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-main"
              >
                <option value="member">{t('org.team.role.member')}</option>
                <option value="admin">{t('org.team.role.admin')}</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={inviting}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90 disabled:opacity-50"
            >
              {inviting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
              {t('org.team.invite')}
            </button>
          </form>

          {invites.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted mb-2">
                {t('org.team.pendingInvites')}
              </h3>
              <ul className="space-y-2">
                {invites.map((inv) => (
                  <li
                    key={inv.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm"
                  >
                    <span className="text-main truncate">{inv.email}</span>
                    <span className="text-xs text-muted shrink-0">{roleLabel(inv.role)}</span>
                    <button
                      type="button"
                      disabled={busyId === inv.id}
                      onClick={() => handleCancelInvite(inv.id)}
                      className="text-muted hover:text-red-500 shrink-0"
                      title={t('org.team.cancelInvite')}
                    >
                      {busyId === inv.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted mb-2">
              {t('org.team.members')}
            </h3>
            <ul className="space-y-2">
              {members.map((m) => (
                <li
                  key={m.profileId}
                  className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm"
                >
                  <span className="text-main truncate">
                    {m.fullName?.trim() || t('org.team.unnamed')}
                  </span>
                  <span className="text-xs text-muted shrink-0">{roleLabel(m.role)}</span>
                  {m.role !== 'owner' && (
                    <button
                      type="button"
                      disabled={busyId === m.profileId}
                      onClick={() => handleRemoveMember(m.profileId)}
                      className="text-muted hover:text-red-500 shrink-0"
                      title={t('org.team.removeMember')}
                    >
                      {busyId === m.profileId ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <UserMinus className="h-4 w-4" />
                      )}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}
