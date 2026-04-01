'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Building2, ChevronDown, User } from 'lucide-react'
import { createSupabaseClient } from '@/lib/supabaseClient'
import { ACTIVE_ORG_CHANGE_EVENT } from '@/lib/useActiveOrganizationRevision'

const STORAGE_KEY = 'alfred.activeOrganizationId'
const COOKIE_NAME = 'alfred.activeOrganizationId'

function setOrgCookie(id: string) {
  if (typeof document === 'undefined') return
  const maxAge = 60 * 60 * 24 * 365
  document.cookie = `${COOKIE_NAME}=${encodeURIComponent(id)};path=/;max-age=${maxAge};SameSite=Lax`
}

type OrgRow = {
  id: string
  name: string
  type: 'personal' | 'business'
}

export default function OrganizationSwitcher() {
  const router = useRouter()
  const supabase = createSupabaseClient()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [orgs, setOrgs] = useState<OrgRow[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [displayName, setDisplayName] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        setOrgs([])
        setLoading(false)
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .maybeSingle()

      const name = profile?.full_name?.trim()
      setDisplayName(name || 'Conta')

      const { data: links } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('profile_id', user.id)

      const ids = [...new Set(links?.map((l) => l.organization_id) ?? [])]
      if (ids.length === 0) {
        setOrgs([])
        setLoading(false)
        return
      }

      const { data: orgRows } = await supabase
        .from('organizations')
        .select('id, name, type')
        .in('id', ids)

      const list = (orgRows ?? []) as OrgRow[]
      list.sort((a, b) => {
        if (a.type === b.type) return a.name.localeCompare(b.name)
        return a.type === 'personal' ? -1 : 1
      })
      setOrgs(list)

      const stored =
        typeof window !== 'undefined' ? window.localStorage.getItem(STORAGE_KEY) : null
      const valid = stored && list.some((o) => o.id === stored)
      const personal = list.find((o) => o.type === 'personal')
      const nextId = valid ? stored! : personal?.id ?? list[0]?.id ?? null
      setActiveId(nextId)
      if (nextId && typeof window !== 'undefined') {
        window.localStorage.setItem(STORAGE_KEY, nextId)
        setOrgCookie(nextId)
      }
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    load()
  }, [load])

  const personalOrg = useMemo(() => orgs.find((o) => o.type === 'personal'), [orgs])
  const businessOrgs = useMemo(() => orgs.filter((o) => o.type === 'business'), [orgs])

  const selectOrg = (id: string) => {
    setActiveId(id)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, id)
      setOrgCookie(id)
      window.dispatchEvent(new CustomEvent(ACTIVE_ORG_CHANGE_EVENT, { detail: { organizationId: id } }))
      router.refresh()
    }
    setOpen(false)
  }

  const activeLabel = useMemo(() => {
    const o = orgs.find((x) => x.id === activeId)
    if (!o) return 'Contexto'
    if (o.type === 'personal') return 'Minhas Finanças'
    return o.name || 'Empresa'
  }, [orgs, activeId])

  if (loading && orgs.length === 0) {
    return (
      <div className="mx-2 mb-2 rounded-lg border border-border bg-background/50 px-3 py-2 text-xs text-muted">
        A carregar…
      </div>
    )
  }

  if (orgs.length === 0) {
    return null
  }

  return (
    <div className="relative z-20 mx-2 mb-2 shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-border bg-background/80 px-3 py-2 text-left text-sm text-main transition-colors hover:bg-background"
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium text-muted">Contexto</p>
          <p className="truncate font-semibold leading-tight">{displayName ?? 'Conta'}</p>
          <p className="truncate text-xs text-brand">{activeLabel}</p>
        </div>
        <ChevronDown className={`h-4 w-4 shrink-0 text-muted transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open ? (
        <>
          <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-lg border border-border bg-surface py-1 shadow-lg">
            {personalOrg ? (
              <button
                type="button"
                onClick={() => selectOrg(personalOrg.id)}
                className={`flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm transition-colors hover:bg-background/80 ${
                  activeId === personalOrg.id ? 'bg-brand/10 text-brand' : 'text-main'
                }`}
              >
                <User className="h-4 w-4 shrink-0 opacity-80" />
                <span>Minhas Finanças (Pessoal)</span>
              </button>
            ) : null}
            {businessOrgs.map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => selectOrg(o.id)}
                className={`flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm transition-colors hover:bg-background/80 ${
                  activeId === o.id ? 'bg-brand/10 text-brand' : 'text-main'
                }`}
              >
                <Building2 className="h-4 w-4 shrink-0 opacity-80" />
                <span className="min-w-0 truncate">
                  {o.name ? `${o.name} (Business)` : 'Minha Empresa (Business)'}
                </span>
              </button>
            ))}
            {businessOrgs.length === 0 ? (
              <div className="flex items-center gap-2 px-3 py-2.5 text-sm text-muted">
                <Building2 className="h-4 w-4 shrink-0 opacity-50" />
                <span>Minha Empresa (Business) — em breve</span>
              </div>
            ) : null}
          </div>
        </>
      ) : null}
    </div>
  )
}
