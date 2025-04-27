import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  // The `/auth/callback` route is required for the server-side auth flow implemented
  // by the Auth Helpers package. It exchanges an auth code for the user's session.
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const origin = requestUrl.origin

  if (code) {
    const supabase = createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
        // Redirect to the account page after successful login
      return NextResponse.redirect(`${origin}/account`) // We'll create this page later
    }
  }

  // URL to redirect to after handling the auth callback error
   console.error('Auth callback error:', code ? 'Failed to exchange code' : 'No code provided');
  return NextResponse.redirect(`${origin}/login?error=Could not authenticate user`)
} 