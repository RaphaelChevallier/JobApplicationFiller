'use client'

import { useState } from 'react'
import { JobApplication, ApplicationContent } from '@/types/database'
import { updateApplicationStatus, updateApplicationNotes, deleteApplication } from '../actions'

interface ApplicationRowProps {
  application: JobApplication
  applicationContent?: ApplicationContent | null
}

export default function ApplicationRow({ application, applicationContent }: ApplicationRowProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isUpdateStatusOpen, setIsUpdateStatusOpen] = useState(false)
  const [isUpdateNotesOpen, setIsUpdateNotesOpen] = useState(false)
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)
  const [isContentViewOpen, setIsContentViewOpen] = useState(false)
  const [status, setStatus] = useState(application.application_status || 'applied')
  const [notes, setNotes] = useState(application.notes || '')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Format date helper
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  // Handle status update
  const handleStatusUpdate = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const result = await updateApplicationStatus(application.id, status)
      
      if (!result.success) {
        setError(result.error || 'Failed to update status')
      } else {
        setIsUpdateStatusOpen(false)
      }
    } catch (err) {
      setError('An unexpected error occurred')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  // Handle notes update
  const handleNotesUpdate = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const result = await updateApplicationNotes(application.id, notes)
      
      if (!result.success) {
        setError(result.error || 'Failed to update notes')
      } else {
        setIsUpdateNotesOpen(false)
      }
    } catch (err) {
      setError('An unexpected error occurred')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  // Handle application deletion
  const handleDelete = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const result = await deleteApplication(application.id)
      
      if (!result.success) {
        setError(result.error || 'Failed to delete application')
      } else {
        setIsDeleteConfirmOpen(false)
        // The server action will revalidate the page and remove this application
      }
    } catch (err) {
      setError('An unexpected error occurred')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  // Status color helper
  const getStatusStyles = (status: string) => {
    switch (status) {
      case 'applied':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      case 'interviewed':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      case 'offered':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'rejected':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
    }
  }

  return (
    <tr className="hover:bg-gray-50 dark:hover:bg-gray-900/50">
      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{application.company_name || 'Unknown'}</td>
      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
        <a href={application.job_url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 dark:text-indigo-400 hover:underline">
          {application.job_title || 'Unknown Position'}
        </a>
      </td>
      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white hidden md:table-cell">{application.job_location || 'Unknown'}</td>
      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
        {formatDate(application.application_date)}
      </td>
      <td className="px-4 py-4 whitespace-nowrap text-sm">
        <div className="flex items-center gap-2">
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusStyles(application.application_status)}`}>
            {application.application_status || 'Unknown'}
          </span>
          <button 
            onClick={() => setIsUpdateStatusOpen(true)}
            className="p-1 text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400"
            aria-label="Update status"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </button>
        </div>
      </td>
      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
        <div className="relative">
          <button 
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 flex items-center gap-1"
            aria-label="Application options"
          >
            Actions
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>

          {/* Dropdown Menu */}
          {isMenuOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg z-10 border border-gray-200 dark:border-gray-700">
              <div className="py-1">
                <button
                  onClick={() => {
                    setIsUpdateStatusOpen(true)
                    setIsMenuOpen(false)
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  Update Status
                </button>
                <button
                  onClick={() => {
                    setIsUpdateNotesOpen(true)
                    setIsMenuOpen(false)
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  Add/Edit Notes
                </button>
                <button
                  onClick={() => {
                    setIsContentViewOpen(true)
                    setIsMenuOpen(false)
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  View Application Content
                </button>
                <button
                  onClick={() => {
                    setIsDeleteConfirmOpen(true)
                    setIsMenuOpen(false)
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  Delete Application
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Status Update Modal */}
        {isUpdateStatusOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6 shadow-xl">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Update Application Status</h3>
              
              {error && (
                <div className="p-3 mb-4 text-sm text-red-700 bg-red-100 rounded-lg dark:bg-red-200 dark:text-red-800" role="alert">
                  {error}
                </div>
              )}
              
              <div className="mb-4">
                <label htmlFor="status" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Status
                </label>
                <select
                  id="status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-gray-900 dark:text-white"
                  disabled={isLoading}
                >
                  <option value="applied">Applied</option>
                  <option value="interviewed">Interviewed</option>
                  <option value="offered">Offered</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
              
              <div className="flex justify-end gap-3">
                <button 
                  type="button"
                  onClick={() => setIsUpdateStatusOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none"
                  disabled={isLoading}
                >
                  Cancel
                </button>
                <button 
                  type="button"
                  onClick={handleStatusUpdate}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none"
                  disabled={isLoading}
                >
                  {isLoading ? 'Updating...' : 'Update Status'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Notes Update Modal */}
        {isUpdateNotesOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6 shadow-xl">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Application Notes</h3>
              
              {error && (
                <div className="p-3 mb-4 text-sm text-red-700 bg-red-100 rounded-lg dark:bg-red-200 dark:text-red-800" role="alert">
                  {error}
                </div>
              )}
              
              <div className="mb-4">
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Notes
                </label>
                <textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={5}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-gray-900 dark:text-white"
                  placeholder="Add details about the application, interview, salary discussed, etc."
                  disabled={isLoading}
                />
              </div>
              
              <div className="flex justify-end gap-3">
                <button 
                  type="button"
                  onClick={() => setIsUpdateNotesOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none"
                  disabled={isLoading}
                >
                  Cancel
                </button>
                <button 
                  type="button"
                  onClick={handleNotesUpdate}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none"
                  disabled={isLoading}
                >
                  {isLoading ? 'Saving...' : 'Save Notes'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {isDeleteConfirmOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6 shadow-xl">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Delete Application</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Are you sure you want to delete this application? This action cannot be undone.
              </p>
              
              {error && (
                <div className="p-3 mb-4 text-sm text-red-700 bg-red-100 rounded-lg dark:bg-red-200 dark:text-red-800" role="alert">
                  {error}
                </div>
              )}
              
              <div className="flex justify-end gap-3">
                <button 
                  type="button"
                  onClick={() => setIsDeleteConfirmOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none"
                  disabled={isLoading}
                >
                  Cancel
                </button>
                <button 
                  type="button"
                  onClick={handleDelete}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none"
                  disabled={isLoading}
                >
                  {isLoading ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Application Content Modal */}
        {isContentViewOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg max-w-xl w-full p-6 shadow-xl h-[90vh] max-h-[90vh] flex flex-col">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Application Content</h3>
              
              <div className="overflow-y-auto flex-grow">
                {/* Application Content */}
                {applicationContent ? (
                  <div className="space-y-4">
                    {/* Resume */}
                    <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Resume Used</h4>
                      {applicationContent.resume_used ? (
                        <a 
                          href={applicationContent.resume_used} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-indigo-600 dark:text-indigo-400 text-sm hover:underline"
                        >
                          View Resume
                        </a>
                      ) : (
                        <p className="text-sm text-gray-500 dark:text-gray-400">No resume data available</p>
                      )}
                    </div>

                    {/* Cover Letter */}
                    <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Cover Letter Used</h4>
                      {applicationContent.cover_letter_used ? (
                        <a 
                          href={applicationContent.cover_letter_used} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-indigo-600 dark:text-indigo-400 text-sm hover:underline"
                        >
                          View Cover Letter
                        </a>
                      ) : (
                        <p className="text-sm text-gray-500 dark:text-gray-400">No cover letter data available</p>
                      )}
                    </div>

                    {/* Form Answers */}
                    {applicationContent.answers_provided && (
                      <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Form Answers</h4>
                        <div className="max-h-64 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded-md p-3 text-sm">
                          {Object.entries(applicationContent.answers_provided).map(([field, value]) => (
                            <div key={field} className="mb-2 pb-2 border-b border-gray-200 dark:border-gray-600 last:border-0">
                              <p className="font-medium text-gray-700 dark:text-gray-300">{field}</p>
                              <p className="text-gray-600 dark:text-gray-400">{value}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Custom Fields */}
                    {applicationContent.custom_fields && (
                      <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Additional Information</h4>
                        <div className="max-h-64 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded-md p-3 text-sm">
                          {Object.entries(applicationContent.custom_fields).map(([field, value]) => (
                            <div key={field} className="mb-2 pb-2 border-b border-gray-200 dark:border-gray-600 last:border-0">
                              <p className="font-medium text-gray-700 dark:text-gray-300">{field}</p>
                              <p className="text-gray-600 dark:text-gray-400">{value}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-40 text-center">
                    <p className="text-gray-600 dark:text-gray-400 mb-2">No application content available</p>
                    <p className="text-sm text-gray-500 dark:text-gray-500">The chrome extension didn't store content for this application or you applied manually.</p>
                  </div>
                )}
              </div>
              
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button 
                  type="button"
                  onClick={() => setIsContentViewOpen(false)}
                  className="w-full px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </td>
    </tr>
  )
} 