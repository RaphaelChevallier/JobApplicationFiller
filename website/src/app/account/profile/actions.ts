'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import type { Profile } from '@/types/database' // Assuming types are defined

// Type definition placeholder (Create this file if it doesn't exist)
// Define this in `@/types/database.ts` or similar
// export type Profile = {
//   id: string
//   user_id: string
//   created_at: string
//   full_name: string | null
//   phone_number: string | null
//   address: string | null
//   linkedin_url: string | null
//   portfolio_url: string | null
//   resume_url: string | null
//   cover_letter_template: string | null
// }

export async function getProfile(): Promise<Profile | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    console.error('User not authenticated')
    return null
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (error && error.code !== 'PGRST116') { // PGRST116: row not found
    console.error('Error fetching profile:', error)
    return null
  }

  return data
}

export async function updateProfile(formData: FormData) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    console.error('User not authenticated for update')
    return redirect('/login?error=Not authenticated')
  }

  const profileData = {
    user_id: user.id, // Ensure user_id is set
    full_name: formData.get('fullName') as string,
    phone_number: formData.get('phoneNumber') as string,
    address: formData.get('address') as string,
    linkedin_url: formData.get('linkedinUrl') as string,
    portfolio_url: formData.get('portfolioUrl') as string,
    resume_url: formData.get('resumeUrl') as string, // Handle file upload separately if needed
    cover_letter_template: formData.get('coverLetterTemplate') as string,
    // Add created_at only if inserting, upsert handles updated_at if defined in DB
  }

  // Use upsert to insert or update the profile based on user_id
  const { error } = await supabase.from('profiles').upsert(profileData, {
    onConflict: 'user_id' // Specify the conflict target
  })

  if (error) {
    console.error('Error updating profile:', error)
    return redirect('/account/profile?error=Could not update profile')
  }

  // Revalidate the profile page path to show updated data
  revalidatePath('/account/profile')
  // Redirect back to profile page with success message
  return redirect('/account/profile?message=Profile updated successfully')
} 