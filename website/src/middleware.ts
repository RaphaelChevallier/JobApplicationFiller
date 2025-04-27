import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'

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
        set(name: string, value: string, options: CookieOptions) {
          // If the cookie is updated, update the cookies for the request and response
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
        remove(name: string, options: CookieOptions) {
          // If the cookie is removed, update the cookies for the request and response
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

  // Refresh session if expired - required for Server Components
  const { data: { session } } = await supabase.auth.getSession()

  // If no session and the route is protected, redirect to login
  if (!session && request.nextUrl.pathname.startsWith('/account')) { // Add other protected routes here
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/login'
    redirectUrl.searchParams.set(`redirectedFrom`, request.nextUrl.pathname)
    return NextResponse.redirect(redirectUrl)
  }

   // If session exists and user tries to access login/signup, redirect to account
    if (session && (request.nextUrl.pathname.startsWith('/login') || request.nextUrl.pathname.startsWith('/signup'))) {
        const redirectUrl = request.nextUrl.clone()
        redirectUrl.pathname = '/account'
        return NextResponse.redirect(redirectUrl)
    }


  // IMPORTANT: Avoid writing Supabase cookies down to the client in loaders
  // See https://github.com/supabase/auth-helpers/issues/706

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - api/ (API routes, if any)
     * - auth/ (auth routes)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|api/|auth/).*)',
    // Explicitly match protected routes and auth routes for redirection logic
     '/account/:path*',
     '/login',
     '/signup',
  ],
} 