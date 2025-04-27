'use client'

import { useState, useEffect } from 'react'
import { getProfile, updateProfile } from './actions'
import type { Profile } from '@/types/database'
import Link from 'next/link'

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadProfile() {
      setLoading(true)
      setError('')
      setMessage('')
      const fetchedProfile = await getProfile()
      setProfile(fetchedProfile)
      setLoading(false)

      // Check for messages/errors passed via URL query params
      const params = new URLSearchParams(window.location.search)
      if (params.get('message')) {
        setMessage(params.get('message')!)
      }
      if (params.get('error')) {
        setError(params.get('error')!)
      }
    }
    loadProfile()
  }, [])

  const renderInputField = (id: keyof Profile, label: string, type = 'text') => (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </label>
      <input
        id={id}
        name={id} // Ensure name matches the key for FormData
        type={type}
        defaultValue={profile?.[id] ?? ''}
        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-500 dark:text-white"
      />
    </div>
  )

   const renderTextareaField = (id: keyof Profile, label: string) => (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </label>
      <textarea
        id={id}
        name={id}
        rows={4}
        defaultValue={profile?.[id] ?? ''}
        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-500 dark:text-white"
      />
    </div>
  )

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading profile...</div>
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-12 bg-gray-100 dark:bg-gray-900">
      <div className="w-full max-w-2xl p-8 space-y-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
         <Link href="/account" className="text-sm text-blue-600 hover:underline dark:text-blue-400 mb-4 block">&larr; Back to Account</Link>
        <h1 className="text-2xl font-bold text-center text-gray-900 dark:text-white">Your Applicant Profile</h1>
        <p className="text-center text-sm text-gray-500 dark:text-gray-400">
            Keep this information up-to-date for the extension to use.
        </p>

        {message && <p className="text-center text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900 p-2 rounded-md">{message}</p>}
        {error && <p className="text-center text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900 p-2 rounded-md">{error}</p>}

        <form action={updateProfile} className="space-y-4">
          {renderInputField('full_name', 'Full Name')}
          {renderInputField('phone_number', 'Phone Number', 'tel')}
          {renderInputField('address', 'Address')}
          {renderInputField('linkedin_url', 'LinkedIn Profile URL', 'url')}
          {renderInputField('portfolio_url', 'Portfolio/Website URL', 'url')}
          {renderInputField('resume_url', 'Resume URL (or filename if using storage)')}
          {renderTextareaField('cover_letter_template', 'Base Cover Letter Template')}

          {/* Add file upload input for resume later if needed */}
          
          <button 
            type="submit"
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800"
          >
            Update Profile
          </button>
        </form>
      </div>
    </div>
  )
} 