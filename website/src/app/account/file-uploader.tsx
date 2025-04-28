'use client'

import React, { useState, useCallback, useEffect, useTransition } from 'react'
import { createClient } from '@/utils/supabase/client' // Use client component Supabase client
import { deleteProfileFile } from '@/app/account/actions' // Import the delete action

interface FileUploaderProps {
  userId: string
  fileType: 'resume' | 'cover_letter' // To determine storage path and update field
  currentFileUrl: string | null // To display current file and maybe offer download/delete
  bucketName: string // e.g., 'user_files'
  onUploadSuccess: (filePath: string, fileType: 'resume' | 'cover_letter') => void // Callback after successful upload
  onDeleteSuccess: (fileType: 'resume' | 'cover_letter') => void; // Add callback for when delete happens, so parent can potentially update profile state
  label: string // e.g., 'Resume/CV'
}

const FileUploader: React.FC<FileUploaderProps> = ({ 
  userId,
  fileType,
  currentFileUrl,
  bucketName,
  onUploadSuccess,
  onDeleteSuccess, // Receive the new callback
  label
}) => {
  const supabase = createClient()
  const [uploading, setUploading] = useState(false)
  const [deleting, startDeleteTransition] = useTransition(); // State for delete button
  const [error, setError] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [progress, setProgress] = useState(0)
  const [displayUrl, setDisplayUrl] = useState<string | null>(null); // Keep track of display URL

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setError(null) // Clear previous errors
    setProgress(0)
    if (event.target.files && event.target.files.length > 0) {
      setSelectedFile(event.target.files[0])
    } else {
      setSelectedFile(null)
    }
  }

  const handleUpload = useCallback(async () => {
    if (!selectedFile) {
      setError('Please select a file first.')
      return
    }
    if (!userId) {
        setError('User ID is missing, cannot upload.')
        return
    }

    setUploading(true)
    setError(null)
    setProgress(0)

    const fileExt = selectedFile.name.split('.').pop()
    const filePath = `${userId}/${fileType}-${Date.now()}.${fileExt}` // Unique path within user's folder

    try {
      const { data, error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(filePath, selectedFile, {
          cacheControl: '3600',
          upsert: true, // Overwrite if file with same name exists (consider implications)
          // Track progress
          // Note: Supabase JS v2 progress tracking might require specific setup or libraries
          // For now, we simulate basic progress based on upload state
        });

        // Basic progress simulation
        setProgress(50); // Halfway after initiating

      if (uploadError) {
        console.error('Upload Error:', uploadError)
        throw uploadError
      }

       // Assuming upload is successful if no error is thrown
       setProgress(100); // Complete
       console.log('File uploaded successfully. Path:', filePath)
       // Construct the public URL (or retrieve it if not automatically returned)
       // Note: Retrieving public URL might need separate call if bucket isn't public
       // For RLS-protected buckets, generating signed URLs might be necessary for temporary access/downloads.
       // Assuming a simple path-based access for now, which might need adjustment based on policies.
       // The ACTUAL URL stored might need to be just the filePath, and generated on the fly when needed.
       
       // For simplicity, we pass the filePath back. The parent component/action can decide how to store/use it.
      onUploadSuccess(filePath, fileType); 
      setSelectedFile(null) // Clear selection after success
      // Update display URL after successful upload/profile update via parent
      // Or rely on parent component passing down updated currentFileUrl

    } catch (err: any) {
      console.error('Upload failed:', err)
      setError(`Upload failed: ${err.message || 'Unknown error'}`)
       setProgress(0); // Reset progress on error
    } finally {
      setUploading(false)
    }
  }, [selectedFile, userId, fileType, bucketName, supabase, onUploadSuccess])

  // --- Delete Handler ---
  const handleDelete = () => {
    if (!currentFileUrl) {
      alert('No file to delete.');
      return;
    }
    // Optional: Confirmation dialog
    if (!confirm(`Are you sure you want to delete your ${fileType.replace('_',' ')}? This cannot be undone.`)) {
        return;
    }

    setError(null); // Clear previous errors
    startDeleteTransition(async () => {
      const result = await deleteProfileFile(fileType);
      if (result?.error) {
        setError(`Failed to delete: ${result.error}`);
        alert(`Failed to delete ${fileType.replace('_',' ')}: ${result.error}`); // Show error
      } else {
        alert(`${fileType.replace('_',' ')} deleted successfully.`);
        setSelectedFile(null); // Clear selection if any
        setDisplayUrl(null); // Clear display URL immediately
        onDeleteSuccess(fileType); // Notify parent component
      }
    });
  };

  // Function to get public URL (if bucket is public) or trigger download via signed URL
  const getFileUrl = useCallback(async (path: string): Promise<string | null> => {
     if(!path) return null;
      try {
          // Attempt to get public URL - works only for public buckets
          const { data } = supabase.storage.from(bucketName).getPublicUrl(path);
          if (data?.publicUrl) {
              return data.publicUrl;
          }
          // If not public or error, consider generating signed URL for download (requires server-side logic or different approach)
          console.warn('Could not get public URL. Bucket might not be public or path is incorrect.');
          // TODO: Implement signed URL generation if needed
          return null; 
      } catch (error) {
          console.error('Error getting file URL:', error);
          return null;
      }
  }, [supabase, bucketName]);

  // Display current file link (async to fetch URL if needed)
  useEffect(() => {
    let isMounted = true;
    if (currentFileUrl) {
        // Assuming currentFileUrl is the path, try to get a displayable URL
        getFileUrl(currentFileUrl).then(url => {
            if (isMounted) setDisplayUrl(url);
        });
    } else {
        if (isMounted) setDisplayUrl(null);
    }
    return () => { isMounted = false }; // Cleanup
  }, [currentFileUrl, getFileUrl]);

  return (
    <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-md mb-4">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        {label}
      </label>
      
      {/* Display Current File Info and Delete Button */}
      {currentFileUrl && (
        <div className="mb-3 flex justify-between items-center">
          <div className="text-sm">
            {displayUrl ? (
                <a href={displayUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-600 dark:text-indigo-400 hover:underline">
                    View Current {fileType.replace('_',' ')} 
                </a>
            ) : (
                <span className="text-gray-500 dark:text-gray-400">Current file stored (link unavailable)</span>
            )}
          </div>
          <button 
            onClick={handleDelete}
            disabled={deleting}
            className="text-xs text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {deleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      )}
      {!currentFileUrl && (
         <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">No {fileType.replace('_',' ')} uploaded.</p>
      )}

      <input
        type="file"
        accept=".pdf,.doc,.docx" // Specify acceptable file types
        onChange={handleFileChange}
        disabled={uploading || deleting} // Disable if uploading or deleting
        key={selectedFile ? 'file-selected' : 'file-not-selected'} // Force re-render on file change/clear
        className="block w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 dark:file:bg-indigo-900 file:text-indigo-700 dark:file:text-indigo-300 hover:file:bg-indigo-100 dark:hover:file:bg-indigo-800 disabled:opacity-50"
      />
      {selectedFile && (
        <div className="mt-2 text-sm text-gray-600 dark:text-gray-300">
          Selected: {selectedFile.name} ({ (selectedFile.size / 1024).toFixed(2) } KB)
        </div>
      )}
      <button
        onClick={handleUpload}
        disabled={uploading || deleting || !selectedFile}
        className="btn-secondary mt-3 w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {uploading ? `Uploading (${progress}%)` : 'Upload Selected File'}
      </button>
      {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  )
}

export default FileUploader 