'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'

// Update job application status
export async function updateApplicationStatus(
  applicationId: string, 
  status: string
) {
  try {
    // Validate the status
    const validStatuses = ['applied', 'interviewed', 'offered', 'rejected'];
    if (!validStatuses.includes(status)) {
      (await cookies()).set('flashError', 'Invalid application status', { path: '/job-applications', maxAge: 5 });
      return { 
        success: false, 
        error: 'Invalid application status' 
      };
    }

    const supabase = await createClient();
    
    // Check if user is authorized to update this application
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      (await cookies()).set('flashError', 'Authentication required to update status.', { path: '/job-applications', maxAge: 5 });
      return { 
        success: false, 
        error: 'Authentication required' 
      };
    }
    
    // Get the application to verify ownership
    const { data: application, error: fetchError } = await supabase
      .from('job_applications')
      .select('user_id')
      .eq('id', applicationId)
      .single();
      
    if (fetchError || !application) {
      (await cookies()).set('flashError', 'Application not found.', { path: '/job-applications', maxAge: 5 });
      return { 
        success: false, 
        error: 'Application not found' 
      };
    }
    
    // Verify ownership
    if (application.user_id !== user.id) {
      (await cookies()).set('flashError', 'Not authorized to update this application.', { path: '/job-applications', maxAge: 5 });
      return { 
        success: false, 
        error: 'Not authorized to update this application' 
      };
    }

    // Update the application status
    const { error: updateError } = await supabase
      .from('job_applications')
      .update({ 
        application_status: status,
        updated_at: new Date().toISOString()
      })
      .eq('id', applicationId);

    if (updateError) {
      (await cookies()).set('flashError', `Failed to update status: ${updateError.message}`, { path: '/job-applications', maxAge: 5 });
      return { 
        success: false, 
        error: updateError.message 
      };
    }

    // Revalidate the page to show updated data
    revalidatePath('/job-applications');
    (await cookies()).set('flashMessage', 'Application status updated successfully.', { path: '/job-applications', maxAge: 5 });
    
    return { 
      success: true 
    };
  } catch (error) {
    console.error('Error updating application status:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    (await cookies()).set('flashError', `Error updating status: ${errorMessage}`, { path: '/job-applications', maxAge: 5 });
    return { 
      success: false, 
      error: 'An unexpected error occurred' 
    };
  }
}

// Update job application notes
export async function updateApplicationNotes(
  applicationId: string, 
  notes: string
) {
  try {
    const supabase = await createClient();
    
    // Check if user is authorized
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      (await cookies()).set('flashError', 'Authentication required to update notes.', { path: '/job-applications', maxAge: 5 });
      return { 
        success: false, 
        error: 'Authentication required' 
      };
    }
    
    // Get the application to verify ownership
    const { data: application, error: fetchError } = await supabase
      .from('job_applications')
      .select('user_id')
      .eq('id', applicationId)
      .single();
      
    if (fetchError || !application) {
      (await cookies()).set('flashError', 'Application not found.', { path: '/job-applications', maxAge: 5 });
      return { 
        success: false, 
        error: 'Application not found' 
      };
    }
    
    // Verify ownership
    if (application.user_id !== user.id) {
      (await cookies()).set('flashError', 'Not authorized to update notes for this application.', { path: '/job-applications', maxAge: 5 });
      return { 
        success: false, 
        error: 'Not authorized to update this application' 
      };
    }

    // Update the application notes
    const { error: updateError } = await supabase
      .from('job_applications')
      .update({ 
        notes,
        updated_at: new Date().toISOString()
      })
      .eq('id', applicationId);

    if (updateError) {
      (await cookies()).set('flashError', `Failed to update notes: ${updateError.message}`, { path: '/job-applications', maxAge: 5 });
      return { 
        success: false, 
        error: updateError.message 
      };
    }

    // Revalidate the page to show updated data
    revalidatePath('/job-applications');
    (await cookies()).set('flashMessage', 'Application notes updated successfully.', { path: '/job-applications', maxAge: 5 });
    
    return { 
      success: true 
    };
  } catch (error) {
    console.error('Error updating application notes:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    (await cookies()).set('flashError', `Error updating notes: ${errorMessage}`, { path: '/job-applications', maxAge: 5 });
    return { 
      success: false, 
      error: 'An unexpected error occurred' 
    };
  }
}

// Delete job application
export async function deleteApplication(applicationId: string) {
  try {
    const supabase = await createClient();
    
    // Check if user is authorized
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      (await cookies()).set('flashError', 'Authentication required to delete application.', { path: '/job-applications', maxAge: 5 });
      return { 
        success: false, 
        error: 'Authentication required' 
      };
    }
    
    // Get the application to verify ownership
    const { data: application, error: fetchError } = await supabase
      .from('job_applications')
      .select('user_id')
      .eq('id', applicationId)
      .single();
      
    if (fetchError || !application) {
      (await cookies()).set('flashError', 'Application not found.', { path: '/job-applications', maxAge: 5 });
      return { 
        success: false, 
        error: 'Application not found' 
      };
    }
    
    // Verify ownership
    if (application.user_id !== user.id) {
      (await cookies()).set('flashError', 'Not authorized to delete this application.', { path: '/job-applications', maxAge: 5 });
      return { 
        success: false, 
        error: 'Not authorized to delete this application' 
      };
    }

    // Delete the application
    const { error: deleteError } = await supabase
      .from('job_applications')
      .delete()
      .eq('id', applicationId);

    if (deleteError) {
      (await cookies()).set('flashError', `Failed to delete application: ${deleteError.message}`, { path: '/job-applications', maxAge: 5 });
      return { 
        success: false, 
        error: deleteError.message 
      };
    }

    // Revalidate the page to show updated data
    revalidatePath('/job-applications');
    (await cookies()).set('flashMessage', 'Application deleted successfully.', { path: '/job-applications', maxAge: 5 });
    
    return { 
      success: true 
    };
  } catch (error) {
    console.error('Error deleting application:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    (await cookies()).set('flashError', `Error deleting application: ${errorMessage}`, { path: '/job-applications', maxAge: 5 });
    return { 
      success: false, 
      error: 'An unexpected error occurred' 
    };
  }
} 