import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { signOut, updateProfile } from './actions'
import AccountTabs from './account-tabs'
import { type Profile, type Education } from '@/types/database'

// Define the Profile type based on your schema - expanded
// export type Profile = {
//   id: string
//   updated_at: string | null
//   username: string | null
//   full_name: string | null
//   avatar_url: string | null
//   website: string | null
//   // Added fields
//   first_name: string | null
//   last_name: string | null
//   phone: string | null
//   location: string | null
//   resume_url: string | null
//   cover_letter_url: string | null
// }

// Define Education type (adjust based on final implementation if needed)
// export type Education = {
//   id: string
//   user_id: string
//   school_name: string
//   degree: string | null // Match the enum type from migration
//   field_of_study: string | null
//   start_date: string | null // Use string for date inputs initially
//   end_date: string | null
//   created_at: string
//   updated_at: string
// }

export default async function AccountPage({ searchParams }: { searchParams: { message?: string, error?: string } }) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return redirect('/login?message=Could not authenticate user')
  }

  // Fetch profile data
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single<Profile>() // Specify the type here

   // Fetch education data
  const { data: educationData, error: educationError } = await supabase
    .from('education')
    .select('*')
    .eq('user_id', user.id)
    .order('end_date', { ascending: false })

  // Handle profile fetch errors (optional: show specific message)
  if (profileError && profileError.code !== 'PGRST116') {
    console.error('Error fetching profile:', profileError)
    // searchParams.error = "Could not load profile data."; // Example: Set error for display
  }
   // Handle education fetch errors (optional: show specific message)
  if (educationError) {
    console.error('Error fetching education:', educationError)
    // searchParams.error = (searchParams.error ? searchParams.error + "; " : "") + "Could not load education data.";
  }

  return (
    <div className="flex flex-col items-center pt-16 pb-8 bg-gray-100 dark:bg-gray-900 min-h-screen">
      <div className="w-full max-w-4xl p-8 space-y-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
        <h1 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-6">Account Management</h1>

        {/* Display Success/Error Messages - Moved inside tabs potentially or kept global */}
        {searchParams.message && (
          <div className="p-3 mb-4 text-sm text-green-700 bg-green-100 rounded-lg dark:bg-green-200 dark:text-green-800" role="alert">
            {searchParams.message}
          </div>
        )}
        {searchParams.error && (
          <div className="p-3 mb-4 text-sm text-red-700 bg-red-100 rounded-lg dark:bg-red-200 dark:text-red-800" role="alert">
            {searchParams.error}
          </div>
        )}

        {/* Tab Component - Pass necessary data and actions */}
        <AccountTabs 
          user={user} 
          profile={profile} 
          education={educationData || []} 
          updateProfile={updateProfile} 
          signOut={signOut} 
        />

      </div>
    </div>
  )
} 