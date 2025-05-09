'use client'

import { useState, useEffect, useCallback, useTransition } from 'react'
import type { User } from '@supabase/supabase-js'
import { type Profile, type Education, type WorkExperience, type Skill, type Reference } from '@/types/database'
import { 
  signOut as signOutAction, 
  updateProfile as updateProfileAction, 
  addEducation as addEducationAction, 
  deleteEducation as deleteEducationAction, 
  updateEducation as updateEducationAction 
} from './actions'
import FileUploader from './file-uploader'
import SchoolAutocomplete from './school-autocomplete'
import { createClient } from '@/utils/supabase/client'
import toast, { Toaster } from 'react-hot-toast'
import { profileSaveRateLimiter, fileUploadRateLimiter, createRateLimiter } from '@/utils/rate-limiter'

// Helper function for input field class names (Glassmorphism) - Increased contrast
const glassInputFieldClasses = "mt-1 block w-full px-3 py-2 rounded-md shadow-sm bg-white/20 dark:bg-black/20 border border-gray-300/50 dark:border-gray-700/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-gray-100";
const glassInputDisabledClasses = "bg-gray-300/10 dark:bg-gray-700/10 text-gray-600 dark:text-gray-400 cursor-not-allowed";
const glassInputLabelClasses = "block text-sm font-medium text-gray-800 dark:text-gray-200";

// Create shared rate limiters for different tabs
const languagesRateLimiter = createRateLimiter('language operation');
const skillsRateLimiter = createRateLimiter('skill operation');
const workExperienceRateLimiter = createRateLimiter('experience operation');
const referencesRateLimiter = createRateLimiter('reference operation');

// Placeholder components for tab content
const MainInfoTab = ({ user, profile, updateProfile }: { user: User, profile: Profile | null, updateProfile: (formData: FormData) => Promise<{ success: boolean, error?: string } | void> }) => {
  // State for controlled components
  const [firstName, setFirstName] = useState(profile?.first_name || '')
  const [lastName, setLastName] = useState(profile?.last_name || '')
  const [phone, setPhone] = useState(profile?.phone || '')

  // New address fields state
  const [streetAddress, setStreetAddress] = useState(profile?.street_address || '');
  const [addressLine2, setAddressLine2] = useState(profile?.address_line_2 || '');
  const [city, setCity] = useState(profile?.city || '');
  const [selectedCountry, setSelectedCountry] = useState(profile?.country || 'United States'); // Default to US
  const [countryInput, setCountryInput] = useState('');
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [stateProvince, setStateProvince] = useState(profile?.state_province || '');
  const [zipPostalCode, setZipPostalCode] = useState(profile?.zip_postal_code || '');
  
  // State for loading/saving status
  const [isSaving, setIsSaving] = useState(false);

  // Country options
  const countries = ["United States", "Canada"];

  // Update state if profile data loads after initial render
  useEffect(() => {
    if (profile) {
      setFirstName(profile.first_name || '')
      setLastName(profile.last_name || '')
      setPhone(profile.phone || '')

      // Populate new address fields
      setStreetAddress(profile.street_address || '');
      setAddressLine2(profile.address_line_2 || '');
      setCity(profile.city || '');
      
      // Set the country - this handles both dropdown selections and custom entries
      const country = profile.country || 'United States';
      setSelectedCountry(country);
      
      setStateProvince(profile.state_province || '');
      setZipPostalCode(profile.zip_postal_code || '');
    }
  }, [profile])

  // Data for State/Province dropdowns
  const usStates = [
    'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware', 'Florida', 
    'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana', 'Maine', 
    'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 
    'New Hampshire', 'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 
    'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah', 
    'Vermont', 'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming'
  ];
  const canadianProvinces = [
    'Alberta', 'British Columbia', 'Manitoba', 'New Brunswick', 'Newfoundland and Labrador', 'Nova Scotia', 'Ontario', 
    'Prince Edward Island', 'Quebec', 'Saskatchewan', 'Northwest Territories', 'Nunavut', 'Yukon'
  ];

  // Handle country change from dropdown
  const handleCountryDropdownChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setSelectedCountry(value);
    setStateProvince('');
  };

  // Handle direct country input
  const handleCountryInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSelectedCountry(value);
    setCountryInput(value);
    setShowCountryDropdown(true);
    
    // If the country is changed to something other than US/Canada, clear state/province
    if (value !== 'United States' && value !== 'Canada') {
      setStateProvince('');
    }
  };

  // Handle country selection from dropdown
  const selectCountry = (country: string) => {
    setSelectedCountry(country);
    setCountryInput('');
    setShowCountryDropdown(false);
    
    // Clear state/province when switching countries
    setStateProvince('');
  };
  
  const getStateProvinceLabel = () => {
    if (selectedCountry === "United States") return "State";
    if (selectedCountry === "Canada") return "Province";
    return "Province / Region";
  };

  const getZipPostalLabel = () => {
    if (selectedCountry === "United States") return "Zip Code";
    if (selectedCountry === "Canada") return "Postal Code";
    return "Postal / Zip Code";
  };

  // Custom form submission handler
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    
    // Check rate limiter before proceeding
    const rateLimit = profileSaveRateLimiter.checkAndRecord();
    if (!rateLimit.allowed) {
      toast.error(rateLimit.reason || 'Too many save attempts. Please try again later.', {
        duration: 10000,
        position: 'bottom-right',
        style: {
          background: '#FEE2E2',
          color: '#991B1B',
          borderRadius: '10px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        },
      });
      return;
    }
    
    setIsSaving(true);
    
    const formData = new FormData(event.currentTarget);
    
    // Ensure country is not null - default to United States if empty
    if (!formData.get('country') || formData.get('country') === '') {
      formData.set('country', 'United States');
    }
    
    try {
      const result = await updateProfile(formData);
      
      if (!result) {
        // If void is returned (old behavior), show a generic success message
        toast.success('Profile updated successfully', {
          duration: 10000,
          position: 'bottom-right',
          style: {
            background: '#D1FAE5',
            color: '#065F46',
            borderRadius: '10px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          },
        });
      } else if (result.success) {
        toast.success('Profile updated successfully', {
          duration: 10000,
          position: 'bottom-right',
          style: {
            background: '#D1FAE5',
            color: '#065F46',
            borderRadius: '10px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          },
        });
      } else {
        toast.error(result.error || 'Failed to update profile', {
          duration: 10000,
          position: 'bottom-right',
          style: {
            background: '#FEE2E2',
            color: '#991B1B',
            borderRadius: '10px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          },
        });
      }
    } catch (error) {
      toast.error('An unexpected error occurred', {
        duration: 10000,
        position: 'bottom-right',
      });
      console.error('Form submission error:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    // Glassmorphism Form Container
    <form onSubmit={handleSubmit} className="space-y-6 mt-6 p-6 bg-blue-50/50 dark:bg-indigo-950/70 backdrop-blur-lg rounded-xl border border-blue-200/40 dark:border-indigo-800/50 shadow-xl">
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Main Information</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
      </div>

      {/* New Address Fields Section */}
      <div className="pt-4 border-t border-blue-200/30 dark:border-indigo-800/40">
        <h4 className="text-md font-medium text-gray-900 dark:text-white mb-4">Address</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <label htmlFor="streetAddress" className={glassInputLabelClasses}>Street Address</label>
            <input 
              id="streetAddress" 
              name="street_address"
              type="text" 
              value={streetAddress}
              onChange={(e) => setStreetAddress(e.target.value)}
              className={glassInputFieldClasses}
              placeholder="123 Main St"
            />
          </div>

          <div className="md:col-span-2">
            <label htmlFor="addressLine2" className={glassInputLabelClasses}>Address Line 2 (Optional)</label>
            <input 
              id="addressLine2" 
              name="address_line_2"
              type="text" 
              value={addressLine2}
              onChange={(e) => setAddressLine2(e.target.value)}
              className={glassInputFieldClasses}
              placeholder="Apt, Suite, Unit, etc."
            />
          </div>

          <div>
            <label htmlFor="city" className={glassInputLabelClasses}>City</label>
            <input 
              id="city" 
              name="city"
              type="text" 
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className={glassInputFieldClasses}
            />
          </div>

          {/* Updated Country Input with Dropdown */}
          <div className="relative">
            <label htmlFor="country" className={glassInputLabelClasses}>Country</label>
            <input 
              id="country" 
              name="country"
              type="text" 
              value={selectedCountry}
              onChange={handleCountryInputChange}
              className={`${glassInputFieldClasses} w-full`}
              placeholder="Select or type a country"
              autoComplete="off"
              onFocus={() => setShowCountryDropdown(true)}
              onBlur={() => setTimeout(() => setShowCountryDropdown(false), 200)}
              required
            />
            {showCountryDropdown && (
              <div className="absolute left-0 right-0 z-10 mt-1 bg-white dark:bg-gray-800 shadow-lg rounded-lg border border-gray-200 dark:border-gray-700">
                {countries.map(country => (
                  <div 
                    key={country} 
                    className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                    onMouseDown={() => selectCountry(country)}
                  >
                    {country}
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div>
            <label htmlFor="stateProvince" className={glassInputLabelClasses}>{getStateProvinceLabel()}</label>
            {selectedCountry === "United States" && (
              <select
                id="stateProvince"
                name="state_province"
                value={stateProvince}
                onChange={(e) => setStateProvince(e.target.value)}
                className={glassInputFieldClasses}
              >
                <option value="" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">Select State...</option>
                {usStates.map(s => <option key={s} value={s} className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">{s}</option>)}
              </select>
            )}
            {selectedCountry === "Canada" && (
              <select
                id="stateProvince"
                name="state_province"
                value={stateProvince}
                onChange={(e) => setStateProvince(e.target.value)}
                className={glassInputFieldClasses}
              >
                <option value="" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">Select Province...</option>
                {canadianProvinces.map(p => <option key={p} value={p} className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">{p}</option>)}
              </select>
            )}
            {(selectedCountry !== "United States" && selectedCountry !== "Canada") && (
              <input
                id="stateProvince"
                name="state_province"
                type="text"
                value={stateProvince}
                onChange={(e) => setStateProvince(e.target.value)}
                className={glassInputFieldClasses}
                placeholder="Province / Region"
              />
            )}
          </div>

          <div>
            <label htmlFor="zipPostalCode" className={glassInputLabelClasses}>{getZipPostalLabel()}</label>
            <input
              id="zipPostalCode"
              name="zip_postal_code"
              type="text"
              value={zipPostalCode}
              onChange={(e) => setZipPostalCode(e.target.value)}
              className={glassInputFieldClasses}
              placeholder={selectedCountry === "United States" ? "e.g., 12345" : "Postal / Zip Code"}
            />
          </div>
        </div>
      </div>
      
      <button 
        type="submit" 
        disabled={isSaving}
        className="w-full px-5 py-3 text-base font-medium bg-indigo-500/30 dark:bg-indigo-600/30 backdrop-blur-md border border-indigo-300/40 dark:border-indigo-500/30 text-indigo-900 dark:text-white rounded-lg shadow-lg hover:bg-indigo-500/50 dark:hover:bg-indigo-600/50 hover:shadow-xl transition-all duration-300 ease-in-out focus:ring-2 focus:ring-indigo-500/50 focus:outline-none mt-6 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
      >
        {isSaving ? (
          <span className="flex items-center justify-center">
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-indigo-900 dark:text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Saving...
          </span>
        ) : 'Save Main Info'}
      </button>
    </form>
  );
};

// --- Files Tab Placeholder --- (Renamed from AttachmentsTab)
const FilesTab = ({ user, profile, updateProfile }: { user: User, profile: Profile | null, updateProfile: (formData: FormData) => Promise<{ success: boolean, error?: string } | void> }) => {
  const supabase = createClient(); 
  const bucketName = 'user_files';

  // State for the checkbox
  const [forceExactResume, setForceExactResume] = useState(profile?.force_exact_resume ?? false);
  const [isPending, startTransition] = useTransition(); // For checkbox saving state

  // Update checkbox state if profile data changes
  useEffect(() => {
    setForceExactResume(profile?.force_exact_resume ?? false);
  }, [profile?.force_exact_resume]);

  // Handler for checkbox change
  const handleCheckboxChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const isChecked = event.target.checked;
    
    // Check rate limiter before proceeding
    const rateLimit = profileSaveRateLimiter.checkAndRecord();
    if (!rateLimit.allowed) {
      toast.error(rateLimit.reason || 'Too many save attempts. Please try again later.', {
        duration: 10000,
        position: 'bottom-right',
        style: {
          background: '#FEE2E2',
          color: '#991B1B',
          borderRadius: '10px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        },
      });
      return;
    }
    
    setForceExactResume(isChecked);

    startTransition(async () => {
      const formData = new FormData();
      formData.append('force_exact_resume', isChecked.toString());
      try {
        const result = await updateProfile(formData);
        
        if (!result || result.success) {
          toast.success('Resume preference saved', {
            duration: 10000,
            position: 'bottom-right',
            style: {
              background: '#D1FAE5',
              color: '#065F46',
              borderRadius: '10px',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            },
          });
        } else {
          throw new Error(result.error || 'Unknown error');
        }
      } catch (error) {
        console.error("Error updating force_exact_resume:", error);
        // Revert state on error
        setForceExactResume(!isChecked); 
        toast.error('Failed to save resume preference', {
          duration: 10000,
          position: 'bottom-right',
          style: {
            background: '#FEE2E2',
            color: '#991B1B',
            borderRadius: '10px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          },
        });
      }
    });
  };

  // Callback function when upload succeeds
  const handleUploadSuccess = useCallback(async (filePath: string, fileType: 'resume' | 'cover_letter') => {
    console.log(`Upload success for ${fileType}:`, filePath);
    
    // Check rate limiter before proceeding
    const rateLimit = fileUploadRateLimiter.checkAndRecord();
    if (!rateLimit.allowed) {
      toast.error(rateLimit.reason || 'Too many upload attempts. Please try again later.', {
        duration: 10000,
        position: 'bottom-right',
        style: {
          background: '#FEE2E2',
          color: '#991B1B',
          borderRadius: '10px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        },
      });
      return;
    }
    
    // Create FormData to update the profile with the new file path
    const formData = new FormData();
    formData.append(fileType === 'resume' ? 'resume_url' : 'cover_letter_url', filePath);
    // Add user ID or necessary identifiers if your updateProfile action needs them beyond the Supabase client context
    // formData.append('userId', user.id); // Example if needed

    try {
      // Call the existing updateProfile action to save the path to the database
      const result = await updateProfile(formData);
      
      // Show success toast
      if (!result || result.success) {
        toast.success(`${fileType === 'resume' ? 'Resume' : 'Cover Letter'} uploaded successfully!`, {
          duration: 10000,
          position: 'bottom-right',
          style: {
            background: '#D1FAE5',
            color: '#065F46',
            borderRadius: '10px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          },
        });
      } else {
        throw new Error(result.error || 'Unknown error');
      }
    } catch (error) {
      console.error('Error updating profile after upload:', error);
      toast.error(`Failed to save ${fileType === 'resume' ? 'Resume' : 'Cover Letter'}`, {
        duration: 10000,
        position: 'bottom-right',
        style: {
          background: '#FEE2E2',
          color: '#991B1B',
          borderRadius: '10px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        },
      });
    }
  }, [updateProfile]);

  // Callback function when delete succeeds (passed to FileUploader)
  const handleDeleteSuccess = useCallback((fileType: 'resume' | 'cover_letter') => {
    console.log(`${fileType} deleted successfully from parent perspective.`);
    // The FileUploader handles the alert.
    // Here you could potentially force a re-fetch of the profile if needed,
    // but the profile state is managed in the parent `AccountTabs` and page.
    // Server action revalidation should handle data updates.
  }, []); // No dependencies needed for this simple version

  return (
    // Glassmorphism Container for Files Tab - Added color tint
    <div className="mt-6 space-y-8 p-6 bg-blue-50/50 dark:bg-indigo-950/70 backdrop-blur-lg rounded-xl border border-blue-200/40 dark:border-indigo-800/50 shadow-xl">
      <h3 className="text-lg font-medium text-gray-900 dark:text-white">Files</h3>
      
      {/* Explanatory Text */}
      <div className="p-4 bg-blue-100/30 dark:bg-indigo-800/30 backdrop-blur-sm rounded-md border border-blue-200/50 dark:border-indigo-700/50 shadow-inner">
        <p className="text-sm text-gray-800 dark:text-gray-100">
          <strong>AI Assistance:</strong> Our AI requires a template and can tailor your uploaded cover letter (and potentially your resume, unless disabled) to better match specific job descriptions when you apply. 
        </p>
        <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
          The goal is to highlight your most relevant skills and experiences for each application.
        </p>
      </div>

      <FileUploader 
        userId={user.id}
        fileType="resume"
        currentFileUrl={profile?.resume_url || null}
        bucketName={bucketName}
        onUploadSuccess={handleUploadSuccess}
        onDeleteSuccess={handleDeleteSuccess} // Pass the handler
        label="Resume/CV (.pdf, .doc, .docx)"
      />

      {/* Force Exact Resume Checkbox */}
      {profile?.resume_url && ( // Only show if a resume is uploaded
        <div className="flex items-center space-x-2 pl-1">
          <input
            type="checkbox"
            id="forceExactResume"
            name="force_exact_resume" 
            checked={forceExactResume}
            onChange={handleCheckboxChange}
            disabled={isPending} // Disable while saving
            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded disabled:opacity-50"
          />
          <label htmlFor="forceExactResume" className="text-sm font-medium text-gray-800 dark:text-gray-200">
            AI must use this resume exactly as uploaded (no modifications).
          </label>
          {isPending && <span className="text-xs text-gray-500">(Saving...)</span>}
        </div>
      )}

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
    // Glassmorphism container - Added color tint
    <div className="mt-6 p-6 bg-blue-50/50 dark:bg-indigo-950/70 backdrop-blur-lg rounded-xl border border-blue-200/40 dark:border-indigo-800/50 shadow-xl space-y-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">Education History</h3>
        {!showAddForm && (
          <button onClick={() => setShowAddForm(true)} className="px-4 py-2 text-sm font-medium bg-white/10 dark:bg-black/20 backdrop-blur-md border border-white/20 dark:border-white/10 text-gray-800 dark:text-white rounded-lg shadow-lg hover:bg-white/30 dark:hover:bg-black/40 hover:shadow-xl transition-all duration-300 ease-in-out focus:ring-2 focus:ring-indigo-500/50 focus:outline-none cursor-pointer">+ Add Education</button>
        )}
      </div>

      {/* Add/Edit Education Form (conditionally rendered) */}
      {showAddForm && (
        // Conditionally set action based on whether we are editing
        <form 
           action={editingId ? updateEducationAction : addEducationAction} 
           onSubmit={() => setTimeout(() => { resetForm(); }, 100)} 
            // Glassmorphism Inner Form Container - Added color tint (slightly different)
           className="p-6 border border-blue-100/30 dark:border-indigo-700/40 bg-blue-50/30 dark:bg-indigo-900/40 backdrop-blur-sm rounded-lg space-y-4 mb-6 shadow-inner" 
        >
             <h4 className="text-md font-semibold text-gray-800 dark:text-gray-100 mb-3">{editingId ? 'Edit Education' : 'Add New Education'}</h4>
            
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
                 <button type="button" onClick={resetForm} className="px-4 py-2 text-sm font-medium bg-white/10 dark:bg-black/20 backdrop-blur-md border border-white/20 dark:border-white/10 text-gray-800 dark:text-white rounded-lg shadow-lg hover:bg-white/30 dark:hover:bg-black/40 hover:shadow-xl transition-all duration-300 ease-in-out focus:ring-2 focus:ring-indigo-500/50 focus:outline-none cursor-pointer">Cancel</button>
                 <button type="submit" className="px-4 py-2 text-sm font-medium bg-indigo-500/30 dark:bg-indigo-600/30 backdrop-blur-md border border-indigo-300/40 dark:border-indigo-500/30 text-indigo-900 dark:text-white rounded-lg shadow-lg hover:bg-indigo-500/50 dark:hover:bg-indigo-600/50 hover:shadow-xl transition-all duration-300 ease-in-out focus:ring-2 focus:ring-indigo-500/50 focus:outline-none cursor-pointer">
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
          // Glassmorphism List Item - Added color tint
          <div key={edu.id} className="flex justify-between items-start p-4 border border-blue-100/30 dark:border-indigo-800/40 bg-blue-50/20 dark:bg-indigo-900/30 backdrop-blur-sm rounded-lg gap-4 shadow-md">
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
                 className="px-3 py-1.5 text-xs font-medium bg-blue-500/20 dark:bg-blue-600/20 backdrop-blur-md border border-blue-300/30 dark:border-blue-500/20 text-blue-900 dark:text-blue-300 rounded-lg shadow-lg hover:bg-blue-500/40 dark:hover:bg-blue-600/40 hover:shadow-xl transition-all duration-300 ease-in-out focus:ring-2 focus:ring-blue-500/50 focus:outline-none cursor-pointer"
                >
                  Edit
               </button>
               <button 
                 onClick={() => handleDelete(edu.id)}
                 disabled={isDeleting}
                 className="px-3 py-1.5 text-xs font-medium bg-red-500/20 dark:bg-red-600/20 backdrop-blur-md border border-red-300/30 dark:border-red-500/20 text-red-900 dark:text-red-300 rounded-lg shadow-lg hover:bg-red-500/40 dark:hover:bg-red-600/40 hover:shadow-xl transition-all duration-300 ease-in-out focus:ring-2 focus:ring-red-500/50 focus:outline-none cursor-pointer"
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

// --- Work Experience Tab Component ---
const WorkExperienceTab = ({ user }: { user: User }) => {
  const [experienceList, setExperienceList] = useState<any[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [isDeleting, startDeleteTransition] = useTransition();
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [companyName, setCompanyName] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [location, setLocation] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isCurrentPosition, setIsCurrentPosition] = useState(false);
  const [description, setDescription] = useState('');

  // Function to format date for input type="month" (YYYY-MM)
  const formatDateForInput = (dateString: string | null | undefined) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      // Check if date is valid
      if (isNaN(date.getTime())) return '';
      date.setMinutes(date.getMinutes() + date.getTimezoneOffset());
      return date.toISOString().slice(0, 7); // YYYY-MM
    } catch (e) {
      console.error("Error formatting date:", dateString, e);
      return '';
    }
  };

  // Fetch work experience data
  useEffect(() => {
    const fetchWorkExperience = async () => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('work_experience')
          .select('*')
          .eq('user_id', user.id)
          .order('end_date', { ascending: false });

        if (error) {
          console.error('Error fetching work experience:', error);
          return;
        }

        setExperienceList(data || []);
      } catch (error) {
        console.error('Error in fetch operation:', error);
      }
    };

    fetchWorkExperience();
  }, [user.id]);

  // Handle edit click
  const handleEditClick = (exp: any) => {
    setEditingId(exp.id);
    setCompanyName(exp.company_name || '');
    setJobTitle(exp.job_title || '');
    setLocation(exp.location || '');
    setStartDate(formatDateForInput(exp.start_date));
    setEndDate(formatDateForInput(exp.end_date));
    setIsCurrentPosition(exp.is_current_position || false);
    setDescription(exp.description || '');
    setShowAddForm(true);
  };

  // Reset form
  const resetForm = () => {
    setEditingId(null);
    setCompanyName('');
    setJobTitle('');
    setLocation('');
    setStartDate('');
    setEndDate('');
    setIsCurrentPosition(false);
    setDescription('');
    setShowAddForm(false);
  };

  // Handle add/update work experience
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();

    try {
      const workExperienceData = {
        user_id: user.id,
        company_name: companyName,
        job_title: jobTitle,
        location,
        start_date: startDate ? `${startDate}-01` : null,
        end_date: isCurrentPosition ? null : (endDate ? `${endDate}-01` : null),
        is_current_position: isCurrentPosition,
        description
      };

      let result;

      if (editingId) {
        // Update existing entry
        result = await supabase
          .from('work_experience')
          .update(workExperienceData)
          .eq('id', editingId);
      } else {
        // Add new entry
        result = await supabase
          .from('work_experience')
          .insert([workExperienceData]);
      }

      if (result.error) {
        throw result.error;
      }

      // Refresh the data
      const { data } = await supabase
        .from('work_experience')
        .select('*')
        .eq('user_id', user.id)
        .order('end_date', { ascending: false });

      setExperienceList(data || []);
      resetForm();
    } catch (error: any) {
      console.error('Error saving work experience:', error.message);
      alert(`Error saving work experience: ${error.message}`);
    }
  };

  // Handle delete
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this work experience entry?')) {
      return;
    }

    const supabase = createClient();
    setDeleteError(null);

    startDeleteTransition(async () => {
      const { error } = await supabase
        .from('work_experience')
        .delete()
        .eq('id', id);

      if (error) {
        setDeleteError(error.message);
        alert(`Error deleting entry: ${error.message}`);
      } else {
        // Update the list
        setExperienceList(prev => prev.filter(exp => exp.id !== id));
        if (editingId === id) {
          resetForm();
        }
      }
    });
  };

  return (
    <div className="mt-6 p-6 bg-blue-50/50 dark:bg-indigo-950/70 backdrop-blur-lg rounded-xl border border-blue-200/40 dark:border-indigo-800/50 shadow-xl space-y-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">Work Experience</h3>
        {!showAddForm && (
          <button 
            onClick={() => setShowAddForm(true)} 
            className="px-4 py-2 text-sm font-medium bg-white/10 dark:bg-black/20 backdrop-blur-md border border-white/20 dark:border-white/10 text-gray-800 dark:text-white rounded-lg shadow-lg hover:bg-white/30 dark:hover:bg-black/40 hover:shadow-xl transition-all duration-300 ease-in-out focus:ring-2 focus:ring-indigo-500/50 focus:outline-none cursor-pointer"
          >
            + Add Experience
          </button>
        )}
      </div>

      {/* Add/Edit Experience Form */}
      {showAddForm && (
        <form 
          onSubmit={handleSubmit}
          className="p-6 border border-blue-100/30 dark:border-indigo-700/40 bg-blue-50/30 dark:bg-indigo-900/40 backdrop-blur-sm rounded-lg space-y-4 mb-6 shadow-inner"
        >
          <h4 className="text-md font-semibold text-gray-800 dark:text-gray-100 mb-3">
            {editingId ? 'Edit Work Experience' : 'Add New Work Experience'}
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="companyName" className={glassInputLabelClasses}>Company Name</label>
              <input 
                id="companyName" 
                type="text" 
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className={glassInputFieldClasses}
                required
              />
            </div>

            <div>
              <label htmlFor="jobTitle" className={glassInputLabelClasses}>Job Title</label>
              <input 
                id="jobTitle" 
                type="text" 
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                className={glassInputFieldClasses}
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="location" className={glassInputLabelClasses}>Location</label>
            <input 
              id="location" 
              type="text" 
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className={glassInputFieldClasses}
              placeholder="City, State, Country"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="startDate" className={glassInputLabelClasses}>Start Date</label>
              <input 
                id="startDate" 
                type="month" 
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={glassInputFieldClasses}
              />
            </div>

            <div>
              <label htmlFor="endDate" className={glassInputLabelClasses}>End Date</label>
              <input 
                id="endDate" 
                type="month" 
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className={glassInputFieldClasses}
                disabled={isCurrentPosition}
              />
            </div>
          </div>

          <div className="flex items-center">
            <input 
              id="isCurrentPosition" 
              type="checkbox" 
              checked={isCurrentPosition}
              onChange={(e) => setIsCurrentPosition(e.target.checked)}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <label htmlFor="isCurrentPosition" className="ml-2 block text-sm text-gray-900 dark:text-gray-200">
              This is my current position
            </label>
          </div>

          <div>
            <label htmlFor="description" className={glassInputLabelClasses}>Description</label>
            <textarea 
              id="description" 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={`${glassInputFieldClasses} h-32`}
              placeholder="Describe your responsibilities and achievements"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-2">
            <button 
              type="button" 
              onClick={resetForm}
              className="px-4 py-2 text-sm font-medium bg-white/10 dark:bg-black/20 backdrop-blur-md border border-white/20 dark:border-white/10 text-gray-800 dark:text-white rounded-lg shadow-lg hover:bg-white/30 dark:hover:bg-black/40 hover:shadow-xl transition-all duration-300 ease-in-out focus:ring-2 focus:ring-indigo-500/50 focus:outline-none cursor-pointer"
            >
              Cancel
            </button>
            <button 
              type="submit"
              className="px-4 py-2 text-sm font-medium bg-indigo-500/30 dark:bg-indigo-600/30 backdrop-blur-md border border-indigo-300/40 dark:border-indigo-500/30 text-indigo-900 dark:text-white rounded-lg shadow-lg hover:bg-indigo-500/50 dark:hover:bg-indigo-600/50 hover:shadow-xl transition-all duration-300 ease-in-out focus:ring-2 focus:ring-indigo-500/50 focus:outline-none cursor-pointer"
            >
              {editingId ? 'Update Entry' : 'Add Entry'}
            </button>
          </div>
        </form>
      )}

      {/* List of Work Experience Entries */}
      <div className="space-y-4">
        {experienceList.length === 0 && !showAddForm && (
          <p className="text-sm text-gray-500 dark:text-gray-400">No work experience added yet.</p>
        )}

        {experienceList.map(exp => (
          <div key={exp.id} className="flex justify-between items-start p-4 border border-blue-100/30 dark:border-indigo-800/40 bg-blue-50/20 dark:bg-indigo-900/30 backdrop-blur-sm rounded-lg gap-4 shadow-md">
            <div className="flex-grow">
              <p className="font-semibold text-gray-800 dark:text-gray-100">{exp.job_title}</p>
              <p className="text-sm text-gray-600 dark:text-gray-300">{exp.company_name}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {formatDateForInput(exp.start_date) || 'N/A'} - {exp.is_current_position ? 'Present' : (formatDateForInput(exp.end_date) || 'N/A')}
              </p>
              {exp.location && (
                <p className="text-xs text-gray-500 dark:text-gray-400">{exp.location}</p>
              )}
              {exp.description && (
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 line-clamp-2">{exp.description}</p>
              )}
            </div>

            <div className="flex space-x-3 flex-shrink-0">
              <button 
                onClick={() => handleEditClick(exp)}
                disabled={isDeleting}
                className="px-3 py-1.5 text-xs font-medium bg-blue-500/20 dark:bg-blue-600/20 backdrop-blur-md border border-blue-300/30 dark:border-blue-500/20 text-blue-900 dark:text-blue-300 rounded-lg shadow-lg hover:bg-blue-500/40 dark:hover:bg-blue-600/40 hover:shadow-xl transition-all duration-300 ease-in-out focus:ring-2 focus:ring-blue-500/50 focus:outline-none cursor-pointer"
              >
                Edit
              </button>
              <button 
                onClick={() => handleDelete(exp.id)}
                disabled={isDeleting}
                className="px-3 py-1.5 text-xs font-medium bg-red-500/20 dark:bg-red-600/20 backdrop-blur-md border border-red-300/30 dark:border-red-500/20 text-red-900 dark:text-red-300 rounded-lg shadow-lg hover:bg-red-500/40 dark:hover:bg-red-600/40 hover:shadow-xl transition-all duration-300 ease-in-out focus:ring-2 focus:ring-red-500/50 focus:outline-none cursor-pointer"
              >
                {isDeleting ? '...' : 'Delete'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// --- Skills Tab Component ---
const SkillsTab = ({ user }: { user: User }) => {
  const [skillsList, setSkillsList] = useState<any[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [isDeleting, startDeleteTransition] = useTransition();
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [skillName, setSkillName] = useState('');
  const [proficiency, setProficiency] = useState('');

  // Proficiency options
  const proficiencyOptions = [
    'Beginner',
    'Intermediate',
    'Advanced',
    'Expert'
  ];

  // Fetch skills data
  useEffect(() => {
    const fetchSkills = async () => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('skills')
          .select('*')
          .eq('user_id', user.id)
          .order('skill_name', { ascending: true });

        if (error) {
          console.error('Error fetching skills:', error);
          return;
        }

        setSkillsList(data || []);
      } catch (error) {
        console.error('Error in fetch operation:', error);
      }
    };

    fetchSkills();
  }, [user.id]);

  // Handle edit click
  const handleEditClick = (skill: any) => {
    setEditingId(skill.id);
    setSkillName(skill.skill_name || '');
    setProficiency(skill.proficiency || '');
    setShowAddForm(true);
  };

  // Reset form
  const resetForm = () => {
    setEditingId(null);
    setSkillName('');
    setProficiency('');
    setShowAddForm(false);
  };

  // Handle add/update skill
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check rate limiter before proceeding
    const rateLimit = skillsRateLimiter.checkAndRecord();
    if (!rateLimit.allowed) {
      toast.error(rateLimit.reason || 'Too many skill operations. Please try again later.', {
        duration: 10000,
        position: 'bottom-right',
        style: {
          background: '#FEE2E2',
          color: '#991B1B',
          borderRadius: '10px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        },
      });
      return;
    }
    
    const supabase = createClient();

    try {
      const skillData = {
        user_id: user.id,
        skill_name: skillName,
        proficiency
      };

      let result;

      if (editingId) {
        // Update existing entry
        result = await supabase
          .from('skills')
          .update(skillData)
          .eq('id', editingId);
      } else {
        // Add new entry
        result = await supabase
          .from('skills')
          .insert([skillData]);
      }

      if (result.error) {
        throw result.error;
      }

      // Refresh the data
      const { data } = await supabase
        .from('skills')
        .select('*')
        .eq('user_id', user.id)
        .order('skill_name', { ascending: true });

      setSkillsList(data || []);
      resetForm();
    } catch (error: any) {
      console.error('Error saving skill:', error.message);
      alert(`Error saving skill: ${error.message}`);
    }
  };

  // Handle delete
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this skill?')) {
      return;
    }

    // Check rate limiter before proceeding
    const rateLimit = skillsRateLimiter.checkAndRecord();
    if (!rateLimit.allowed) {
      toast.error(rateLimit.reason || 'Too many skill operations. Please try again later.', {
        duration: 10000,
        position: 'bottom-right',
        style: {
          background: '#FEE2E2',
          color: '#991B1B',
          borderRadius: '10px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        },
      });
      return;
    }

    const supabase = createClient();
    setDeleteError(null);

    startDeleteTransition(async () => {
      const { error } = await supabase
        .from('skills')
        .delete()
        .eq('id', id);

      if (error) {
        setDeleteError(error.message);
        alert(`Error deleting skill: ${error.message}`);
      } else {
        // Update the list
        setSkillsList(prev => prev.filter(skill => skill.id !== id));
        if (editingId === id) {
          resetForm();
        }
      }
    });
  };

  return (
    <div className="mt-6 p-6 bg-blue-50/50 dark:bg-indigo-950/70 backdrop-blur-lg rounded-xl border border-blue-200/40 dark:border-indigo-800/50 shadow-xl space-y-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">Skills</h3>
        {!showAddForm && (
          <button 
            onClick={() => setShowAddForm(true)} 
            className="px-4 py-2 text-sm font-medium bg-white/10 dark:bg-black/20 backdrop-blur-md border border-white/20 dark:border-white/10 text-gray-800 dark:text-white rounded-lg shadow-lg hover:bg-white/30 dark:hover:bg-black/40 hover:shadow-xl transition-all duration-300 ease-in-out focus:ring-2 focus:ring-indigo-500/50 focus:outline-none cursor-pointer"
          >
            + Add Skill
          </button>
        )}
      </div>

      {/* Add/Edit Skill Form */}
      {showAddForm && (
        <form 
          onSubmit={handleSubmit}
          className="p-6 border border-blue-100/30 dark:border-indigo-700/40 bg-blue-50/30 dark:bg-indigo-900/40 backdrop-blur-sm rounded-lg space-y-4 mb-6 shadow-inner"
        >
          <h4 className="text-md font-semibold text-gray-800 dark:text-gray-100 mb-3">
            {editingId ? 'Edit Skill' : 'Add New Skill'}
          </h4>

          <div>
            <label htmlFor="skillName" className={glassInputLabelClasses}>Skill Name</label>
            <input 
              id="skillName" 
              type="text" 
              value={skillName}
              onChange={(e) => setSkillName(e.target.value)}
              className={glassInputFieldClasses}
              placeholder="e.g., JavaScript, Project Management, etc."
              required
            />
          </div>

          <div>
            <label htmlFor="proficiency" className={glassInputLabelClasses}>Proficiency Level</label>
            <select 
              id="proficiency" 
              value={proficiency}
              onChange={(e) => setProficiency(e.target.value)}
              className={glassInputFieldClasses}
            >
              <option value="">Select Proficiency Level</option>
              {proficiencyOptions.map(opt => (
                <option key={opt} value={opt} className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
                  {opt}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end space-x-3 pt-2">
            <button 
              type="button" 
              onClick={resetForm}
              className="px-4 py-2 text-sm font-medium bg-white/10 dark:bg-black/20 backdrop-blur-md border border-white/20 dark:border-white/10 text-gray-800 dark:text-white rounded-lg shadow-lg hover:bg-white/30 dark:hover:bg-black/40 hover:shadow-xl transition-all duration-300 ease-in-out focus:ring-2 focus:ring-indigo-500/50 focus:outline-none cursor-pointer"
            >
              Cancel
            </button>
            <button 
              type="submit"
              className="px-4 py-2 text-sm font-medium bg-indigo-500/30 dark:bg-indigo-600/30 backdrop-blur-md border border-indigo-300/40 dark:border-indigo-500/30 text-indigo-900 dark:text-white rounded-lg shadow-lg hover:bg-indigo-500/50 dark:hover:bg-indigo-600/50 hover:shadow-xl transition-all duration-300 ease-in-out focus:ring-2 focus:ring-indigo-500/50 focus:outline-none cursor-pointer"
            >
              {editingId ? 'Update Skill' : 'Add Skill'}
            </button>
          </div>
        </form>
      )}

      {/* Skills Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {skillsList.length === 0 && !showAddForm && (
          <p className="text-sm text-gray-500 dark:text-gray-400 col-span-3">No skills added yet.</p>
        )}

        {skillsList.map(skill => (
          <div key={skill.id} className="p-4 border border-blue-100/30 dark:border-indigo-800/40 bg-blue-50/20 dark:bg-indigo-900/30 backdrop-blur-sm rounded-lg shadow-md">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-semibold text-gray-800 dark:text-gray-100">{skill.skill_name}</p>
                {skill.proficiency && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">{skill.proficiency}</p>
                )}
              </div>
              <div className="flex space-x-2">
                <button 
                  onClick={() => handleEditClick(skill)}
                  disabled={isDeleting}
                  className="p-1 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 focus:outline-none cursor-pointer"
                >
                  Edit
                </button>
                <button 
                  onClick={() => handleDelete(skill.id)}
                  disabled={isDeleting}
                  className="p-1 text-xs text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 focus:outline-none cursor-pointer"
                >
                  {isDeleting ? '...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// --- References Tab Component ---
const ReferencesTab = ({ user }: { user: User }) => {
  const [referencesList, setReferencesList] = useState<any[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [isDeleting, startDeleteTransition] = useTransition();
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [fullName, setFullName] = useState('');
  const [company, setCompany] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [relationship, setRelationship] = useState('');

  // Relationship options
  const relationshipOptions = [
    'Manager',
    'Supervisor',
    'Colleague',
    'Direct Report',
    'Client',
    'Mentor',
    'Academic Advisor',
    'Other'
  ];

  // Fetch references data
  useEffect(() => {
    const fetchReferences = async () => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('references')
          .select('*')
          .eq('user_id', user.id);

        if (error) {
          console.error('Error fetching references:', error);
          return;
        }

        setReferencesList(data || []);
      } catch (error) {
        console.error('Error in fetch operation:', error);
      }
    };

    fetchReferences();
  }, [user.id]);

  // Handle edit click
  const handleEditClick = (reference: any) => {
    setEditingId(reference.id);
    setFullName(reference.full_name || '');
    setCompany(reference.company || '');
    setJobTitle(reference.job_title || '');
    setEmail(reference.email || '');
    setPhone(reference.phone || '');
    setRelationship(reference.relationship || '');
    setShowAddForm(true);
  };

  // Reset form
  const resetForm = () => {
    setEditingId(null);
    setFullName('');
    setCompany('');
    setJobTitle('');
    setEmail('');
    setPhone('');
    setRelationship('');
    setShowAddForm(false);
  };

  // Handle add/update reference
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();

    try {
      const referenceData = {
        user_id: user.id,
        full_name: fullName,
        company,
        job_title: jobTitle,
        email,
        phone,
        relationship
      };

      let result;

      if (editingId) {
        // Update existing entry
        result = await supabase
          .from('references')
          .update(referenceData)
          .eq('id', editingId);
      } else {
        // Add new entry
        result = await supabase
          .from('references')
          .insert([referenceData]);
      }

      if (result.error) {
        throw result.error;
      }

      // Refresh the data
      const { data } = await supabase
        .from('references')
        .select('*')
        .eq('user_id', user.id);

      setReferencesList(data || []);
      resetForm();
    } catch (error: any) {
      console.error('Error saving reference:', error.message);
      alert(`Error saving reference: ${error.message}`);
    }
  };

  // Handle delete
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this reference?')) {
      return;
    }

    const supabase = createClient();
    setDeleteError(null);

    startDeleteTransition(async () => {
      const { error } = await supabase
        .from('references')
        .delete()
        .eq('id', id);

      if (error) {
        setDeleteError(error.message);
        alert(`Error deleting reference: ${error.message}`);
      } else {
        // Update the list
        setReferencesList(prev => prev.filter(ref => ref.id !== id));
        if (editingId === id) {
          resetForm();
        }
      }
    });
  };

  return (
    <div className="mt-6 p-6 bg-blue-50/50 dark:bg-indigo-950/70 backdrop-blur-lg rounded-xl border border-blue-200/40 dark:border-indigo-800/50 shadow-xl space-y-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">Professional References</h3>
        {!showAddForm && (
          <button 
            onClick={() => setShowAddForm(true)} 
            className="px-4 py-2 text-sm font-medium bg-white/10 dark:bg-black/20 backdrop-blur-md border border-white/20 dark:border-white/10 text-gray-800 dark:text-white rounded-lg shadow-lg hover:bg-white/30 dark:hover:bg-black/40 hover:shadow-xl transition-all duration-300 ease-in-out focus:ring-2 focus:ring-indigo-500/50 focus:outline-none cursor-pointer"
          >
            + Add Reference
          </button>
        )}
      </div>

      {/* Add/Edit Reference Form */}
      {showAddForm && (
        <form 
          onSubmit={handleSubmit}
          className="p-6 border border-blue-100/30 dark:border-indigo-700/40 bg-blue-50/30 dark:bg-indigo-900/40 backdrop-blur-sm rounded-lg space-y-4 mb-6 shadow-inner"
        >
          <h4 className="text-md font-semibold text-gray-800 dark:text-gray-100 mb-3">
            {editingId ? 'Edit Reference' : 'Add New Reference'}
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="fullName" className={glassInputLabelClasses}>Full Name</label>
              <input 
                id="fullName" 
                type="text" 
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className={glassInputFieldClasses}
                placeholder="Jane Doe"
                required
              />
            </div>

            <div>
              <label htmlFor="relationship" className={glassInputLabelClasses}>Relationship</label>
              <select 
                id="relationship" 
                value={relationship}
                onChange={(e) => setRelationship(e.target.value)}
                className={glassInputFieldClasses}
              >
                <option value="">Select Relationship</option>
                {relationshipOptions.map(opt => (
                  <option key={opt} value={opt} className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="company" className={glassInputLabelClasses}>Company</label>
              <input 
                id="company" 
                type="text" 
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className={glassInputFieldClasses}
                placeholder="Company Name"
              />
            </div>

            <div>
              <label htmlFor="jobTitle" className={glassInputLabelClasses}>Job Title</label>
              <input 
                id="jobTitle" 
                type="text" 
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                className={glassInputFieldClasses}
                placeholder="Senior Manager"
              />
            </div>

            <div>
              <label htmlFor="email" className={glassInputLabelClasses}>Email</label>
              <input 
                id="email" 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={glassInputFieldClasses}
                placeholder="jane.doe@example.com"
              />
            </div>

            <div>
              <label htmlFor="phone" className={glassInputLabelClasses}>Phone</label>
              <input 
                id="phone" 
                type="tel" 
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className={glassInputFieldClasses}
                placeholder="(123) 456-7890"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-2">
            <button 
              type="button" 
              onClick={resetForm}
              className="px-4 py-2 text-sm font-medium bg-white/10 dark:bg-black/20 backdrop-blur-md border border-white/20 dark:border-white/10 text-gray-800 dark:text-white rounded-lg shadow-lg hover:bg-white/30 dark:hover:bg-black/40 hover:shadow-xl transition-all duration-300 ease-in-out focus:ring-2 focus:ring-indigo-500/50 focus:outline-none cursor-pointer"
            >
              Cancel
            </button>
            <button 
              type="submit"
              className="px-4 py-2 text-sm font-medium bg-indigo-500/30 dark:bg-indigo-600/30 backdrop-blur-md border border-indigo-300/40 dark:border-indigo-500/30 text-indigo-900 dark:text-white rounded-lg shadow-lg hover:bg-indigo-500/50 dark:hover:bg-indigo-600/50 hover:shadow-xl transition-all duration-300 ease-in-out focus:ring-2 focus:ring-indigo-500/50 focus:outline-none cursor-pointer"
            >
              {editingId ? 'Update Reference' : 'Add Reference'}
            </button>
          </div>
        </form>
      )}

      {/* References List */}
      <div className="space-y-4">
        {referencesList.length === 0 && !showAddForm && (
          <p className="text-sm text-gray-500 dark:text-gray-400">No references added yet.</p>
        )}

        {referencesList.map(reference => (
          <div key={reference.id} className="p-4 border border-blue-100/30 dark:border-indigo-800/40 bg-blue-50/20 dark:bg-indigo-900/30 backdrop-blur-sm rounded-lg shadow-md">
            <div className="flex justify-between">
              <div>
                <p className="font-semibold text-gray-800 dark:text-gray-100">{reference.full_name}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 text-sm">
                  {reference.company && (
                    <p className="text-gray-600 dark:text-gray-300">{reference.company}</p>
                  )}
                  {reference.job_title && (
                    <p className="text-gray-600 dark:text-gray-300">{reference.job_title}</p>
                  )}
                  {reference.relationship && (
                    <p className="text-gray-500 dark:text-gray-400 text-xs">Relationship: {reference.relationship}</p>
                  )}
                  {reference.email && (
                    <p className="text-gray-500 dark:text-gray-400 text-xs">{reference.email}</p>
                  )}
                  {reference.phone && (
                    <p className="text-gray-500 dark:text-gray-400 text-xs">{reference.phone}</p>
                  )}
                </div>
              </div>
              <div className="flex space-x-3 flex-shrink-0">
                <button 
                  onClick={() => handleEditClick(reference)}
                  disabled={isDeleting}
                  className="px-3 py-1.5 text-xs font-medium bg-blue-500/20 dark:bg-blue-600/20 backdrop-blur-md border border-blue-300/30 dark:border-blue-500/20 text-blue-900 dark:text-blue-300 rounded-lg shadow-lg hover:bg-blue-500/40 dark:hover:bg-blue-600/40 hover:shadow-xl transition-all duration-300 ease-in-out focus:ring-2 focus:ring-blue-500/50 focus:outline-none cursor-pointer"
                >
                  Edit
                </button>
                <button 
                  onClick={() => handleDelete(reference.id)}
                  disabled={isDeleting}
                  className="px-3 py-1.5 text-xs font-medium bg-red-500/20 dark:bg-red-600/20 backdrop-blur-md border border-red-300/30 dark:border-red-500/20 text-red-900 dark:text-red-300 rounded-lg shadow-lg hover:bg-red-500/40 dark:hover:bg-red-600/40 hover:shadow-xl transition-all duration-300 ease-in-out focus:ring-2 focus:ring-red-500/50 focus:outline-none cursor-pointer"
                >
                  {isDeleting ? '...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// --- Additional Info Tab Component ---
const AdditionalInfoTab = ({ user, profile, updateProfile }: { user: User, profile: Profile | null, updateProfile: (formData: FormData) => Promise<{ success: boolean, error?: string } | void> }) => {
  // State for controlled components
  const [linkedinUrl, setLinkedinUrl] = useState(profile?.linkedin_url || '');
  const [githubUrl, setGithubUrl] = useState(profile?.github_url || '');
  const [portfolioUrl, setPortfolioUrl] = useState(profile?.portfolio_url || '');
  const [websiteUrl, setWebsiteUrl] = useState(profile?.website_url || '');
  const [desiredSalary, setDesiredSalary] = useState(profile?.desired_salary?.toString() || '');
  const [salaryCurrency, setSalaryCurrency] = useState(profile?.salary_currency || 'USD');
  const [workAuthorization, setWorkAuthorization] = useState(profile?.work_authorization || '');
  const [preferredLocation, setPreferredLocation] = useState(profile?.preferred_location || '');
  const [willingToRelocate, setWillingToRelocate] = useState(profile?.willing_to_relocate || false);
  const [additionalInfo, setAdditionalInfo] = useState(profile?.additional_info || '');
  
  // State for loading/saving status
  const [isSaving, setIsSaving] = useState(false);

  // Currency options
  const currencyOptions = [
    'USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CNY', 'INR'
  ];

  // Work authorization options
  const workAuthorizationOptions = [
    'U.S. Citizen',
    'Permanent Resident (Green Card)',
    'Visa Holder (H-1B, etc.)',
    'EAD (Employment Authorization Document)',
    'Need Sponsorship',
    'Other'
  ];

  // Update state if profile data loads after initial render
  useEffect(() => {
    if (profile) {
      setLinkedinUrl(profile.linkedin_url || '');
      setGithubUrl(profile.github_url || '');
      setPortfolioUrl(profile.portfolio_url || '');
      setWebsiteUrl(profile.website_url || '');
      setDesiredSalary(profile.desired_salary?.toString() || '');
      setSalaryCurrency(profile.salary_currency || 'USD');
      setWorkAuthorization(profile.work_authorization || '');
      setPreferredLocation(profile.preferred_location || '');
      setWillingToRelocate(profile.willing_to_relocate || false);
      setAdditionalInfo(profile.additional_info || '');
    }
  }, [profile]);

  // Custom handler for submitting the form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check rate limiter before proceeding
    const rateLimit = profileSaveRateLimiter.checkAndRecord();
    if (!rateLimit.allowed) {
      toast.error(rateLimit.reason || 'Too many save attempts. Please try again later.', {
        duration: 10000,
        position: 'bottom-right',
        style: {
          background: '#FEE2E2',
          color: '#991B1B',
          borderRadius: '10px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        },
      });
      return;
    }
    
    setIsSaving(true);
    
    const formData = new FormData();

    // Add all fields to the form data
    formData.append('linkedinUrl', linkedinUrl);
    formData.append('githubUrl', githubUrl);
    formData.append('portfolioUrl', portfolioUrl);
    formData.append('websiteUrl', websiteUrl);
    formData.append('desiredSalary', desiredSalary);
    formData.append('salaryCurrency', salaryCurrency);
    formData.append('workAuthorization', workAuthorization);
    formData.append('preferredLocation', preferredLocation);
    formData.append('willingToRelocate', willingToRelocate.toString());
    formData.append('additionalInfo', additionalInfo);

    try {
      const result = await updateProfile(formData);
      
      if (!result || result.success) {
        toast.success('Additional information updated successfully', {
          duration: 10000,
          position: 'bottom-right',
          style: {
            background: '#D1FAE5',
            color: '#065F46',
            borderRadius: '10px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          },
        });
      } else {
        throw new Error(result.error || 'Unknown error');
      }
    } catch (error) {
      console.error('Error updating additional information:', error);
      toast.error('Failed to update additional information', {
        duration: 10000,
        position: 'bottom-right',
        style: {
          background: '#FEE2E2',
          color: '#991B1B',
          borderRadius: '10px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        },
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 mt-6 p-6 bg-blue-50/50 dark:bg-indigo-950/70 backdrop-blur-lg rounded-xl border border-blue-200/40 dark:border-indigo-800/50 shadow-xl">
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Additional Information</h3>

      {/* Social & Web Presence */}
      <div className="space-y-4">
        <h4 className="text-md font-medium text-gray-800 dark:text-gray-200">Social & Web Presence</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="linkedinUrl" className={glassInputLabelClasses}>LinkedIn URL</label>
            <input 
              id="linkedinUrl" 
              name="linkedinUrl" 
              type="url" 
              value={linkedinUrl}
              onChange={(e) => setLinkedinUrl(e.target.value)}
              className={glassInputFieldClasses}
              placeholder="https://linkedin.com/in/yourprofile"
             />
          </div>

          <div>
            <label htmlFor="githubUrl" className={glassInputLabelClasses}>GitHub URL</label>
            <input 
              id="githubUrl" 
              name="githubUrl" 
              type="url" 
              value={githubUrl}
              onChange={(e) => setGithubUrl(e.target.value)}
              className={glassInputFieldClasses}
              placeholder="https://github.com/yourusername"
             />
          </div>

          <div>
            <label htmlFor="portfolioUrl" className={glassInputLabelClasses}>Portfolio URL</label>
            <input 
              id="portfolioUrl" 
              name="portfolioUrl" 
              type="url" 
              value={portfolioUrl}
              onChange={(e) => setPortfolioUrl(e.target.value)}
              className={glassInputFieldClasses}
              placeholder="https://yourportfolio.com"
             />
          </div>

          <div>
            <label htmlFor="websiteUrl" className={glassInputLabelClasses}>Personal Website</label>
            <input 
              id="websiteUrl" 
              name="websiteUrl" 
              type="url" 
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              className={glassInputFieldClasses}
              placeholder="https://yourwebsite.com"
             />
          </div>
        </div>
      </div>

      {/* Salary & Location Preferences */}
      <div className="space-y-4 pt-4">
        <h4 className="text-md font-medium text-gray-800 dark:text-gray-200">Salary & Location Preferences</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex space-x-2">
            <div className="flex-1">
              <label htmlFor="desiredSalary" className={glassInputLabelClasses}>Desired Salary</label>
              <input 
                id="desiredSalary" 
                name="desiredSalary" 
                type="number" 
                value={desiredSalary}
                onChange={(e) => setDesiredSalary(e.target.value)}
                className={glassInputFieldClasses}
                placeholder="e.g., 75000"
               />
            </div>
            <div className="w-24">
              <label htmlFor="salaryCurrency" className={glassInputLabelClasses}>Currency</label>
              <select 
                id="salaryCurrency" 
                name="salaryCurrency" 
                value={salaryCurrency}
                onChange={(e) => setSalaryCurrency(e.target.value)}
                className={glassInputFieldClasses}
              >
                {currencyOptions.map(currency => (
                  <option key={currency} value={currency} className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
                    {currency}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="workAuthorization" className={glassInputLabelClasses}>Work Authorization</label>
            <select 
              id="workAuthorization" 
              name="workAuthorization" 
              value={workAuthorization}
              onChange={(e) => setWorkAuthorization(e.target.value)}
              className={glassInputFieldClasses}
            >
              <option value="">Select Work Authorization</option>
              {workAuthorizationOptions.map(option => (
                <option key={option} value={option} className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="preferredLocation" className={glassInputLabelClasses}>Preferred Location</label>
            <input 
              id="preferredLocation" 
              name="preferredLocation" 
              type="text" 
              value={preferredLocation}
              onChange={(e) => setPreferredLocation(e.target.value)}
              className={glassInputFieldClasses}
              placeholder="e.g., San Francisco, Remote, etc."
             />
          </div>

          <div className="flex items-center pt-7">
            <input 
              id="willingToRelocate" 
              name="willingToRelocate" 
              type="checkbox" 
              checked={willingToRelocate}
              onChange={(e) => setWillingToRelocate(e.target.checked)}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <label htmlFor="willingToRelocate" className="ml-2 block text-sm text-gray-900 dark:text-gray-200">
              I am willing to relocate for the right opportunity
            </label>
          </div>
        </div>
      </div>

      {/* Additional Information */}
      <div className="space-y-4 pt-4">
        <h4 className="text-md font-medium text-gray-800 dark:text-gray-200">Additional Information</h4>
        <div>
          <label htmlFor="additionalInfo" className={glassInputLabelClasses}>Additional Information for Job Applications</label>
          <textarea 
            id="additionalInfo" 
            name="additionalInfo" 
            value={additionalInfo}
            onChange={(e) => setAdditionalInfo(e.target.value)}
            className={`${glassInputFieldClasses} h-32`}
            placeholder="Add any additional information you'd like to include in your job applications"
          />
        </div>
      </div>
      
      <button 
        type="submit" 
        disabled={isSaving}
        className="w-full px-5 py-3 text-base font-medium bg-indigo-500/30 dark:bg-indigo-600/30 backdrop-blur-md border border-indigo-300/40 dark:border-indigo-500/30 text-indigo-900 dark:text-white rounded-lg shadow-lg hover:bg-indigo-500/50 dark:hover:bg-indigo-600/50 hover:shadow-xl transition-all duration-300 ease-in-out focus:ring-2 focus:ring-indigo-500/50 focus:outline-none mt-6 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
      >
        {isSaving ? (
          <span className="flex items-center justify-center">
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-indigo-900 dark:text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Saving...
          </span>
        ) : 'Save Additional Info'}
      </button>
    </form>
  );
};

// --- Language Tab Component ---
const LanguagesTab = ({ user }: { user: User }) => {
  const [languagesList, setLanguagesList] = useState<any[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [isDeleting, startDeleteTransition] = useTransition();
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [languageName, setLanguageName] = useState('');
  const [proficiency, setProficiency] = useState('');

  // Proficiency options
  const proficiencyOptions = [
    'Beginner',
    'Intermediate',
    'Advanced',
    'Fluent',
    'Native'
  ];

  // Fetch languages data
  useEffect(() => {
    const fetchLanguages = async () => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('languages')
          .select('*')
          .eq('user_id', user.id)
          .order('language_name', { ascending: true });

        if (error) {
          console.error('Error fetching languages:', error);
          return;
        }

        setLanguagesList(data || []);
      } catch (error) {
        console.error('Error in fetch operation:', error);
      }
    };

    fetchLanguages();
  }, [user.id]);

  // Handle edit click
  const handleEditClick = (language: any) => {
    setEditingId(language.id);
    setLanguageName(language.language_name || '');
    setProficiency(language.proficiency || '');
    setShowAddForm(true);
  };

  // Reset form
  const resetForm = () => {
    setEditingId(null);
    setLanguageName('');
    setProficiency('');
    setShowAddForm(false);
  };

  // Handle add/update language
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check rate limiter before proceeding
    const rateLimit = languagesRateLimiter.checkAndRecord();
    if (!rateLimit.allowed) {
      toast.error(rateLimit.reason || 'Too many language operations. Please try again later.', {
        duration: 10000,
        position: 'bottom-right',
        style: {
          background: '#FEE2E2',
          color: '#991B1B',
          borderRadius: '10px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        },
      });
      return;
    }
    
    const supabase = createClient();

    try {
      const languageData = {
        user_id: user.id,
        language_name: languageName,
        proficiency
      };

      let result;

      if (editingId) {
        // Update existing entry
        result = await supabase
          .from('languages')
          .update(languageData)
          .eq('id', editingId);
      } else {
        // Add new entry
        result = await supabase
          .from('languages')
          .insert([languageData]);
      }

      if (result.error) {
        throw result.error;
      }

      // Refresh the data
      const { data } = await supabase
        .from('languages')
        .select('*')
        .eq('user_id', user.id)
        .order('language_name', { ascending: true });

      setLanguagesList(data || []);
      resetForm();
      
      // Show success toast
      toast.success('Language saved successfully', {
        duration: 10000,
        position: 'bottom-right',
        style: {
          background: '#D1FAE5',
          color: '#065F46',
          borderRadius: '10px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        },
      });
    } catch (error: any) {
      console.error('Error saving language:', error.message);
      toast.error(`Error saving language: ${error.message}`, {
        duration: 10000,
        position: 'bottom-right',
        style: {
          background: '#FEE2E2',
          color: '#991B1B',
          borderRadius: '10px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        },
      });
    }
  };

  // Handle delete
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this language?')) {
      return;
    }

    // Check rate limiter before proceeding
    const rateLimit = languagesRateLimiter.checkAndRecord();
    if (!rateLimit.allowed) {
      toast.error(rateLimit.reason || 'Too many language operations. Please try again later.', {
        duration: 10000,
        position: 'bottom-right',
        style: {
          background: '#FEE2E2',
          color: '#991B1B',
          borderRadius: '10px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        },
      });
      return;
    }

    const supabase = createClient();
    setDeleteError(null);

    startDeleteTransition(async () => {
      const { error } = await supabase
        .from('languages')
        .delete()
        .eq('id', id);

      if (error) {
        setDeleteError(error.message);
        toast.error(`Error deleting language: ${error.message}`, {
          duration: 10000,
          position: 'bottom-right',
          style: {
            background: '#FEE2E2',
            color: '#991B1B',
            borderRadius: '10px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          },
        });
      } else {
        // Update the list
        setLanguagesList(prev => prev.filter(language => language.id !== id));
        if (editingId === id) {
          resetForm();
        }
        
        // Show success toast
        toast.success('Language deleted successfully', {
          duration: 10000,
          position: 'bottom-right',
          style: {
            background: '#D1FAE5',
            color: '#065F46',
            borderRadius: '10px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          },
        });
      }
    });
  };

  return (
    <div className="mt-6 p-6 bg-blue-50/50 dark:bg-indigo-950/70 backdrop-blur-lg rounded-xl border border-blue-200/40 dark:border-indigo-800/50 shadow-xl space-y-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">Languages</h3>
        {!showAddForm && (
          <button 
            onClick={() => setShowAddForm(true)} 
            className="px-4 py-2 text-sm font-medium bg-white/10 dark:bg-black/20 backdrop-blur-md border border-white/20 dark:border-white/10 text-gray-800 dark:text-white rounded-lg shadow-lg hover:bg-white/30 dark:hover:bg-black/40 hover:shadow-xl transition-all duration-300 ease-in-out focus:ring-2 focus:ring-indigo-500/50 focus:outline-none cursor-pointer"
          >
            + Add Language
          </button>
        )}
      </div>

      {/* Add/Edit Language Form */}
      {showAddForm && (
        <form 
          onSubmit={handleSubmit}
          className="p-6 border border-blue-100/30 dark:border-indigo-700/40 bg-blue-50/30 dark:bg-indigo-900/40 backdrop-blur-sm rounded-lg space-y-4 mb-6 shadow-inner"
        >
          <h4 className="text-md font-semibold text-gray-800 dark:text-gray-100 mb-3">
            {editingId ? 'Edit Language' : 'Add New Language'}
          </h4>

          <div>
            <label htmlFor="languageName" className={glassInputLabelClasses}>Language Name</label>
            <input 
              id="languageName" 
              type="text" 
              value={languageName}
              onChange={(e) => setLanguageName(e.target.value)}
              className={glassInputFieldClasses}
              placeholder="e.g., English, Spanish, Mandarin, etc."
              required
            />
          </div>

          <div>
            <label htmlFor="proficiency" className={glassInputLabelClasses}>Proficiency Level</label>
            <select 
              id="proficiency" 
              value={proficiency}
              onChange={(e) => setProficiency(e.target.value)}
              className={glassInputFieldClasses}
            >
              <option value="">Select Proficiency Level</option>
              {proficiencyOptions.map(opt => (
                <option key={opt} value={opt} className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
                  {opt}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end space-x-3 pt-2">
            <button 
              type="button" 
              onClick={resetForm}
              className="px-4 py-2 text-sm font-medium bg-white/10 dark:bg-black/20 backdrop-blur-md border border-white/20 dark:border-white/10 text-gray-800 dark:text-white rounded-lg shadow-lg hover:bg-white/30 dark:hover:bg-black/40 hover:shadow-xl transition-all duration-300 ease-in-out focus:ring-2 focus:ring-indigo-500/50 focus:outline-none cursor-pointer"
            >
              Cancel
            </button>
            <button 
              type="submit"
              className="px-4 py-2 text-sm font-medium bg-indigo-500/30 dark:bg-indigo-600/30 backdrop-blur-md border border-indigo-300/40 dark:border-indigo-500/30 text-indigo-900 dark:text-white rounded-lg shadow-lg hover:bg-indigo-500/50 dark:hover:bg-indigo-600/50 hover:shadow-xl transition-all duration-300 ease-in-out focus:ring-2 focus:ring-indigo-500/50 focus:outline-none cursor-pointer"
            >
              {editingId ? 'Update Language' : 'Add Language'}
            </button>
          </div>
        </form>
      )}

      {/* Languages Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {languagesList.length === 0 && !showAddForm && (
          <p className="text-sm text-gray-500 dark:text-gray-400 col-span-3">No languages added yet.</p>
        )}

        {languagesList.map(language => (
          <div key={language.id} className="p-4 border border-blue-100/30 dark:border-indigo-800/40 bg-blue-50/20 dark:bg-indigo-900/30 backdrop-blur-sm rounded-lg shadow-md">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-semibold text-gray-800 dark:text-gray-100">{language.language_name}</p>
                {language.proficiency && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">{language.proficiency}</p>
                )}
              </div>
              <div className="flex space-x-2">
                <button 
                  onClick={() => handleEditClick(language)}
                  disabled={isDeleting}
                  className="p-1 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 focus:outline-none cursor-pointer"
                >
                  Edit
                </button>
                <button 
                  onClick={() => handleDelete(language.id)}
                  disabled={isDeleting}
                  className="p-1 text-xs text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 focus:outline-none cursor-pointer"
                >
                  {isDeleting ? '...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

interface AccountTabsProps {
  user: User
  profile: Profile | null
  education: Education[]
  updateProfile: (formData: FormData) => Promise<{ success: boolean, error?: string } | void>;
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

  // Updated Tab Classes for Glassmorphism - Increased contrast
  const tabClasses = (tabName: string) => {
    const baseClasses = "px-4 py-2 text-sm font-medium rounded-t-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500/50 dark:focus:ring-offset-gray-900 transition-all duration-200 ease-in-out border-b-2 cursor-pointer";
    // Active: More opaque bg, stronger text/border
    const activeClasses = "bg-white/40 dark:bg-gray-800/50 backdrop-blur-md border-indigo-500 text-indigo-700 dark:text-indigo-300 shadow-md";
    // Inactive: Subtle bg, stronger text/hover contrast
    const inactiveClasses = "bg-white/10 dark:bg-gray-900/20 backdrop-blur-sm border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-400/50 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:border-gray-500/50";
    
    return `${baseClasses} ${activeTab === tabName ? activeClasses : inactiveClasses}`;
  }

  return (
    // Removed max-w-4xl and mx-auto as it's handled by the parent page container
    <div className="w-full p-4 md:p-6 lg:p-8 rounded-lg">
      {/* Toast container - moved to root level */}
      <Toaster />
      
      {/* Tab Navigation */}
      <div className="mb-6"> {/* Removed border-b, handled by tabs */}
        <nav className="flex space-x-2" aria-label="Tabs"> {/* Reduced space */}
          <button onClick={() => setActiveTab('main')} className={`${tabClasses('main')} cursor-pointer`}>
            Main Info
          </button>
          {/* Rename Attachments to Files */}
          <button onClick={() => setActiveTab('files')} className={`${tabClasses('files')} cursor-pointer`}>
            Files 
          </button>
          <button onClick={() => setActiveTab('education')} className={`${tabClasses('education')} cursor-pointer`}>
            Education
          </button>
          <button onClick={() => setActiveTab('experience')} className={`${tabClasses('experience')} cursor-pointer`}>
            Experience
          </button>
          <button onClick={() => setActiveTab('skills')} className={`${tabClasses('skills')} cursor-pointer`}>
            Skills
          </button>
          <button onClick={() => setActiveTab('languages')} className={`${tabClasses('languages')} cursor-pointer`}>
            Languages
          </button>
          <button onClick={() => setActiveTab('references')} className={`${tabClasses('references')} cursor-pointer`}>
            References
          </button>
          <button onClick={() => setActiveTab('additional')} className={`${tabClasses('additional')} cursor-pointer`}>
            Additional
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div className="min-h-[300px]"> {/* Set min height for content area */}
        {activeTab === 'main' && <MainInfoTab user={user} profile={profile} updateProfile={updateProfile} />} 
        {activeTab === 'files' && <FilesTab user={user} profile={profile} updateProfile={updateProfile} />} 
        {activeTab === 'education' && <EducationTab user={user} education={education} />}
        {activeTab === 'experience' && <WorkExperienceTab user={user} />}
        {activeTab === 'skills' && <SkillsTab user={user} />}
        {activeTab === 'languages' && <LanguagesTab user={user} />}
        {activeTab === 'references' && <ReferencesTab user={user} />}
        {activeTab === 'additional' && <AdditionalInfoTab user={user} profile={profile} updateProfile={updateProfile} />}
      </div>
    </div>
  );
} 