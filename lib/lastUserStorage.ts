const STORAGE_KEY = 'alfred_last_user'

export type LastUser = {
  email: string
  fullName: string | null
  avatarUrl: string | null
}

export function getLastUser(): LastUser | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as LastUser
    return parsed?.email ? parsed : null
  } catch {
    return null
  }
}

export function setLastUser(user: LastUser): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
  } catch {
    // localStorage indisponível
  }
}

export function clearLastUser(): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
}

/** Mascara o email: ren**@phg.adv.br */
export function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return email
  const [local, domain] = email.split('@')
  if (local.length <= 2) return `${local}**@${domain}`
  return `${local.slice(0, 2)}**@${domain}`
}
