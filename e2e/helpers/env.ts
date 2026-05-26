export function hasRealSupabase(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  return Boolean(url && !url.includes('placeholder'))
}

export function hasLiveAuthTests(): boolean {
  return process.env.E2E_LIVE_AUTH === '1' && hasRealSupabase()
}

export function hasE2ECredentials(): boolean {
  return Boolean(process.env.E2E_TEST_EMAIL && process.env.E2E_TEST_PASSWORD)
}

export function getE2ECredentials() {
  const email = process.env.E2E_TEST_EMAIL
  const password = process.env.E2E_TEST_PASSWORD
  if (!email || !password) {
    throw new Error('Defina E2E_TEST_EMAIL e E2E_TEST_PASSWORD no .env.local')
  }
  return { email, password }
}
