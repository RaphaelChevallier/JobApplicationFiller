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

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // Use the determined siteUrl for the email confirmation redirect
      emailRedirectTo: `${siteUrl}/auth/confirm`,
    },
  })

  if (error) {
    console.error('Signup error:', error.message)
    // Redirect back to signup page with an error message
    // Consider more specific error messages based on error.code
    return redirect('/signup?error=Could not create account')
  }

  // Revalidate path or redirect to a page telling the user to check their email
  // revalidatePath('/', 'layout') 
  // For now, just redirect back to login or a success page
  // A dedicated "Check your email" page would be better UX
  return redirect('/login?message=Check email to continue sign up process') 
} 