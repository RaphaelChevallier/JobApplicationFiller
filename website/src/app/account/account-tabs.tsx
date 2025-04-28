'use client'

import { useState, useEffect, useCallback, useTransition } from 'react'
import type { User } from '@supabase/supabase-js'
import { type Profile, type Education } from '@/types/database'
import { signOut as signOutAction, updateProfile as updateProfileAction, addEducation as addEducationAction, deleteEducation as deleteEducationAction, updateEducation as updateEducationAction } from './actions'
import LocationAutocomplete from './location-autocomplete' // Import the new component
import FileUploader from './file-uploader' // Import the new component
import SchoolAutocomplete from './school-autocomplete' // Import school autocomplete
import { createClient } from '@/utils/supabase/client' // Add import for client Supabase

// Helper function for input field class names (Glassmorphism)
const glassInputFieldClasses = "mt-1 block w-full px-3 py-2 rounded-md shadow-sm bg-white/10 dark:bg-black/10 border border-white/20 dark:border-white/10 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-gray-100";
const glassInputDisabledClasses = "bg-gray-300/10 dark:bg-gray-700/10 text-gray-600 dark:text-gray-400 cursor-not-allowed";
const glassInputLabelClasses = "block text-sm font-medium text-gray-800 dark:text-gray-200";

// Placeholder components for tab content
const MainInfoTab = ({ user, profile, updateProfile }: { user: User, profile: Profile | null, updateProfile: any }) => {
  // State for controlled components (optional, could rely purely on defaultValue)
  const [firstName, setFirstName] = useState(profile?.first_name || '')
  const [lastName, setLastName] = useState(profile?.last_name || '')
  const [phone, setPhone] = useState(profile?.phone || '')
  const [location, setLocation] = useState(profile?.location || '')

  // Update state if profile data loads after initial render
  useEffect(() => {
    if (profile) {
      setFirstName(profile.first_name || '')
      setLastName(profile.last_name || '')
      setPhone(profile.phone || '')
      setLocation(profile.location || '')
    }
  }, [profile])

  // Callback for LocationAutocomplete
  const handleLocationSelect = (selectedLocation: string) => {
    setLocation(selectedLocation); 
    // No need to manually set FormData, the input field's value is updated
  };

  return (
    // Glassmorphism Form Container
    <form action={updateProfile} className="space-y-6 mt-6 p-6 bg-white/10 dark:bg-black/20 backdrop-blur-lg rounded-xl border border-white/20 shadow-lg">
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Main Information</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6"> {/* Increased gap */}
        <div>
          <label htmlFor="firstName" className={glassInputLabelClasses}>First Name</label>
          <input 
            id="firstName" 
            name="firstName" 
            type="text" 
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className={glassInputFieldClasses}
           />
        </div>

        <div>
          <label htmlFor="lastName" className={glassInputLabelClasses}>Last Name</label>
          <input 
            id="lastName" 
            name="lastName" 
            type="text" 
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className={glassInputFieldClasses}
           />
        </div>

        <div className="md:col-span-2">
          <label htmlFor="email" className={glassInputLabelClasses}>Email</label>
          <input id="email" type="text" value={user?.email || ''} disabled className={`${glassInputFieldClasses} ${glassInputDisabledClasses}`} />
        </div>

        <div>
          <label htmlFor="phone" className={glassInputLabelClasses}>Phone</label>
          <input 
            id="phone" 
            name="phone" 
            type="tel" 
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className={glassInputFieldClasses}
           />
        </div>

        {/* Location Autocomplete - needs internal styling adjustment for glassmorphism */}
        <div className="relative"> {/* Wrapper for positioning if needed */}
             <LocationAutocomplete initialValue={location} onLocationSelect={handleLocationSelect} />
        </div>

      </div> 
      
      <button type="submit" className="w-full btn-glass-primary mt-6">Save Main Info</button>
    </form>
  );
};

// --- Files Tab Placeholder --- (Renamed from AttachmentsTab)
const FilesTab = ({ user, profile, updateProfile }: { user: User, profile: Profile | null, updateProfile: (formData: FormData) => Promise<void | never> }) => {
  const supabase = createClient(); // Now defined
  const bucketName = 'user_files'; // Match the bucket name you created

  // Callback function when upload succeeds
  const handleUploadSuccess = useCallback(async (filePath: string, fileType: 'resume' | 'cover_letter') => {
    console.log(`Upload success for ${fileType}:`, filePath);
    // Create FormData to update the profile with the new file path
    const formData = new FormData();
    formData.append(fileType === 'resume' ? 'resume_url' : 'cover_letter_url', filePath);
    // Add user ID or necessary identifiers if your updateProfile action needs them beyond the Supabase client context
    // formData.append('userId', user.id); // Example if needed

    try {
      // Call the existing updateProfile action to save the path to the database
      await updateProfile(formData);
      // Optionally show a success message here or rely on page redirect message
      alert(`${fileType === 'resume' ? 'Resume' : 'Cover Letter'} path saved successfully!`); 
      // TODO: Force re-fetch or update local profile state to show new link immediately if needed
    } catch (error) {
      console.error('Error updating profile after upload:', error);
      alert(`Failed to save ${fileType === 'resume' ? 'Resume' : 'Cover Letter'} path.`);
    }
  }, [updateProfile, user.id]); // Include dependencies

  // Callback function when delete succeeds (passed to FileUploader)
  const handleDeleteSuccess = useCallback((fileType: 'resume' | 'cover_letter') => {
    console.log(`${fileType} deleted successfully from parent perspective.`);
    // The FileUploader handles the alert.
    // Here you could potentially force a re-fetch of the profile if needed,
    // but the profile state is managed in the parent `AccountTabs` and page.
    // Server action revalidation should handle data updates.
  }, []); // No dependencies needed for this simple version

  return (
    // Glassmorphism Container for Files Tab
    <div className="mt-6 space-y-8 p-6 bg-white/10 dark:bg-black/20 backdrop-blur-lg rounded-xl border border-white/20 shadow-lg">
      <h3 className="text-lg font-medium text-gray-900 dark:text-white">Files</h3>
      
      <FileUploader 
        userId={user.id}
        fileType="resume"
        currentFileUrl={profile?.resume_url || null}
        bucketName={bucketName}
        onUploadSuccess={handleUploadSuccess}
        onDeleteSuccess={handleDeleteSuccess} // Pass the handler
        label="Resume/CV (.pdf, .doc, .docx)"
      />

      <FileUploader 
        userId={user.id}
        fileType="cover_letter"
        currentFileUrl={profile?.cover_letter_url || null}
        bucketName={bucketName}
        onUploadSuccess={handleUploadSuccess}
        onDeleteSuccess={handleDeleteSuccess} // Pass the handler
        label="Cover Letter (.pdf, .doc, .docx)"
      />
      
      {/* Optional: Add notes about file size limits or types */}
      <p className="text-sm text-gray-600 dark:text-gray-400 pt-2">Upload your latest resume and a generic cover letter. Supported formats: PDF, DOC, DOCX.</p>
    </div>
  );
};

// --- Education Tab Component ---
const EducationTab = ({ user, education: initialEducation }: { user: User, education: Education[] }) => {
  const [educationList, setEducationList] = useState(initialEducation);
  const [showAddForm, setShowAddForm] = useState(false);
  const [isDeleting, startDeleteTransition] = useTransition(); // For delete button state
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null); // Track the ID being edited

  // Add Form State
  const [schoolName, setSchoolName] = useState('');
  const [degree, setDegree] = useState('');
  const [fieldOfStudy, setFieldOfStudy] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Degree options from migration enum
  const degreeOptions = [
    'High School',
    'Associate\'s Degree',
    'Bachelor\'s Degree',
    'Master\'s Degree',
    'Master of Business Administration (M.B.A.)',
    'Juris Doctor (J.D.)',
    'Doctor of Medicine (M.D.)',
    'Doctor of Philosophy (Ph.D.)',
    'Other',
    'Not Applicable'
  ];

  // Function to format date for input type="month" (YYYY-MM)
  const formatDateForInput = (dateString: string | null | undefined) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      // Check if the date is valid before formatting
      if (isNaN(date.getTime())) return ''; 
      // Adjust for timezone offset before formatting to avoid month shifting
      date.setMinutes(date.getMinutes() + date.getTimezoneOffset());
      return date.toISOString().slice(0, 7); // YYYY-MM
    } catch (e) {
      console.error("Error formatting date:", dateString, e);
      return '';
    }
  };

  // Populate form for editing
  const handleEditClick = (edu: Education) => {
    setEditingId(edu.id);
    setSchoolName(edu.school_name || '');
    setDegree(edu.degree || '');
    setFieldOfStudy(edu.field_of_study || '');
    setStartDate(formatDateForInput(edu.start_date));
    setEndDate(formatDateForInput(edu.end_date));
    setShowAddForm(true); // Show the form
  };

  // Reset form fields and editing state
  const resetForm = () => {
    setEditingId(null);
    setSchoolName('');
    setDegree('');
    setFieldOfStudy('');
    setStartDate('');
    setEndDate('');
    setShowAddForm(false);
  };

  // Handle delete click
  const handleDelete = async (id: string) => {
    setDeleteError(null); // Clear previous errors
    // Optional: Add confirmation dialog
    if (!confirm('Are you sure you want to delete this education entry?')) {
        return;
    }
    startDeleteTransition(async () => {
      const result = await deleteEducationAction(id);
      if (result?.error) {
        setDeleteError(result.error);
        alert(`Error deleting entry: ${result.error}`); // Or use a better notification
      } else {
        // Optimistically update UI or wait for revalidation
        setEducationList(prev => prev.filter(edu => edu.id !== id));
         alert('Education entry deleted.'); // Or use a better notification
         // If the deleted item was being edited, reset the form
         if (editingId === id) {
             resetForm();
         }
      }
    });
  };

  // Update local state when initial data changes (e.g., after adding/deleting/updating via server action revalidation)
  useEffect(() => {
    setEducationList(initialEducation);
  }, [initialEducation]);

  return (
    // Glassmorphism Container for Education Tab
    <div className="mt-6 space-y-6 p-6 bg-white/10 dark:bg-black/20 backdrop-blur-lg rounded-xl border border-white/20 shadow-lg">
      <div className="flex justify-between items-center mb-4">
         <h3 className="text-lg font-medium text-gray-900 dark:text-white">Education</h3>
         {!showAddForm && (
           <button onClick={() => setShowAddForm(true)} className="btn-glass-secondary text-sm">+ Add Education</button>
         )}
      </div>

      {/* Add/Edit Education Form (conditionally rendered) */}
      {showAddForm && (
        // Conditionally set action based on whether we are editing
        <form 
           action={editingId ? updateEducationAction : addEducationAction} 
           onSubmit={() => setTimeout(() => { resetForm(); }, 100)} 
           // Glassmorphism Inner Form Container
           className="p-6 border border-white/20 bg-white/5 dark:bg-black/10 backdrop-blur-sm rounded-lg space-y-4 mb-6 shadow-inner" 
        >
            <h4 className="text-md font-medium text-gray-800 dark:text-gray-200">
                {editingId ? 'Edit Education Entry' : 'Add New Education Entry'}
            </h4>
            
            {editingId && <input type="hidden" name="educationId" value={editingId} />}

            {/* SchoolAutocomplete - needs internal styling adjustment */}
            <div className="relative">
                <SchoolAutocomplete 
                  initialValue={schoolName}
                  onSchoolSelect={setSchoolName}
                />
            </div>

            <div>
                <label htmlFor="degree" className={glassInputLabelClasses}>Degree</label>
                <select 
                    id="degree" name="degree" value={degree}
                    onChange={(e) => setDegree(e.target.value)}
                    className={glassInputFieldClasses}
                >
                    <option value="">Select Degree (Optional)</option>
                    {degreeOptions.map(opt => <option key={opt} value={opt} className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">{opt}</option>)}
                </select>
            </div>

            <div>
                <label htmlFor="fieldOfStudy" className={glassInputLabelClasses}>Field of Study</label>
                <input 
                    id="fieldOfStudy" name="fieldOfStudy" type="text" value={fieldOfStudy}
                    onChange={(e) => setFieldOfStudy(e.target.value)}
                    className={glassInputFieldClasses}
                    placeholder="e.g., Computer Science"
                 />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label htmlFor="startDate" className={glassInputLabelClasses}>Start Date</label>
                    <input 
                        id="startDate" name="startDate" type="month" 
                        value={startDate} 
                        onChange={(e) => setStartDate(e.target.value)}
                        className={glassInputFieldClasses}
                    />
                </div>
                 <div>
                    <label htmlFor="endDate" className={glassInputLabelClasses}>End Date (or Expected)</label>
                    <input 
                        id="endDate" name="endDate" type="month" 
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className={glassInputFieldClasses}
                     />
                </div>
            </div>

            <div className="flex justify-end space-x-3 pt-2"> {/* Increased space */}
                 <button type="button" onClick={resetForm} className="btn-glass-secondary">Cancel</button>
                 <button type="submit" className="btn-glass-primary">
                     {editingId ? 'Update Entry' : 'Add Entry'}
                 </button>
            </div>
        </form>
      )}

      {/* List of Education Entries */}
      <div className="space-y-4"> {/* Increased space */}
        {educationList.length === 0 && !showAddForm && (
            <p className="text-sm text-gray-500 dark:text-gray-400">No education history added yet.</p>
        )}
        {educationList.map(edu => (
          // Glassmorphism List Item
          <div key={edu.id} className="flex justify-between items-start p-4 border border-white/20 bg-white/5 dark:bg-black/10 backdrop-blur-sm rounded-lg gap-4 shadow-md">
            {/* Info Section */}
            <div className="flex-grow">
              <p className="font-semibold text-gray-800 dark:text-gray-100 capitalize">{edu.school_name}</p>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {edu.degree}{edu.field_of_study ? ` - ${edu.field_of_study}` : ''}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {formatDateForInput(edu.start_date) || 'N/A'} - 
                {formatDateForInput(edu.end_date) || 'Present'}
              </p>
            </div>
            {/* Buttons Section */}
            <div className="flex space-x-3 flex-shrink-0"> {/* Increased space */}
               <button 
                 onClick={() => handleEditClick(edu)}
                 disabled={isDeleting} 
                 className="btn-glass-edit text-sm"
                >
                  Edit
               </button>
               <button 
                 onClick={() => handleDelete(edu.id)}
                 disabled={isDeleting}
                 className="btn-glass-delete text-sm"
                >
                  {isDeleting ? '...' : 'Delete'} {/* Shortened deleting text */}
               </button>
            </div>
          </div>
        ))}
        {deleteError && <p className="mt-2 text-sm text-red-500 dark:text-red-400">{deleteError}</p>} 
      </div>
    </div>
  );
};

interface AccountTabsProps {
  user: User
  profile: Profile | null
  education: Education[]
  updateProfile: (formData: FormData) => Promise<void | never>;
  signOut: () => Promise<never>;
}

export default function AccountTabs({ 
  user,
  profile,
  education,
  updateProfile, // Received from page.tsx
  signOut // Received from page.tsx
}: AccountTabsProps) {
  const [activeTab, setActiveTab] = useState('main');

  // Updated Tab Classes for Glassmorphism
  const tabClasses = (tabName: string) => {
    const baseClasses = "px-4 py-2 text-sm font-medium rounded-t-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500/50 dark:focus:ring-offset-gray-900 transition-all duration-200 ease-in-out border-b-2";
    const activeClasses = "bg-white/20 dark:bg-black/30 backdrop-blur-md border-indigo-500 text-indigo-700 dark:text-indigo-300 shadow-md";
    const inactiveClasses = "bg-white/5 dark:bg-black/10 backdrop-blur-sm border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300/50 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:border-gray-600/50";
    
    return `${baseClasses} ${activeTab === tabName ? activeClasses : inactiveClasses}`;
  }

  return (
    // Added a subtle gradient background for the page context
    <div className="w-full max-w-4xl mx-auto p-4 md:p-6 lg:p-8 rounded-lg"> 
      {/* Tab Navigation */}
      <div className="mb-6"> {/* Removed border-b, handled by tabs */}
        <nav className="flex space-x-2" aria-label="Tabs"> {/* Reduced space */}
          <button onClick={() => setActiveTab('main')} className={tabClasses('main')}>
            Main Info
          </button>
          {/* Rename Attachments to Files */}
          <button onClick={() => setActiveTab('files')} className={tabClasses('files')}>
            Files 
          </button>
          <button onClick={() => setActiveTab('education')} className={tabClasses('education')}>
            Education
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div className="min-h-[300px]"> {/* Set min height for content area */}
        {activeTab === 'main' && <MainInfoTab user={user} profile={profile} updateProfile={updateProfile} />} 
        {/* Use 'files' state and render FilesTab */}
        {activeTab === 'files' && <FilesTab user={user} profile={profile} updateProfile={updateProfile} />} 
        {activeTab === 'education' && <EducationTab user={user} education={education} />} 
      </div>

       {/* Divider */}
       <hr className="my-8 border-white/20 dark:border-white/10" />

      {/* Sign Out - Moved inside the Tabs component for context */}
       <form action={signOutAction}> { /* Use aliased import */}
          <button 
            type="submit"
            className="w-full btn-glass-delete mt-6" // Use glassmorphism delete style
          >
            Sign Out
          </button>
        </form>
    </div>
  );
} 