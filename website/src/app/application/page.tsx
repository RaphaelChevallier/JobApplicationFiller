export const dynamic = 'force-dynamic';

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { signOut, updateProfile } from './actions' // Path is correct
import AccountTabs from './account-tabs' // Path is correct
import { type Profile, type Education } from '@/types/database'
import Link from 'next/link'

export default async function AIApplicationPage({ searchParams }: { 
  searchParams: { message?: string, error?: string } 
}) {
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
    .single<Profile>()

   // Fetch education data
  const { data: educationData, error: educationError } = await supabase
    .from('education')
    .select('*')
    .eq('user_id', user.id)
    .order('end_date', { ascending: false })

  // Handle profile fetch errors
  if (profileError && profileError.code !== 'PGRST116') {
    console.error('Error fetching profile:', profileError)
    // Consider setting a specific error state if needed
  }
   // Handle education fetch errors
  if (educationError) {
    console.error('Error fetching education:', educationError)
    // Consider setting a specific error state if needed
  }

  return (
    <div className="flex flex-col items-center pt-8 sm:pt-12 md:pt-16 pb-8 bg-gray-200 dark:bg-gray-950 min-h-screen">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 md:px-8 space-y-4 sm:space-y-6 flex-grow flex flex-col">
        {/* Responsive header section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4 sm:mb-6 flex-shrink-0">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Your One Applic-ai-tion</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Complete your profile once. Let AI fill out job applications for you.</p>
          </div>
          
          {/* Navigation buttons in a responsive container */}
          <div className="flex flex-wrap gap-2 sm:gap-3 w-full sm:w-auto justify-start sm:justify-end">
            <Link 
              href="/job-applications"
              className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium bg-indigo-500/30 dark:bg-indigo-600/30 backdrop-blur-md border border-indigo-300/40 dark:border-indigo-500/30 text-indigo-900 dark:text-white rounded-lg shadow-md hover:bg-indigo-500/50 dark:hover:bg-indigo-600/50 hover:shadow-lg transition-all duration-300 ease-in-out focus:ring-2 focus:ring-indigo-500/50 focus:outline-none cursor-pointer"
            >
              Job Applications
            </Link>
            <Link 
              href="/account-settings"
              className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium bg-indigo-500/30 dark:bg-indigo-600/30 backdrop-blur-md border border-indigo-300/40 dark:border-indigo-500/30 text-indigo-900 dark:text-white rounded-lg shadow-md hover:bg-indigo-500/50 dark:hover:bg-indigo-600/50 hover:shadow-lg transition-all duration-300 ease-in-out focus:ring-2 focus:ring-indigo-500/50 focus:outline-none cursor-pointer"
            >
              Account Settings
            </Link>
            <form action={signOut}>
              <button 
                type="submit"
                className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium bg-white/10 dark:bg-black/20 backdrop-blur-md border border-white/20 dark:border-white/10 text-gray-800 dark:text-white rounded-lg shadow-md hover:bg-white/30 dark:hover:bg-black/40 hover:shadow-lg transition-all duration-300 ease-in-out focus:ring-2 focus:ring-indigo-500/50 focus:outline-none cursor-pointer"
              >
                Sign Out
              </button>
            </form>
          </div>
        </div>

        {/* Tab Component - Allow this to grow */}
        <div className="flex-grow">
          <AccountTabs 
            user={user} 
            profile={profile} 
            education={educationData || []} 
            updateProfile={updateProfile} 
            signOut={signOut} 
          />
        </div>

      </div>
    </div>
  )
} 