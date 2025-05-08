'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { headers } from 'next/headers' // Needed for origin if using email confirmation link

export async function signup(formData: FormData) {
  // Await headers() before accessing it
  const headerList = await headers()
  const origin = headerList.get('origin') 
  // Determine the base URL: Use origin if available, fallback to env var, then default to localhost
  const siteUrl = origin || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000' 
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  // Await the async createClient function
  const supabase = await createClient()

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // Use the determined siteUrl for the email confirmation redirect
      emailRedirectTo: `${siteUrl}/auth/confirm`,
    },
  })

  if (error) {
    console.error('Signup error:', error.message)
    // Check if the error indicates the user already exists
    // Note: Supabase error messages might change. 
    // A more robust check might involve error codes or specific error types if available.
    if (error.message.includes('User already registered')) {
        // Redirect to login page with a specific message
        return redirect('/login?error=Email already registered. Please log in.')
    }
    // Redirect back to signup page with a generic error for other issues
    return redirect('/signup?error=Could not create account')
  }

  // If signup is successful (even if user existed but wasn't confirmed), 
  // always redirect to the login page with the "check email" message.
  // Supabase handles sending the confirmation email regardless.
  return redirect('/login?message=Check email to continue sign up process') 
} 