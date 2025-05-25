-- Migration: Fix job_applications table creation
-- Purpose: Ensure job_applications table exists (idempotent creation)
-- This fixes the migration tracking issue where the table was marked as created but doesn't exist

-- Create the job_applications table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.job_applications (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone,
  job_url text not null,
  job_title text,
  company_name text,
  job_description text,
  job_location text,
  job_posting_date timestamp with time zone,
  job_id text,
  application_date timestamp with time zone not null default now(),
  application_status text not null default 'applied',
  notes text,
  salary_info text,
  
  primary key (id),
  constraint job_applications_user_id_fkey foreign key (user_id)
    references auth.users (id) on delete cascade
);

-- Add comments for clarity (only if table was just created)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_description 
    WHERE objoid = 'public.job_applications'::regclass
  ) THEN
    COMMENT ON TABLE public.job_applications IS 'Stores job applications submitted by users.';
    COMMENT ON COLUMN public.job_applications.user_id IS 'Links to the user in auth.users table.';
    COMMENT ON COLUMN public.job_applications.job_url IS 'URL of the job posting.';
    COMMENT ON COLUMN public.job_applications.job_title IS 'Title of the job position.';
    COMMENT ON COLUMN public.job_applications.company_name IS 'Name of the company.';
    COMMENT ON COLUMN public.job_applications.job_description IS 'Description of the job.';
    COMMENT ON COLUMN public.job_applications.job_location IS 'Location of the job.';
    COMMENT ON COLUMN public.job_applications.job_posting_date IS 'Date when the job was posted.';
    COMMENT ON COLUMN public.job_applications.job_id IS 'External ID of the job posting.';
    COMMENT ON COLUMN public.job_applications.application_date IS 'Date when the application was submitted.';
    COMMENT ON COLUMN public.job_applications.application_status IS 'Current status of the application (applied, interviewed, offered, rejected).';
    COMMENT ON COLUMN public.job_applications.notes IS 'User notes about the application.';
    COMMENT ON COLUMN public.job_applications.salary_info IS 'Salary information for the job.';
  END IF;
END $$;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_job_applications_user_id ON public.job_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_job_applications_application_date ON public.job_applications(application_date);

-- Enable Row Level Security (RLS) if not already enabled
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'job_applications' 
    AND rowsecurity = true
  ) THEN
    ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Create RLS policies if they don't exist
DO $$
BEGIN
  -- Policy: Allow individuals to view their own job applications
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'job_applications' 
    AND policyname = 'Allow individuals to view their own job applications.'
  ) THEN
    CREATE POLICY "Allow individuals to view their own job applications."
      ON public.job_applications FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  -- Policy: Allow individuals to insert their own job applications
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'job_applications' 
    AND policyname = 'Allow individuals to insert their own job applications.'
  ) THEN
    CREATE POLICY "Allow individuals to insert their own job applications."
      ON public.job_applications FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;

  -- Policy: Allow individuals to update their own job applications
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'job_applications' 
    AND policyname = 'Allow individuals to update their own job applications.'
  ) THEN
    CREATE POLICY "Allow individuals to update their own job applications."
      ON public.job_applications FOR UPDATE
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;

  -- Policy: Allow individuals to delete their own job applications
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'job_applications' 
    AND policyname = 'Allow individuals to delete their own job applications.'
  ) THEN
    CREATE POLICY "Allow individuals to delete their own job applications."
      ON public.job_applications FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- Create trigger if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'on_job_applications_updated'
  ) THEN
    CREATE TRIGGER on_job_applications_updated
      BEFORE UPDATE ON public.job_applications
      FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
  END IF;
END $$;

-- Grant permissions (these are idempotent)
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.job_applications TO authenticated;
GRANT ALL ON TABLE public.job_applications TO service_role; 