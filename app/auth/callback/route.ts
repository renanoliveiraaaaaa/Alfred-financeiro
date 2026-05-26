import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'

/** Troca `?code=` do Supabase (PKCE) por sessão em cookie e redireciona. */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const nextRaw = searchParams.get('next') ?? '/auth/reset-password'
  const next = nextRaw.startsWith('/') && !nextRaw.startsWith('//') ? nextRaw : '/auth/reset-password'

  if (!code) {
    return NextResponse.redirect(`${origin}/auth/reset-password?error=missing_code`)
  }

  const redirectUrl = `${origin}${next}`
  let response = NextResponse.redirect(redirectUrl)

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          response.cookies.set({ name, value: '', ...options })
        },
      },
    },
  )

  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) {
    console.error('[auth/callback]', error.message)
    return NextResponse.redirect(`${origin}/auth/reset-password?error=exchange`)
  }

  return response
}
