import type { createSupabaseClient } from '@/lib/supabaseClient'
import { resolveActiveOrganizationIdForClient } from '@/lib/activeOrganizationClient'

export type OnboardingStepKey =
  | 'profile'
  | 'revenue'
  | 'expense'
  | 'projection'
  | 'dashboard'

export type OnboardingStep = {
  key: OnboardingStepKey
  label: string
  description: string
  href: string
  done: boolean
}

export const ONBOARDING_STEPS_META: Omit<OnboardingStep, 'done'>[] = [
  {
    key: 'profile',
    label: 'Complete seu perfil',
    description: 'Nome e preferências de tratamento em Perfil.',
    href: '/profile',
  },
  {
    key: 'revenue',
    label: 'Registre sua primeira entrada',
    description: 'Salário, honorários ou qualquer receita recorrente.',
    href: '/revenues/new',
  },
  {
    key: 'expense',
    label: 'Registre sua primeira saída',
    description: 'Mercado, assinaturas ou contas do mês.',
    href: '/expenses/new',
  },
  {
    key: 'projection',
    label: 'Defina metas do mês',
    description: 'Orçamento de entradas e saídas em Planejamento.',
    href: '/projections',
  },
  {
    key: 'dashboard',
    label: 'Explore o painel',
    description: 'Acompanhe saldo, alertas e movimentações.',
    href: '/dashboard',
  },
]

export const WELCOME_SEEN_KEY = 'alfred_welcome_seen'
export const CHECKLIST_DISMISSED_KEY = 'alfred_onboarding_checklist_dismissed'

export function shouldShowWelcomeModal(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return localStorage.getItem(WELCOME_SEEN_KEY) !== 'true'
  } catch {
    return true
  }
}

export function markWelcomeSeen(): void {
  try {
    localStorage.setItem(WELCOME_SEEN_KEY, 'true')
  } catch {
    /* ignore */
  }
}

export function isChecklistDismissed(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return localStorage.getItem(CHECKLIST_DISMISSED_KEY) === 'true'
  } catch {
    return false
  }
}

export function dismissChecklist(): void {
  try {
    localStorage.setItem(CHECKLIST_DISMISSED_KEY, 'true')
  } catch {
    /* ignore */
  }
}

export function resetChecklistDismissed(): void {
  try {
    localStorage.removeItem(CHECKLIST_DISMISSED_KEY)
  } catch {
    /* ignore */
  }
}

export async function fetchOnboardingProgress(
  supabase: ReturnType<typeof createSupabaseClient>,
): Promise<OnboardingStep[]> {
  const { data: userData } = await supabase.auth.getUser()
  const userId = userData?.user?.id
  if (!userId) {
    return ONBOARDING_STEPS_META.map((s) => ({ ...s, done: false }))
  }

  let profileDone = false
  let revenueDone = false
  let expenseDone = false
  let projectionDone = false

  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, gender')
      .eq('id', userId)
      .maybeSingle()
    profileDone = !!(profile?.full_name?.trim() && profile?.gender)

    const activeOrgId = await resolveActiveOrganizationIdForClient(supabase, userId)

    if (activeOrgId) {
      const [revRes, expRes, projRes] = await Promise.all([
        supabase.from('revenues').select('id').eq('organization_id', activeOrgId).limit(1),
        supabase.from('expenses').select('id').eq('organization_id', activeOrgId).limit(1),
        supabase
          .from('projections')
          .select('id')
          .eq('organization_id', activeOrgId)
          .limit(1),
      ])
      revenueDone = (revRes.data?.length ?? 0) > 0
      expenseDone = (expRes.data?.length ?? 0) > 0
      projectionDone = (projRes.data?.length ?? 0) > 0
    }
  } catch {
    /* best effort */
  }

  const dashboardDone = profileDone && revenueDone && expenseDone

  return ONBOARDING_STEPS_META.map((step) => {
    let done = false
    if (step.key === 'profile') done = profileDone
    if (step.key === 'revenue') done = revenueDone
    if (step.key === 'expense') done = expenseDone
    if (step.key === 'projection') done = projectionDone
    if (step.key === 'dashboard') done = dashboardDone
    return { ...step, done }
  })
}

export function onboardingComplete(steps: OnboardingStep[]): boolean {
  return steps.every((s) => s.done)
}
