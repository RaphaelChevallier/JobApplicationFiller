import { createClient } from '@/utils/supabase/server'
import { type NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')
  const redirectTo = searchParams.get('redirectTo') || '/application'
  
  if (!token) {
    console.error('Token login error: No token provided')
    return NextResponse.redirect(new URL('/login?error=Missing token', request.url))
  }

  try {
    const supabase = await createClient()
    
    // Set the user's session using the provided token
    const { error } = await supabase.auth.setSession({
      access_token: token,
      refresh_token: '', // Not needed since we're just using the access token
    })

    if (error) {
      console.error('Token login error:', error.message)
      return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error.message)}`, request.url))
    }

    // Redirect to the application page on successful login
    const redirectUrl = new URL(redirectTo, request.url)
    return NextResponse.redirect(redirectUrl)
  } catch (error) {
    console.error('Unexpected token login error:', error)
    return NextResponse.redirect(new URL('/login?error=Authentication failed', request.url))
  }
} 