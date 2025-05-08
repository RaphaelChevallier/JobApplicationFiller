'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { type Profile, type Education } from '@/types/database'

// --- Sign Out Action ---
export async function signOut(): Promise<never> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  return redirect('/login')
}

// --- Update Profile Action ---
export async function updateProfile(formData: FormData) {
  const supabase = await createClient()

  try {
    // Extract basic profile data
    const firstName = formData.get('firstName') as string
    const lastName = formData.get('lastName') as string
    const phone = formData.get('phone') as string
    // const location = formData.get('location') as string // Old location field removed

    // New address fields
    const street_address = formData.get('street_address') as string
    const address_line_2 = formData.get('address_line_2') as string
    const city = formData.get('city') as string
    const country = formData.get('country') as string
    const state_province = formData.get('state_province') as string
    const zip_postal_code = formData.get('zip_postal_code') as string

    // Extract file URLs (if present in form)
    const resumeUrl = formData.get('resume_url') as string
    const coverLetterUrl = formData.get('cover_letter_url') as string

    // Extract additional profile data (from Additional Info tab)
    const linkedinUrl = formData.get('linkedinUrl') as string
    const githubUrl = formData.get('githubUrl') as string
    const portfolioUrl = formData.get('portfolioUrl') as string
    const websiteUrl = formData.get('websiteUrl') as string
    const desiredSalary = formData.get('desiredSalary') ? parseFloat(formData.get('desiredSalary') as string) : null
    const salaryCurrency = formData.get('salaryCurrency') as string
    const workAuthorization = formData.get('workAuthorization') as string
    const preferredLocation = formData.get('preferredLocation') as string
    const willingToRelocate = formData.get('willingToRelocate') === 'true'
    const additionalInfo = formData.get('additionalInfo') as string

    // New checkbox value
    const forceExactResume = formData.get('force_exact_resume') === 'true';

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return redirect('/login?message=Could not get user')
    }

    // Prepare update data, only including fields that are present in the form
    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    }

    // Add basic fields if they exist
    if (formData.has('firstName')) updates.first_name = firstName
    if (formData.has('lastName')) updates.last_name = lastName
    if (formData.has('phone')) updates.phone = phone
    // if (formData.has('location')) updates.location = location // Old location field removed
    
    // Add new address fields if they exist
    if (formData.has('street_address')) updates.street_address = street_address;
    if (formData.has('address_line_2')) updates.address_line_2 = address_line_2;
    if (formData.has('city')) updates.city = city;
    if (formData.has('country')) updates.country = country;
    if (formData.has('state_province')) updates.state_province = state_province;
    if (formData.has('zip_postal_code')) updates.zip_postal_code = zip_postal_code;

    // Add file URLs if they exist
    if (formData.has('resume_url')) updates.resume_url = resumeUrl
    if (formData.has('cover_letter_url')) updates.cover_letter_url = coverLetterUrl

    // Add additional fields if they exist
    if (formData.has('linkedinUrl')) updates.linkedin_url = linkedinUrl
    if (formData.has('githubUrl')) updates.github_url = githubUrl
    if (formData.has('portfolioUrl')) updates.portfolio_url = portfolioUrl
    if (formData.has('websiteUrl')) updates.website_url = websiteUrl
    if (formData.has('desiredSalary')) updates.desired_salary = desiredSalary
    if (formData.has('salaryCurrency')) updates.salary_currency = salaryCurrency
    if (formData.has('workAuthorization')) updates.work_authorization = workAuthorization
    if (formData.has('preferredLocation')) updates.preferred_location = preferredLocation
    if (formData.has('willingToRelocate')) updates.willing_to_relocate = willingToRelocate
    if (formData.has('additionalInfo')) updates.additional_info = additionalInfo
    if (formData.has('force_exact_resume')) updates.force_exact_resume = forceExactResume;
    
    // Update profile
    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
    
    if (error) {
      console.error('Error updating profile:', error)
      return redirect('/application?error=Could not update profile') // Updated redirect
    }

    return redirect('/application?message=Profile updated successfully') // Updated redirect
  } catch (error) {
    console.error('Error in updateProfile:', error)
    return redirect('/application?error=Could not update profile') // Updated redirect
  }
}

// --- Add Education Action ---
export async function addEducation(formData: FormData): Promise<void> {
  const supabase = await createClient()

  try {
    // Get values from form
    const schoolName = formData.get('schoolName') as string
    const degree = formData.get('degree') as string
    const fieldOfStudy = formData.get('fieldOfStudy') as string
    const startDate = formData.get('startDate') ? `${formData.get('startDate')}-01` : null // Add day to make valid date
    const endDate = formData.get('endDate') ? `${formData.get('endDate')}-01` : null // Add day to make valid date

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return redirect('/application?error=User not found') // Updated redirect
    }

    // Insert new education entry
    const { error } = await supabase
      .from('education')
      .insert([{
        user_id: user.id,
        school_name: schoolName,
        degree: degree || null,
        field_of_study: fieldOfStudy || null,
        start_date: startDate,
        end_date: endDate,
      }])

    if (error) {
      console.error('Error adding education:', error)
      return redirect('/application?error=' + encodeURIComponent(error.message)) // Updated redirect
    }

    revalidatePath('/application') // Updated revalidatePath
    return redirect('/application?message=Education added successfully') // Updated redirect
  } catch (error: any) {
    console.error('Error in addEducation:', error)
    return redirect('/application?error=' + encodeURIComponent(error.message)) // Updated redirect
  }
}

// --- Update Education Action ---
export async function updateEducation(formData: FormData): Promise<void> {
  const supabase = await createClient()

  try {
    // Get values from form
    const educationId = formData.get('educationId') as string
    const schoolName = formData.get('schoolName') as string
    const degree = formData.get('degree') as string
    const fieldOfStudy = formData.get('fieldOfStudy') as string
    const startDate = formData.get('startDate') ? `${formData.get('startDate')}-01` : null // Add day to make valid date
    const endDate = formData.get('endDate') ? `${formData.get('endDate')}-01` : null // Add day to make valid date

    // Get current user for security check
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return redirect('/application?error=User not found') // Updated redirect
    }

    // Verify ownership of education entry
    const { data: educationData, error: fetchError } = await supabase
      .from('education')
      .select('user_id')
      .eq('id', educationId)
      .single()

    if (fetchError || !educationData) {
      console.error('Error fetching education for update:', fetchError)
      return redirect('/application?error=Education entry not found') // Updated redirect
    }

    if (educationData.user_id !== user.id) {
      return redirect('/application?error=Not authorized to update this education entry') // Updated redirect
    }

    // Update education entry
    const { error } = await supabase
      .from('education')
      .update({
        school_name: schoolName,
        degree: degree || null,
        field_of_study: fieldOfStudy || null,
        start_date: startDate,
        end_date: endDate,
      })
      .eq('id', educationId)

    if (error) {
      console.error('Error updating education:', error)
      return redirect('/application?error=' + encodeURIComponent(error.message)) // Updated redirect
    }

    revalidatePath('/application') // Updated revalidatePath
    return redirect('/application?message=Education updated successfully') // Updated redirect
  } catch (error: any) {
    console.error('Error in updateEducation:', error)
    return redirect('/application?error=' + encodeURIComponent(error.message)) // Updated redirect
  }
}

// --- Delete Education Action ---
export async function deleteEducation(id: string) {
  const supabase = await createClient()

  try {
    // Get current user for security check
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { error: 'User not found' } // No redirect here as it might be called client-side
    }

    // Verify ownership of education entry
    const { data: educationData, error: fetchError } = await supabase
      .from('education')
      .select('user_id')
      .eq('id', id)
      .single()

    if (fetchError || !educationData) {
      console.error('Error fetching education for deletion:', fetchError)
      return { error: 'Education entry not found' }
    }

    if (educationData.user_id !== user.id) {
      return { error: 'Not authorized to delete this education entry' }
    }

    // Delete education entry
    const { error } = await supabase
      .from('education')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting education:', error)
      return { error: error.message }
    }
    revalidatePath('/application'); // Revalidate after successful deletion
    return { success: true }
  } catch (error: any) {
    console.error('Error in deleteEducation:', error)
    return { error: error.message }
  }
}

// --- Delete Profile File Action ---
export async function deleteProfileFile(fileType: 'resume' | 'cover_letter') {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    console.error('Auth error in deleteProfileFile:', authError)
    return { error: 'Not authenticated' };
  }

  try {
    // 1. Get the current file path from the profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select(fileType === 'resume' ? 'resume_url' : 'cover_letter_url')
      .eq('id', user.id)
      .single<Pick<Profile, 'resume_url' | 'cover_letter_url'>>(); // Type assertion

    if (profileError && profileError.code !== 'PGRST116') { // Ignore "not found"
      throw new Error('Could not fetch profile to get file path: ' + profileError.message);
    }

    const filePath = profile?.[fileType === 'resume' ? 'resume_url' : 'cover_letter_url'];

    if (!filePath) {
        // No file path stored, nothing to delete in storage, maybe clear DB field just in case?
        // console.log('No file path found in profile, nothing to delete in storage.');
        // Optionally ensure the DB field is null
         const { error: updateError } = await supabase
          .from('profiles')
          .update({ [fileType === 'resume' ? 'resume_url' : 'cover_letter_url']: null })
          .eq('id', user.id);
        if(updateError) console.error("Error clearing DB field even though no storage path:", updateError)
         revalidatePath('/application') // Updated revalidatePath
        return { success: true, message: 'No file was stored.' }; // Indicate success as there's nothing to delete
    }

    // 2. Delete the file from storage
    const bucketName = 'user_files'; // Ensure this matches your bucket name
    const { error: storageError } = await supabase.storage
      .from(bucketName)
      .remove([filePath]); // remove expects an array of paths

    if (storageError) {
      // Log error but proceed to clear DB field maybe? Or return error?
      console.error(`Storage deletion error for ${filePath}:`, storageError.message);
      // Depending on requirements, you might want to stop here or still try to clear the DB link
      // Let's return error for now
       throw new Error('Could not delete file from storage: ' + storageError.message);
    }
     console.log('File deleted from storage:', filePath)

    // 3. Clear the file path in the profiles table
    const fieldToClear = fileType === 'resume' ? 'resume_url' : 'cover_letter_url';
    const { error: dbError } = await supabase
      .from('profiles')
      .update({ [fieldToClear]: null })
      .eq('id', user.id);

    if (dbError) {
      throw new Error('Could not clear file path in profile: ' + dbError.message);
    }

    revalidatePath('/application'); // Updated revalidatePath
    return { success: true };

  } catch (error: any) {
     console.error('Error in deleteProfileFile action:', error)
     return { error: error.message || 'Failed to delete file.' };
  }
} 