'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export async function signOut() {
  const supabase = createClient()
  const { error } = await supabase.auth.signOut()

  if (error) {
    console.error('Sign out error:', error.message)
    // Optionally redirect to an error page or back to account with an error
    return redirect('/account?error=Could not sign out')
  }

  // Revalidate relevant paths after sign out
  revalidatePath('/', 'layout') // Revalidate all pages
  // Redirect the user to the home page or login page after sign out
  redirect('/login')
} 