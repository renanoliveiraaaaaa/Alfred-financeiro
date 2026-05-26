import type { createSupabaseClient } from '@/lib/supabaseClient'
import { resolveActiveOrganizationIdForClient } from '@/lib/activeOrganizationClient'

/**
 * Categorias padrão para novos usuários (onboarding).
 * Inseridas automaticamente quando o usuário não possui categorias na org ativa.
 */
export const DEFAULT_CATEGORIES = [
  'Alimentação',
  'Transporte',
  'Moradia',
  'Saúde',
  'Lazer',
  'Educação',
  'Assinaturas',
  'Outros',
] as const

/**
 * Verifica se o usuário tem categorias na org ativa. Se não tiver, insere as padrão.
 * Retorna true se inseriu categorias (usuário novo), false caso contrário.
 */
export async function seedCategoriesIfEmpty(supabase: ReturnType<typeof createSupabaseClient>): Promise<boolean> {
  const { data: userData } = await supabase.auth.getUser()
  const userId = userData?.user?.id
  if (!userId) return false

  const organizationId = await resolveActiveOrganizationIdForClient(supabase, userId)
  if (!organizationId) return false

  const { data: existing } = await supabase
    .from('categories')
    .select('id')
    .eq('organization_id', organizationId)
    .limit(1)

  if (existing && existing.length > 0) return false

  const rows = DEFAULT_CATEGORIES.map((name) => ({
    user_id: userId,
    organization_id: organizationId,
    name,
  }))
  const { error } = await supabase.from('categories').insert(rows)

  if (error) {
    console.error('[seedCategories]', error)
    return false
  }

  return true
}
