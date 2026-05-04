import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/** Copia cookies definidos na resposta `from` (ex.: refresh Supabase) para redirecionamentos. */
function redirectWithSession(request: NextRequest, toPath: string, from: NextResponse) {
  const redirect = NextResponse.redirect(new URL(toPath, request.url))
  from.cookies.getAll().forEach((c) => {
    redirect.cookies.set(c.name, c.value, c)
  })
  return redirect
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Defesa extra: assets e API não devem passar por Supabase (matcher já exclui na maioria dos casos)
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname === '/manifest.json' ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next()
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anonKey) {
    console.error(
      '[middleware] Defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY no .env.local',
    )
    return NextResponse.next()
  }

  // No Middleware do Next.js 14, request.cookies é só leitura: chamar .set na request lança e gera 500.
  // Só podemos gravar cookies na resposta.
  const response = NextResponse.next({
    request,
  })

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value
      },
      set(name: string, value: string, options: CookieOptions) {
        response.cookies.set(name, value, options)
      },
      remove(name: string, options: CookieOptions) {
        response.cookies.set(name, '', { ...options, maxAge: 0 })
      },
    },
  })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Área administrativa: exige sessão (papel admin é validado no layout server-side)
  if (pathname.startsWith('/admin')) {
    if (!user) {
      // Mesma entrada de login que o resto da app (página inicial em `/`)
      return redirectWithSession(request, '/', response)
    }
  }

  // Rotas protegidas da app do cliente
  const isAppRoute =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/expenses') ||
    pathname.startsWith('/revenues') ||
    pathname.startsWith('/projections') ||
    pathname.startsWith('/reports') ||
    pathname.startsWith('/credit-cards') ||
    pathname.startsWith('/goals') ||
    pathname.startsWith('/income-sources') ||
    pathname.startsWith('/subscriptions') ||
    pathname.startsWith('/settings') ||
    pathname.startsWith('/profile') ||
    pathname.startsWith('/expired') ||
    pathname.startsWith('/import-statement') ||
    pathname.startsWith('/import-history')

  if (isAppRoute) {
    if (!user) {
      return redirectWithSession(request, '/', response)
    }

    // Verificação de trial expirado server-side (evita bypass via JS desabilitado)
    if (!pathname.startsWith('/expired')) {
      const { data: trialProfile } = await supabase
        .from('profiles')
        .select('plan_status, trial_ends_at')
        .eq('id', user.id)
        .maybeSingle()

      const now = new Date()
      const isExpired =
        trialProfile?.plan_status === 'trial' &&
        trialProfile?.trial_ends_at != null &&
        now > new Date(trialProfile.trial_ends_at)

      if (isExpired) {
        return redirectWithSession(request, '/expired', response)
      }
    }
  }

  // Logado na raiz: admins vão ao painel; demais ao dashboard do cliente
  if (pathname === '/' && user) {
    const { data: homeProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()
    const dest = homeProfile?.role === 'admin' ? '/admin/dashboard' : '/dashboard'
    return redirectWithSession(request, dest, response)
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Padrão Next.js: exclui explicitamente /_next/static, /_next/image e /api para
     * o middleware nunca interferir com chunks/CSS/JS (evita 404 em dev e em deploy).
     * Inclui '/' porque o grupo negativo sozinho pode não casar a raiz.
     */
    '/',
    '/((?!api|_next/static|_next/image|_next/webpack-hmr|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
