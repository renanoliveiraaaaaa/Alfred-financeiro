import type { createSupabaseClient } from '@/lib/supabaseClient'

/**
 * Categorias padrão para novos usuários (onboarding).
 * Inseridas automaticamente quando o usuário não possui categorias.
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
 * Verifica se o usuário tem categorias. Se não tiver, insere as padrão.
 * Retorna true se inseriu categorias (usuário novo), false caso contrário.
 */
export async function seedCategoriesIfEmpty(supabase: ReturnType<typeof createSupabaseClient>): Promise<boolean> {
  const { data: userData } = await supabase.auth.getUser()
  const userId = userData?.user?.id
  if (!userId) return false

  const { data: existing } = await supabase
    .from('categories')
    .select('id')
    .eq('user_id', userId)

  if (existing && existing.length > 0) return false

  const rows = DEFAULT_CATEGORIES.map((name) => ({ user_id: userId, name }))
  const { error } = await supabase.from('categories').insert(rows)

  if (error) {
    console.error('Erro ao inserir categorias padrão:', error)
    return false
  }

  return true
}
