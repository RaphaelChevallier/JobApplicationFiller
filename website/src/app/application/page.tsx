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

  // Read searchParams into local variables - properly handle as dynamic values
  const message = searchParams?.message || null;
  const errorMessage = searchParams?.error || null;

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
    <div className="flex flex-col items-center pt-16 pb-8 bg-gray-200 dark:bg-gray-950 min-h-screen">
      <div className="w-full max-w-4xl mx-auto px-4 md:px-8 space-y-6 flex-grow flex flex-col">
        <div className="flex justify-between items-center mb-6 flex-shrink-0">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">One Applic-ai-tion</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Complete your profile once. Let AI fill out job applications for you.</p>
          </div>
          <div className="flex space-x-3">
            <Link 
              href="/account-settings"
              className="px-5 py-2.5 text-sm font-medium bg-indigo-500/30 dark:bg-indigo-600/30 backdrop-blur-md border border-indigo-300/40 dark:border-indigo-500/30 text-indigo-900 dark:text-white rounded-lg shadow-lg hover:bg-indigo-500/50 dark:hover:bg-indigo-600/50 hover:shadow-xl transition-all duration-300 ease-in-out focus:ring-2 focus:ring-indigo-500/50 focus:outline-none cursor-pointer"
            >
              Account Settings
            </Link>
            <form action={signOut}>
              <button 
                type="submit"
                className="px-5 py-2.5 text-sm font-medium bg-white/10 dark:bg-black/20 backdrop-blur-md border border-white/20 dark:border-white/10 text-gray-800 dark:text-white rounded-lg shadow-lg hover:bg-white/30 dark:hover:bg-black/40 hover:shadow-xl transition-all duration-300 ease-in-out focus:ring-2 focus:ring-indigo-500/50 focus:outline-none cursor-pointer"
              >
                Sign Out
              </button>
            </form>
          </div>
        </div>

        {/* Display Success/Error Messages using local variables */}
        {message && (
          <div className="p-3 mb-4 text-sm text-green-700 bg-green-100 rounded-lg dark:bg-green-200 dark:text-green-800" role="alert">
            {message}
          </div>
        )}
        {errorMessage && (
          <div className="p-3 mb-4 text-sm text-red-700 bg-red-100 rounded-lg dark:bg-red-200 dark:text-red-800" role="alert">
            {errorMessage}
          </div>
        )}

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