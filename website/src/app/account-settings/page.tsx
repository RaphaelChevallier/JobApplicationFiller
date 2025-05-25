export const dynamic = 'force-dynamic';

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { signOut } from '../application/actions'
import Link from 'next/link'

export default async function AccountSettingsPage({ searchParams }: { searchParams: { message?: string, error?: string } }) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return redirect('/login?message=Could not authenticate user')
  }

  // Read searchParams into local variables - properly handle as dynamic values
  const message = searchParams?.message || null;
  const errorMessage = searchParams?.error || null;

  return (
    <div className="flex flex-col items-center pt-8 sm:pt-12 md:pt-16 pb-8 bg-gray-200 dark:bg-gray-950 min-h-screen">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 md:px-8 space-y-4 sm:space-y-6">
        {/* Responsive header section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4 sm:mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Account Settings</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Manage your subscription, payment methods, and account preferences</p>
          </div>
          
          {/* Navigation buttons in a responsive container */}
          <div className="flex flex-wrap gap-2 sm:gap-3 w-full sm:w-auto justify-start sm:justify-end">
            <Link 
              href="/application"
              className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium bg-indigo-500/30 dark:bg-indigo-600/30 backdrop-blur-md border border-indigo-300/40 dark:border-indigo-500/30 text-indigo-900 dark:text-white rounded-lg shadow-md hover:bg-indigo-500/50 dark:hover:bg-indigo-600/50 hover:shadow-lg transition-all duration-300 ease-in-out focus:ring-2 focus:ring-indigo-500/50 focus:outline-none cursor-pointer"
            >
              AI Application
            </Link>
            <Link 
              href="/job-applications"
              className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium bg-indigo-500/30 dark:bg-indigo-600/30 backdrop-blur-md border border-indigo-300/40 dark:border-indigo-500/30 text-indigo-900 dark:text-white rounded-lg shadow-md hover:bg-indigo-500/50 dark:hover:bg-indigo-600/50 hover:shadow-lg transition-all duration-300 ease-in-out focus:ring-2 focus:ring-indigo-500/50 focus:outline-none cursor-pointer"
            >
              Job Applications
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

        {/* Display Success/Error Messages */}
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

        {/* Account Settings Content */}
        <div className="space-y-4 sm:space-y-6">
          {/* Subscription Card */}
          <div className="p-4 sm:p-6 bg-blue-50/50 dark:bg-indigo-950/70 backdrop-blur-lg rounded-xl border border-blue-200/40 dark:border-indigo-800/50 shadow-xl">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4">Subscription</h2>
            
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <p className="text-gray-700 dark:text-gray-300">Current Plan: <span className="font-medium">Free Trial</span></p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Your trial ends in 14 days</p>
              </div>
              <button className="px-4 py-2 text-sm font-medium bg-indigo-500/30 dark:bg-indigo-600/30 backdrop-blur-md border border-indigo-300/40 dark:border-indigo-500/30 text-indigo-900 dark:text-white rounded-lg shadow-md hover:bg-indigo-500/50 dark:hover:bg-indigo-600/50 hover:shadow-lg transition-all duration-300 ease-in-out focus:ring-2 focus:ring-indigo-500/50 focus:outline-none cursor-pointer w-full sm:w-auto">
                Upgrade Plan
              </button>
            </div>
          </div>

          {/* Payment Methods Card */}
          <div className="p-4 sm:p-6 bg-blue-50/50 dark:bg-indigo-950/70 backdrop-blur-lg rounded-xl border border-blue-200/40 dark:border-indigo-800/50 shadow-xl">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4">Payment Methods</h2>
            
            <div className="text-center p-4">
              <p className="text-gray-600 dark:text-gray-300">No payment methods added yet</p>
              <button className="mt-3 px-4 py-2 text-sm font-medium bg-white/10 dark:bg-black/20 backdrop-blur-md border border-white/20 dark:border-white/10 text-gray-800 dark:text-white rounded-lg shadow-md hover:bg-white/30 dark:hover:bg-black/40 hover:shadow-lg transition-all duration-300 ease-in-out focus:ring-2 focus:ring-indigo-500/50 focus:outline-none cursor-pointer">
                Add Payment Method
              </button>
            </div>
          </div>

          {/* Account Security Card */}
          <div className="p-4 sm:p-6 bg-blue-50/50 dark:bg-indigo-950/70 backdrop-blur-lg rounded-xl border border-blue-200/40 dark:border-indigo-800/50 shadow-xl">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4">Account Security</h2>
            
            <div className="space-y-4">
              <div>
                <p className="text-gray-700 dark:text-gray-300 mb-1">Email</p>
                <p className="text-sm text-gray-600 dark:text-gray-400 break-all">{user.email}</p>
              </div>
              
              <div className="flex flex-wrap gap-3">
                <button className="px-4 py-2 text-xs sm:text-sm font-medium bg-white/10 dark:bg-black/20 backdrop-blur-md border border-white/20 dark:border-white/10 text-gray-800 dark:text-white rounded-lg shadow-md hover:bg-white/30 dark:hover:bg-black/40 hover:shadow-lg transition-all duration-300 ease-in-out focus:ring-2 focus:ring-indigo-500/50 focus:outline-none cursor-pointer">
                  Change Password
                </button>
                <button className="px-4 py-2 text-xs sm:text-sm font-medium bg-white/10 dark:bg-black/20 backdrop-blur-md border border-white/20 dark:border-white/10 text-gray-800 dark:text-white rounded-lg shadow-md hover:bg-white/30 dark:hover:bg-black/40 hover:shadow-lg transition-all duration-300 ease-in-out focus:ring-2 focus:ring-indigo-500/50 focus:outline-none cursor-pointer">
                  Enable Two-Factor Auth
                </button>
              </div>
            </div>
          </div>

          {/* Danger Zone Card */}
          <div className="p-4 sm:p-6 bg-red-50/50 dark:bg-red-950/70 backdrop-blur-lg rounded-xl border border-red-200/40 dark:border-red-800/50 shadow-xl">
            <h2 className="text-lg sm:text-xl font-semibold text-red-700 dark:text-red-400 mb-3 sm:mb-4">Danger Zone</h2>
            
            <div className="flex flex-wrap gap-3">
              <button className="px-4 py-2 text-xs sm:text-sm font-medium bg-red-500/20 dark:bg-red-600/20 backdrop-blur-md border border-red-300/30 dark:border-red-500/20 text-red-900 dark:text-red-300 rounded-lg shadow-md hover:bg-red-500/40 dark:hover:bg-red-600/40 hover:shadow-lg transition-all duration-300 ease-in-out focus:ring-2 focus:ring-red-500/50 focus:outline-none cursor-pointer">
                Cancel Subscription
              </button>
              <button className="px-4 py-2 text-xs sm:text-sm font-medium bg-red-500/20 dark:bg-red-600/20 backdrop-blur-md border border-red-300/30 dark:border-red-500/20 text-red-900 dark:text-red-300 rounded-lg shadow-md hover:bg-red-500/40 dark:hover:bg-red-600/40 hover:shadow-lg transition-all duration-300 ease-in-out focus:ring-2 focus:ring-red-500/50 focus:outline-none cursor-pointer">
                Delete Account
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 