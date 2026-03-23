import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: any) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Proteger rotas que começam com /dashboard, /expenses, /revenues, /reports, /settings
  if (
    request.nextUrl.pathname.startsWith('/dashboard') ||
    request.nextUrl.pathname.startsWith('/expenses') ||
    request.nextUrl.pathname.startsWith('/revenues') ||
    request.nextUrl.pathname.startsWith('/projections') ||
    request.nextUrl.pathname.startsWith('/reports') ||
    request.nextUrl.pathname.startsWith('/credit-cards') ||
    request.nextUrl.pathname.startsWith('/goals') ||
    request.nextUrl.pathname.startsWith('/income-sources') ||
    request.nextUrl.pathname.startsWith('/subscriptions') ||
    request.nextUrl.pathname.startsWith('/settings') ||
    request.nextUrl.pathname.startsWith('/profile') ||
    request.nextUrl.pathname.startsWith('/expired') ||
    request.nextUrl.pathname.startsWith('/import-history')
  ) {
    if (!user) {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  // Se já está logado e tenta acessar a página inicial, redireciona para dashboard
  if (request.nextUrl.pathname === '/' && user) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Allow-list: só rotas HTML da aplicação. Assim /_next/*, /api/*, imagens e assets
     * nunca passam por este middleware (evita 404 de chunks/CSS no dev e edge cases de regex).
     */
    '/',
    '/dashboard/:path*',
    '/expenses/:path*',
    '/revenues/:path*',
    '/projections/:path*',
    '/reports/:path*',
    '/credit-cards/:path*',
    '/goals/:path*',
    '/income-sources/:path*',
    '/subscriptions/:path*',
    '/settings/:path*',
    '/profile/:path*',
    '/expired/:path*',
    '/import-statement',
    '/import-statement/:path*',
    '/import-history',
    '/import-history/:path*',
  ],
}
