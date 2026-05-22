import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'
import { logActivityAction } from '@/lib/actions/activityLog'

export type ActivityAction =
  | 'login'
  | 'logout'
  | 'profile_update'
  | 'password_change'
  | '2fa_enroll'
  | '2fa_verify'
  | '2fa_unenroll'
  | 'export_data'
  | 'delete_records'
  | 'settings_change'

type LogParams = {
  action: ActivityAction
  entityType?: string
  entityId?: string
  metadata?: Record<string, unknown>
  organizationId?: string | null
}

export async function logActivity(
  _supabase: SupabaseClient,
  _userId: string,
  params: LogParams,
): Promise<void> {
  try {
    await logActivityAction({
      action: params.action,
      entityType: params.entityType ?? null,
      entityId: params.entityId ?? null,
      metadata: params.metadata,
      organizationId: params.organizationId,
    })
  } catch {
    /* best effort */
  }
}

export type ActivityLogRow = Database['public']['Tables']['activity_logs']['Row']

export async function fetchRecentActivity(
  supabase: SupabaseClient,
  userId: string,
  limit = 20,
): Promise<ActivityLogRow[]> {
  const { data, error } = await supabase
    .from('activity_logs')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) return []
  return (data ?? []) as ActivityLogRow[]
}

export const ACTIVITY_LABELS: Record<ActivityAction, { pt: string; en: string }> = {
  login: { pt: 'Login realizado', en: 'Signed in' },
  logout: { pt: 'Logout realizado', en: 'Signed out' },
  profile_update: { pt: 'Perfil atualizado', en: 'Profile updated' },
  password_change: { pt: 'Senha alterada', en: 'Password changed' },
  '2fa_enroll': { pt: '2FA ativado', en: '2FA enabled' },
  '2fa_verify': { pt: '2FA verificado', en: '2FA verified' },
  '2fa_unenroll': { pt: '2FA desativado', en: '2FA disabled' },
  export_data: { pt: 'Dados exportados', en: 'Data exported' },
  delete_records: { pt: 'Registros excluídos', en: 'Records deleted' },
  settings_change: { pt: 'Configurações alteradas', en: 'Settings changed' },
}
