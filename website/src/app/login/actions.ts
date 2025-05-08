'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { headers } from 'next/headers'

export async function login(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    console.error('Login error:', error.message)
    // Check for specific invalid credentials error message from Supabase
    if (error.message.includes('Invalid login credentials')) {
      return redirect('/login?error=Invalid email or password')
    } else {
      // Redirect back to login page with a generic error message for other issues
      return redirect('/login?error=Could not authenticate user')
    }
  }

  // Revalidate path to ensure protected routes are updated
  revalidatePath('/', 'layout')
  // Redirect to a protected route, e.g., application page
  redirect('/application') // Updated from /account
}

export async function signInWithGoogle() {
  const headerList = await headers()
  const origin = headerList.get('origin')
  // Determine the base URL: Use origin if available, fallback to env var, then default to localhost
  const siteUrl = origin || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000' 
  const supabase = await createClient()

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      // Use the determined siteUrl for the redirect
      redirectTo: `${siteUrl}/auth/callback`, 
    },
  })

  if (error) {
    console.error('Google Sign-In error:', error.message)
    return redirect('/login?error=Could not authenticate with Google')
  }

  if (data.url) {
    redirect(data.url) // Redirect the user to Google's authentication page
  }
  // If there is no URL, it might mean the user is already signed in or some other edge case
  // Redirect back to login page or handle appropriately
   return redirect('/login?error=Could not get Google authentication URL')
}

// We will also need a signup function later, potentially in a separate /signup route
// export async function signup(formData: FormData) {
//   // ... implementation ...
// } 