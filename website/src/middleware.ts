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
  // Important: getUser checks the session on the server, potentially refreshing it.
  // This replaces the need for a separate getSession call for the check below.
  const { data: { user }, error } = await supabase.auth.getUser()

  // Handle potential errors from getUser, though unlikely in typical flows unless network issues occur.
  // You might want to log this error or handle it differently based on your app's needs.
  if (error) {
    console.error('Error fetching user in middleware:', error)
    // Decide how to proceed. Maybe allow access or redirect to an error page?
    // For now, we'll proceed as if no user is found, which leads to redirection for protected routes.
  }

  // If no user and the route is protected, redirect to login
  if (!user && (request.nextUrl.pathname.startsWith('/application') || request.nextUrl.pathname.startsWith('/account-settings'))) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/login'
    redirectUrl.searchParams.set(`redirectedFrom`, request.nextUrl.pathname)
    return NextResponse.redirect(redirectUrl)
  }

   // If user exists and tries to access login/signup, redirect to application page
    if (user && (request.nextUrl.pathname.startsWith('/login') || request.nextUrl.pathname.startsWith('/signup'))) {
        const redirectUrl = request.nextUrl.clone()
        redirectUrl.pathname = '/application'
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
     '/application/:path*',
     '/account-settings/:path*',
     '/login',
     '/signup',
  ],
} 