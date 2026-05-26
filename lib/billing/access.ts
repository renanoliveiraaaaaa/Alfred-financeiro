export type ProfileAccess = {
  plan_status?: string | null
  trial_ends_at?: string | null
  subscription_status?: string | null
  role?: string | null
}

/** true = utilizador bloqueado (deve ir para /expired). */
export function isAccessBlocked(profile: ProfileAccess | null | undefined): boolean {
  if (!profile) return false
  if (profile.role === 'admin') return false

  const planStatus = profile.plan_status ?? 'trial'
  const subStatus = profile.subscription_status ?? 'trial'

  if (planStatus === 'active' || subStatus === 'active' || subStatus === 'past_due') {
    return false
  }

  if (planStatus === 'expired' || subStatus === 'canceled') {
    return true
  }

  if (planStatus === 'trial' && profile.trial_ends_at) {
    return new Date() > new Date(profile.trial_ends_at)
  }

  return false
}
