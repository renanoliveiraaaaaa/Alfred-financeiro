/** Mapeia erros Supabase/redes para chaves i18n em auth.error.* */
export function resolveAuthErrorKey(err: unknown): string {
  if (err instanceof Error) {
    if (err.message === 'auth.error.env') return 'auth.error.env'
    if (err.message === 'Failed to fetch') return 'auth.error.connection'

    const m = err.message.toLowerCase()
    if (m.includes('invalid login') || m.includes('invalid credentials') || m.includes('invalid email or password')) {
      return 'auth.error.invalid'
    }
    if (m.includes('already registered') || m.includes('user already registered') || m.includes('already exists')) {
      return 'auth.error.exists'
    }
    if (m.includes('password') && (m.includes('6 characters') || m.includes('at least 6'))) {
      return 'auth.error.weak'
    }
  }

  return 'auth.error.generic'
}
