export const dynamic = 'force-dynamic';

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { signOut } from '../application/actions'
import Link from 'next/link'
import { type JobApplication, type ApplicationContent } from '@/types/database'
import ApplicationCard from './components/ApplicationCard'
import ApplicationRow from './components/ApplicationRow'
import { cookies } from 'next/headers'

export default async function JobApplicationsPage() {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return redirect('/login?message=Could not authenticate user')
  }

  // Fetch job applications data
  const { data: jobApplications, error: jobApplicationsError } = await supabase
    .from('job_applications')
    .select('*')
    .eq('user_id', user.id)
    .order('application_date', { ascending: false })

  // Handle job applications fetch errors
  if (jobApplicationsError) {
    console.error('Error fetching job applications:', jobApplicationsError)
  }

  // Fetch application content data for each application
  const applicationContents: Record<string, ApplicationContent | null> = {}
  
  if (jobApplications && jobApplications.length > 0) {
    for (const application of jobApplications) {
      const { data: contentData, error: contentError } = await supabase
        .from('application_content')
        .select('*')
        .eq('job_application_id', application.id)
        .single()
        
      if (contentError && contentError.code !== 'PGRST116') { // PGRST116 is "not found" which is normal if no content exists
        console.error(`Error fetching content for application ${application.id}:`, contentError)
      }
      
      applicationContents[application.id] = contentData
    }
  }

  // Read flash messages from cookies
  const message = (await cookies()).get('flashMessage')?.value || null;
  const errorMessage = (await cookies()).get('flashError')?.value || null;

  // Clear the cookies after reading them
  if (message) {
    (await cookies()).set('flashMessage', '', { path: '/job-applications', maxAge: 0 });
  }
  if (errorMessage) {
    (await cookies()).set('flashError', '', { path: '/job-applications', maxAge: 0 });
  }

  return (
    <div className="flex flex-col items-center pt-8 sm:pt-12 md:pt-16 pb-8 bg-gray-200 dark:bg-gray-950 min-h-screen">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 md:px-8 space-y-4 sm:space-y-6">
        {/* Responsive header section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4 sm:mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Job Applications</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Track and manage your job applications</p>
          </div>
          
          {/* Navigation buttons in a responsive container */}
          <div className="flex flex-wrap gap-2 sm:gap-3 w-full sm:w-auto justify-start sm:justify-end">
            <Link 
              href="/application"
              className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium bg-purple-500/30 dark:bg-purple-600/30 backdrop-blur-md border border-purple-300/40 dark:border-purple-500/30 text-purple-900 dark:text-white rounded-lg shadow-md hover:bg-purple-500/50 dark:hover:bg-purple-600/50 hover:shadow-lg transition-all duration-300 ease-in-out focus:ring-2 focus:ring-purple-500/50 focus:outline-none cursor-pointer"
            >
              Your AI-pplication
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

        {/* Job Applications Content */}
        <div className="p-4 sm:p-6 bg-blue-50/50 dark:bg-indigo-950/70 backdrop-blur-lg rounded-xl border border-blue-200/40 dark:border-indigo-800/50 shadow-xl">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">Your Job Applications</h2>
            <div className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block">
              Status key: 
              <span className="ml-2 px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">Applied</span>
              <span className="ml-2 px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">Interviewed</span>
              <span className="ml-2 px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Offered</span>
              <span className="ml-2 px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">Rejected</span>
            </div>
          </div>

          {(!jobApplications || jobApplications.length === 0) ? (
            <div className="text-center p-8 bg-white/50 dark:bg-gray-800/50 rounded-lg backdrop-blur-sm shadow-inner">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray-400 dark:text-gray-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-gray-600 dark:text-gray-300 text-lg font-medium mb-2">No job applications found</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                Use the Chrome extension to apply for jobs and track them here, or manually add applications you've submitted elsewhere.
              </p>
              {/* Optional - Link to Chrome extension or add manual application button */}
              <div className="mt-6">
                <a 
                  href="https://chrome.google.com/webstore/category/extensions" 
                  target="_blank"
                  rel="noopener noreferrer" 
                  className="px-4 py-2 text-sm font-medium bg-indigo-500/30 dark:bg-indigo-600/30 backdrop-blur-md border border-indigo-300/40 dark:border-indigo-500/30 text-indigo-900 dark:text-white rounded-lg shadow-md hover:bg-indigo-500/50 dark:hover:bg-indigo-600/50 hover:shadow-lg transition-all duration-300 ease-in-out focus:ring-2 focus:ring-indigo-500/50 focus:outline-none cursor-pointer"
                >
                  Get the Chrome Extension
                </a>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-4 sm:-mx-6">
              {/* Mobile card view - only visible on small screens */}
              <div className="sm:hidden space-y-4 px-4">
                {jobApplications.map((job: JobApplication) => (
                  <ApplicationCard 
                    key={job.id} 
                    application={job} 
                    applicationContent={applicationContents[job.id] || null}
                  />
                ))}
              </div>
              
              {/* Desktop table view - hidden on small screens */}
              <div className="hidden sm:block">
                <table className="min-w-full divide-y divide-gray-300 dark:divide-gray-700">
                  <thead>
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Company</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Job Title</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden md:table-cell">Location</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date Applied</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                    {jobApplications.map((job: JobApplication) => (
                      <ApplicationRow 
                        key={job.id} 
                        application={job} 
                        applicationContent={applicationContents[job.id] || null}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 