import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { signOut } from './actions'
import Link from 'next/link'

export default async function AccountPage() {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    // This should technically be handled by middleware, but double-checking
    return redirect('/login')
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
      <div className="w-full max-w-lg p-8 space-y-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-center text-gray-900 dark:text-white">Account</h1>
        <p className="text-center text-gray-700 dark:text-gray-300">
          Welcome, {user.email}!
        </p>

        {/* Placeholder for future profile form */}
        <div className="p-4 my-4 border border-dashed border-gray-300 dark:border-gray-600 rounded-md text-center text-gray-500 dark:text-gray-400">
          <p>Your job application profile details will go here.</p>
          <Link href="/account/profile" className="text-blue-600 hover:underline dark:text-blue-400">
             Edit Profile (Coming Soon)
          </Link>
        </div>

        {/* Sign Out Button */}
        <form action={signOut}>
          <button 
            type="submit"
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 dark:focus:ring-offset-gray-800"
          >
            Sign Out
          </button>
        </form>
      </div>
    </div>
  )
} 