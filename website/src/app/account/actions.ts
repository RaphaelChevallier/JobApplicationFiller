'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { type Profile, type Education } from '@/types/database'

// --- Sign Out Action ---
export async function signOut() {
  const supabase = await createClient()
  const { error } = await supabase.auth.signOut()

  if (error) {
    console.error('Sign out error:', error.message)
    // Redirect back to account page with error
    return redirect('/account?error=Could not sign out')
  }

  revalidatePath('/', 'layout') 
  redirect('/login') // Redirect to login after successful sign out
}

// --- Update Profile Action ---
export async function updateProfile(formData: FormData) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    console.error('Auth error in updateProfile:', authError)
    return redirect('/login?message=Not authenticated')
  }

  // Define the type for the object being sent to Supabase
  // Use Partial<Profile> but explicitly type updated_at as Date for the update object
  type ProfileUpdatePayload = Partial<Omit<Profile, 'updated_at'>> & { 
      id: string;
      updated_at?: Date; // Make updated_at optional here, we add it next
  };

  // Initialize profile data object with user ID
  const profileUpdateData: ProfileUpdatePayload = {
    id: user.id,
  }
  profileUpdateData.updated_at = new Date(); // Add the date

  // Conditionally add fields from FormData if they exist
  if (formData.has('firstName')) profileUpdateData.first_name = formData.get('firstName') as string;
  if (formData.has('lastName')) profileUpdateData.last_name = formData.get('lastName') as string;
  if (formData.has('phone')) profileUpdateData.phone = formData.get('phone') as string;
  if (formData.has('location')) profileUpdateData.location = formData.get('location') as string;
  if (formData.has('username')) profileUpdateData.username = formData.get('username') as string;
  if (formData.has('website')) profileUpdateData.website = formData.get('website') as string;
  // Handle file URLs specifically
  if (formData.has('resume_url')) profileUpdateData.resume_url = formData.get('resume_url') as string;
  if (formData.has('cover_letter_url')) profileUpdateData.cover_letter_url = formData.get('cover_letter_url') as string;

  // Upsert the data - only fields present in profileUpdateData will be updated
  const { error } = await supabase.from('profiles').upsert(profileUpdateData)

  if (error) {
    console.error('Error updating profile:', error)
    const redirectUrl = new URL('/account', process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000')
    // Append error specific to file type if possible
    let errorMessage = 'Could not update profile: ' + error.message;
    if (formData.has('resume_url') || formData.has('cover_letter_url')) {
        errorMessage = 'Could not save file path: ' + error.message;
    }
    redirectUrl.searchParams.set('error', errorMessage)
    return redirect(redirectUrl.toString())
  }

  // Revalidate account page to show updated data
  revalidatePath('/account') 

  // Redirect back to account page with success message
  const successRedirectUrl = new URL('/account', process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000')
  // Customize success message if it was a file upload
   let successMessage = 'Profile updated successfully!';
    if (formData.has('resume_url')) {
        successMessage = 'Resume updated successfully!';
    } else if (formData.has('cover_letter_url')) {
        successMessage = 'Cover Letter updated successfully!';
    }
  successRedirectUrl.searchParams.set('message', successMessage)
  redirect(successRedirectUrl.toString())
}

// --- Add Education Action ---
export async function addEducation(formData: FormData) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    console.error('Auth error in addEducation:', authError)
    return redirect('/login?message=Not authenticated')
  }

  // Extract form data
  const schoolName = formData.get('schoolName') as string
  const degree = formData.get('degree') as string || null // Handle empty select
  const fieldOfStudy = formData.get('fieldOfStudy') as string || null
  const startDate = formData.get('startDate') as string || null
  const endDate = formData.get('endDate') as string || null

  // Basic validation (add more as needed)
  if (!schoolName) {
    return redirect('/account?tab=education&error=School name is required')
  }

  const educationData: Omit<Education, 'id' | 'created_at' | 'updated_at'> = {
    user_id: user.id,
    school_name: schoolName,
    degree: degree,
    field_of_study: fieldOfStudy,
    start_date: startDate, 
    end_date: endDate,
  }

  const { error } = await supabase.from('education').insert(educationData)

  if (error) {
    console.error('Error adding education:', error)
    return redirect('/account?tab=education&error=Could not add education entry: ' + error.message)
  }

  revalidatePath('/account') 
  redirect('/account?tab=education&message=Education entry added successfully!')
}

// --- Update Education Action ---
export async function updateEducation(formData: FormData) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    console.error('Auth error in updateEducation:', authError)
    return redirect('/login?message=Not authenticated')
  }

  // Extract form data
  const educationId = formData.get('educationId') as string
  const schoolName = formData.get('schoolName') as string
  const degree = formData.get('degree') as string || null // Handle empty select
  const fieldOfStudy = formData.get('fieldOfStudy') as string || null
  const startDate = formData.get('startDate') as string || null
  const endDate = formData.get('endDate') as string || null

  // Basic validation (add more as needed)
  if (!educationId) {
      return redirect('/account?tab=education&error=Education ID is missing')
  }
  if (!schoolName) {
    return redirect('/account?tab=education&error=School name is required&editId=' + educationId) // Keep edit context on error
  }

  // Prepare data for update, excluding user_id, id, created_at
  // Type safety: Ensure we only include fields that are part of the Education type and are updatable
  type EducationUpdatePayload = Partial<Omit<Education, 'id' | 'user_id' | 'created_at' | 'updated_at'>> & {
    updated_at?: string | Date; // updated_at will be set by the server or us
  };
  
  const educationUpdateData: EducationUpdatePayload = {
    school_name: schoolName,
    degree: degree,
    field_of_study: fieldOfStudy,
    start_date: startDate,
    end_date: endDate,
    updated_at: new Date(), // Set updated timestamp
  }

  // Update the specific education entry, ensuring user ownership
  const { error } = await supabase
    .from('education')
    .update(educationUpdateData)
    .eq('id', educationId)
    .eq('user_id', user.id) // Ensure user owns the record

  if (error) {
    console.error('Error updating education:', error)
    return redirect('/account?tab=education&error=Could not update education entry: ' + error.message + '&editId=' + educationId)
  }

  revalidatePath('/account') 
  redirect('/account?tab=education&message=Education entry updated successfully!')
}

// --- Delete Education Action ---
export async function deleteEducation(educationId: string) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    console.error('Auth error in deleteEducation:', authError)
    // Handle error appropriately - maybe return an error status?
    // For now, log and prevent deletion if not authenticated.
    return { error: 'Not authenticated' }; // Return error object
  }

  if (!educationId) {
     return { error: 'Education ID is required' };
  }

  // Ensure the user can only delete their own entries (RLS should also enforce this)
  const { error } = await supabase
    .from('education')
    .delete()
    .eq('id', educationId)
    .eq('user_id', user.id) // Double-check ownership

  if (error) {
    console.error('Error deleting education:', error)
     return { error: 'Could not delete education entry: ' + error.message };
  }

  revalidatePath('/account') 
  // Return success or redirect - returning allows client-side update
   return { success: true }; 
  // redirect('/account?tab=education&message=Education entry deleted successfully!') // Alternative: Redirect
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
         revalidatePath('/account')
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

    revalidatePath('/account');
    return { success: true };

  } catch (error: any) {
     console.error('Error in deleteProfileFile action:', error)
     return { error: error.message || 'Failed to delete file.' };
  }
} 