'use client'

import { useEffect, useState } from 'react'

/** Disparado por `OrganizationSwitcher` ao trocar de organização. */
export const ACTIVE_ORG_CHANGE_EVENT = 'alfred:organization-change'

/**
 * Incrementa quando o utilizador muda de organização (localStorage + cookie),
 * para refetch de dados dependentes do contexto.
 */
export function useActiveOrganizationRevision(): number {
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    const bump = () => setRevision((r) => r + 1)
    window.addEventListener(ACTIVE_ORG_CHANGE_EVENT, bump)
    return () => window.removeEventListener(ACTIVE_ORG_CHANGE_EVENT, bump)
  }, [])
  return revision
}
