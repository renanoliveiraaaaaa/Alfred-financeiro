'use server'

import { revalidatePath } from 'next/cache'
import { createSupabaseServerClient } from '@/lib/supabaseServer'

export type AdminActionResult = { ok: true } | { ok: false; error: string }

async function requireAdmin(): Promise<
  | { ok: true; supabase: ReturnType<typeof createSupabaseServerClient>; adminId: string }
  | { ok: false; error: string }
> {
  const supabase = createSupabaseServerClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return { ok: false, error: 'admin.error.sessionInvalid' }
  }

  const { data: me, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError || me?.role !== 'admin') {
    return { ok: false, error: 'admin.error.noPermission' }
  }

  return { ok: true, supabase, adminId: user.id }
}

function revalidateAdminUserPaths(userId: string) {
  revalidatePath('/admin/users')
  revalidatePath(`/admin/users/${userId}`)
  revalidatePath('/admin/dashboard')
}

export async function updateUserRole(
  userId: string,
  newRole: 'user' | 'admin',
): Promise<AdminActionResult> {
  const ctx = await requireAdmin()
  if (!ctx.ok) return { ok: false, error: ctx.error }

  if (userId === ctx.adminId && newRole === 'user') {
    return {
      ok: false,
      error: 'admin.error.cannotDemoteSelf',
    }
  }

  const { error } = await ctx.supabase.from('profiles').update({ role: newRole }).eq('id', userId)

  if (error) {
    return { ok: false, error: error.message }
  }

  revalidateAdminUserPaths(userId)
  return { ok: true }
}

/** Remove o registo em `profiles`. A conta em auth.users permanece (remover utilizador por completo exige painel Supabase ou API Admin). */
export async function deleteUserProfile(userId: string): Promise<AdminActionResult> {
  const ctx = await requireAdmin()
  if (!ctx.ok) return { ok: false, error: ctx.error }

  if (userId === ctx.adminId) {
    return { ok: false, error: 'admin.error.cannotDeleteSelf' }
  }

  const { error } = await ctx.supabase.from('profiles').delete().eq('id', userId)

  if (error) {
    return { ok: false, error: error.message }
  }

  revalidateAdminUserPaths(userId)
  return { ok: true }
}
