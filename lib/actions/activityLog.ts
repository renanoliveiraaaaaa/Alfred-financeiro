'use server'

import { createSupabaseServerClient } from '@/lib/supabaseServer'
import type { Json } from '@/types/supabase'

const ALLOWED_ACTIONS = new Set([
  'login',
  'logout',
  'profile_update',
  'export_data',
  'delete_records',
  '2fa_enroll',
  '2fa_unenroll',
  'password_change',
  'account_delete',
  'settings_change',
])

type LogParams = {
  action: string
  entityType?: string | null
  entityId?: string | null
  metadata?: Record<string, unknown>
  organizationId?: string | null
}

export async function logActivityAction(params: LogParams): Promise<{ ok: boolean }> {
  if (!ALLOWED_ACTIONS.has(params.action)) {
    return { ok: false }
  }

  try {
    const supabase = createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { ok: false }

    const { error } = await supabase.from('activity_logs').insert({
      user_id: user.id,
      organization_id: params.organizationId ?? null,
      action: params.action,
      entity_type: params.entityType ?? null,
      entity_id: params.entityId ?? null,
      metadata: (params.metadata ?? {}) as Json,
    } as never)

    return { ok: !error }
  } catch {
    return { ok: false }
  }
}
