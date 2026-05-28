import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createSupabaseServerClient } from '@/lib/supabaseServer'
import RoleBadge from '@/components/admin/RoleBadge'
import AdminEmptyState from '@/components/admin/AdminEmptyState'
import AdminUserActions from '@/components/admin/AdminUserActions'
import { getServerLocale, serverFormat, serverT } from '@/lib/serverI18n'
import type { Locale } from '@/lib/i18n'

function localeTag(locale: Locale) {
  return locale === 'en' ? 'en-US' : 'pt-BR'
}

function formatDate(iso: string, locale: Locale) {
  try {
    return new Intl.DateTimeFormat(localeTag(locale), {
      dateStyle: 'long',
      timeStyle: 'short',
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

function planLabel(plan: string | null | undefined, locale: Locale) {
  switch (plan) {
    case 'premium':
      return serverT('admin.plan.premium', locale)
    case 'business':
      return serverT('admin.plan.business', locale)
    case 'free':
    default:
      return serverT('admin.plan.free', locale)
  }
}

function subStatusLabel(s: string | null | undefined, locale: Locale) {
  switch (s) {
    case 'active':
      return serverT('admin.subStatus.active', locale)
    case 'past_due':
      return serverT('admin.subStatus.pastDue', locale)
    case 'canceled':
      return serverT('admin.subStatus.canceled', locale)
    case 'trial':
    default:
      return serverT('admin.subStatus.trial', locale)
  }
}

type PageProps = {
  params: { id: string }
}

export default async function AdminUserDetailPage({ params }: PageProps) {
  const locale = await getServerLocale()
  const supabase = createSupabaseServerClient()
  const {
    data: { user: viewer },
  } = await supabase.auth.getUser()

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', params.id)
    .maybeSingle()

  const { data: memberRows } = profile
    ? await supabase
        .from('organization_members')
        .select('organization_id, role')
        .eq('profile_id', profile.id)
    : { data: null }

  const orgIds = [...new Set(memberRows?.map((m) => m.organization_id) ?? [])]
  const { data: orgList } =
    orgIds.length > 0
      ? await supabase.from('organizations').select('*').in('id', orgIds)
      : { data: [] }

  const orgById = new Map((orgList ?? []).map((o) => [o.id, o]))

  const back = (
    <Link
      href="/admin/users"
      className="inline-flex items-center gap-2 text-sm font-medium text-muted transition-colors hover:text-main"
    >
      <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
      {serverT('admin.userDetail.back', locale)}
    </Link>
  )

  if (error) {
    return (
      <div className="p-4 lg:p-8">
        <div className="mb-6">{back}</div>
        <AdminEmptyState title={serverT('admin.userDetail.loadError', locale)} description={error.message} />
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="p-4 lg:p-8">
        <div className="mb-6">{back}</div>
        <AdminEmptyState
          title={serverT('admin.userDetail.notFound', locale)}
          description={serverT('admin.userDetail.notFoundDesc', locale)}
        />
      </div>
    )
  }

  const displayName = profile.full_name?.trim() || '—'
  const role = profile.role === 'admin' ? 'admin' : 'user'
  const subPlan = profile.subscription_plan ?? 'free'
  const subStatus = profile.subscription_status ?? 'trial'

  return (
    <div className="p-4 lg:p-8">
      <div className="mb-6">{back}</div>

      <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
        <div className="min-w-0 flex-1 space-y-8">
          <div className="rounded-xl border border-border bg-surface p-6 shadow-sm ring-1 ring-border/50">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-4">
              <div>
                <h1 className="text-xl font-semibold tracking-tight text-main lg:text-2xl">
                  {displayName}
                </h1>
                <p className="mt-1 text-sm text-muted">{serverT('admin.userDetail.clientDetail', locale)}</p>
              </div>
              <RoleBadge role={role} />
            </div>

            <dl className="mt-6 space-y-4 text-sm">
              <div>
                <dt className="font-medium text-muted">{serverT('admin.userDetail.fieldName', locale)}</dt>
                <dd className="mt-0.5 text-main">{displayName}</dd>
              </div>
              <div>
                <dt className="font-medium text-muted">{serverT('admin.userDetail.fieldId', locale)}</dt>
                <dd className="mt-0.5 break-all font-mono text-xs text-main">{profile.id}</dd>
              </div>
              <div>
                <dt className="font-medium text-muted">{serverT('admin.userDetail.fieldCreated', locale)}</dt>
                <dd className="mt-0.5 tabular-nums text-main">{formatDate(profile.created_at, locale)}</dd>
              </div>
              <div>
                <dt className="font-medium text-muted">{serverT('admin.userDetail.fieldPlan', locale)}</dt>
                <dd className="mt-0.5 text-main">
                  {planLabel(subPlan, locale)} — {subStatusLabel(subStatus, locale)}
                </dd>
              </div>
            </dl>
          </div>

          <section className="rounded-xl border border-border bg-surface p-6 shadow-sm ring-1 ring-border/50">
            <h2 className="text-lg font-semibold text-main">{serverT('admin.userDetail.orgsTitle', locale)}</h2>
            <p className="mt-1 text-sm text-muted">{serverT('admin.userDetail.orgsSubtitle', locale)}</p>

            {!memberRows?.length ? (
              <p className="mt-4 text-sm text-muted">{serverT('admin.userDetail.orgsEmpty', locale)}</p>
            ) : (
              <div className="mt-4 overflow-x-auto rounded-lg border border-border">
                <table className="w-full min-w-[320px] text-left text-xs sm:min-w-[520px] sm:text-sm">
                  <thead>
                    <tr className="border-b border-border bg-background/80">
                      <th className="px-3 py-2 font-semibold text-main">
                        {serverT('admin.userDetail.orgColName', locale)}
                      </th>
                      <th className="hidden px-3 py-2 font-semibold text-main md:table-cell">
                        {serverT('admin.userDetail.orgColSlug', locale)}
                      </th>
                      <th className="hidden px-3 py-2 font-semibold text-main sm:table-cell">
                        {serverT('admin.userDetail.orgColType', locale)}
                      </th>
                      <th className="px-3 py-2 font-semibold text-main">
                        {serverT('admin.userDetail.orgColRole', locale)}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {memberRows.map((row) => {
                      const org = orgById.get(row.organization_id)
                      if (!org) {
                        return (
                          <tr key={row.organization_id}>
                            <td colSpan={4} className="px-3 py-2 text-muted">
                              {serverFormat('admin.userDetail.orgMissing', locale, { id: row.organization_id })}
                            </td>
                          </tr>
                        )
                      }
                      const typeLabel =
                        org.type === 'personal'
                          ? serverT('admin.userDetail.orgTypePersonal', locale)
                          : serverT('admin.userDetail.orgTypeBusiness', locale)
                      return (
                        <tr key={row.organization_id}>
                          <td className="px-3 py-2 font-medium text-main">{org.name}</td>
                          <td className="hidden px-3 py-2 font-mono text-xs text-muted md:table-cell">{org.slug}</td>
                          <td className="hidden px-3 py-2 text-main sm:table-cell">{typeLabel}</td>
                          <td className="px-3 py-2">
                            <span className="rounded-md bg-background px-2 py-0.5 text-xs font-medium text-main">
                              {row.role}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>

        {viewer ? (
          <div className="w-full shrink-0 lg:w-auto">
            <AdminUserActions
              targetUserId={profile.id}
              initialRole={role}
              viewerId={viewer.id}
            />
          </div>
        ) : null}
      </div>
    </div>
  )
}
