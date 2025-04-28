'use client'

import React, { useState } from 'react'
import FileUploader from './file-uploader'
import { updateProfile } from './actions' // Assuming updateProfile handles file URL updates
import type { Profile } from '@/types/database' // Use the correct path

interface FilesTabProps {
  profile: Profile | null
}

const FilesTab: React.FC<FilesTabProps> = ({ profile }) => {
  const userId = profile?.id

  // Local state to immediately reflect changes, potentially overriding profile prop until re-fetch
  const [resumeUrl, setResumeUrl] = useState(profile?.resume_url ?? null);
  const [coverLetterUrl, setCoverLetterUrl] = useState(profile?.cover_letter_url ?? null);

  if (!profile || !userId) {
    return <div>Loading profile or user not found...</div>
  }

  const handleUploadSuccess = async (filePath: string, fileType: 'resume' | 'cover_letter') => {
    console.log(`Handling upload success for ${fileType}. Path: ${filePath}`);

    // Construct FormData for the updateProfile action
    const formData = new FormData();
    if (fileType === 'resume') {
      formData.append('resume_url', filePath);
    } else {
      formData.append('cover_letter_url', filePath);
    }
    // Add user ID if needed by the action, assuming it might require it
    // formData.append('id', userId);

    try {
      const result: unknown = await updateProfile(formData);

      // More robust type check
      if (typeof result === 'object' && result !== null && 'error' in result && typeof (result as any).error === 'string') {
        throw new Error((result as any).error);
      } else if (result instanceof Error) { // Check if the action itself threw/returned an Error
        throw result;
      }

      // Update local state immediately
      if (fileType === 'resume') {
        setResumeUrl(filePath);
      } else {
        setCoverLetterUrl(filePath);
      }

      // Revalidation should happen within updateProfile or via route handler
    } catch (error: any) {
      console.error(`Failed to update profile after ${fileType} upload:`, error);
    }
  };

  // Callback for when a file is deleted via FileUploader
  const handleDeleteSuccess = (fileType: 'resume' | 'cover_letter') => {
    console.log(`Handling delete success for ${fileType}.`);
    // Clear the local state to reflect the deletion immediately
    if (fileType === 'resume') {
      setResumeUrl(null);
    } else {
      setCoverLetterUrl(null);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Manage Files</h2>
      
      <FileUploader 
        userId={userId}
        fileType="resume"
        currentFileUrl={resumeUrl} // Use local state
        bucketName="user_files" // Replace with your actual bucket name
        onUploadSuccess={handleUploadSuccess}
        onDeleteSuccess={handleDeleteSuccess} // Pass the delete handler
        label="Resume/CV (PDF, DOC, DOCX)"
      />

      <FileUploader 
        userId={userId}
        fileType="cover_letter"
        currentFileUrl={coverLetterUrl} // Use local state
        bucketName="user_files" // Replace with your actual bucket name
        onUploadSuccess={handleUploadSuccess}
        onDeleteSuccess={handleDeleteSuccess} // Pass the delete handler
        label="Cover Letter (PDF, DOC, DOCX)"
      />

       {/* Status Message Display - Handled by Layout/Page reading URL Params */}
       {/* <StatusMessage /> */}
    </div>
  )
}

export default FilesTab 