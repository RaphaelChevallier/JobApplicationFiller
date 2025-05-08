-- Migration: Create job_experience, skills, and references tables
-- Purpose: Add tables to store work experience, skills, and professional references

-- Create work experience table
CREATE TABLE public.work_experience (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  company_name text NOT NULL,
  job_title text NOT NULL,
  start_date date,
  end_date date, -- NULL if current position
  is_current_position boolean DEFAULT false,
  location text,
  description text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add comments
COMMENT ON TABLE public.work_experience IS 'Stores user work experience entries';
COMMENT ON COLUMN public.work_experience.user_id IS 'Links to the user in the profiles table';

-- Enable Row Level Security
ALTER TABLE public.work_experience ENABLE ROW LEVEL SECURITY;

-- RLS Policies for work_experience
CREATE POLICY "Allow individuals to view their own work experience."
  ON public.work_experience FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Allow individuals to insert their own work experience."
  ON public.work_experience FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow individuals to update their own work experience."
  ON public.work_experience FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow individuals to delete their own work experience."
  ON public.work_experience FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER on_work_experience_updated
  BEFORE UPDATE ON public.work_experience
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- Create skills table
CREATE TABLE public.skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  skill_name text NOT NULL,
  proficiency text, -- e.g., 'Beginner', 'Intermediate', 'Advanced'
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, skill_name) -- Prevent duplicate skills for the same user
);

-- Add comments
COMMENT ON TABLE public.skills IS 'Stores user skills';
COMMENT ON COLUMN public.skills.user_id IS 'Links to the user in the profiles table';

-- Enable Row Level Security
ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;

-- RLS Policies for skills
CREATE POLICY "Allow individuals to view their own skills."
  ON public.skills FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Allow individuals to insert their own skills."
  ON public.skills FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow individuals to update their own skills."
  ON public.skills FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow individuals to delete their own skills."
  ON public.skills FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER on_skills_updated
  BEFORE UPDATE ON public.skills
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- Create references table
CREATE TABLE public.references (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  company text,
  job_title text,
  email text,
  phone text,
  relationship text, -- e.g., 'Manager', 'Colleague'
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add comments
COMMENT ON TABLE public.references IS 'Stores professional references for job applications';
COMMENT ON COLUMN public.references.user_id IS 'Links to the user in the profiles table';

-- Enable Row Level Security
ALTER TABLE public.references ENABLE ROW LEVEL SECURITY;

-- RLS Policies for references
CREATE POLICY "Allow individuals to view their own references."
  ON public.references FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Allow individuals to insert their own references."
  ON public.references FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow individuals to update their own references."
  ON public.references FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow individuals to delete their own references."
  ON public.references FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER on_references_updated
  BEFORE UPDATE ON public.references
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- Add more fields to profiles table for additional job application information
ALTER TABLE public.profiles
  ADD COLUMN linkedin_url text,
  ADD COLUMN github_url text,
  ADD COLUMN portfolio_url text,
  ADD COLUMN website_url text,
  ADD COLUMN desired_salary numeric,
  ADD COLUMN salary_currency text,
  ADD COLUMN work_authorization text,
  ADD COLUMN preferred_location text,
  ADD COLUMN willing_to_relocate boolean DEFAULT false,
  ADD COLUMN additional_info text;

-- Add comments
COMMENT ON COLUMN public.profiles.linkedin_url IS 'User''s LinkedIn profile URL';
COMMENT ON COLUMN public.profiles.github_url IS 'User''s GitHub profile URL';
COMMENT ON COLUMN public.profiles.portfolio_url IS 'User''s portfolio website URL';
COMMENT ON COLUMN public.profiles.website_url IS 'User''s personal website URL';
COMMENT ON COLUMN public.profiles.desired_salary IS 'User''s desired salary amount';
COMMENT ON COLUMN public.profiles.salary_currency IS 'Currency for desired salary (e.g., USD, EUR)';
COMMENT ON COLUMN public.profiles.work_authorization IS 'User''s work authorization status';
COMMENT ON COLUMN public.profiles.preferred_location IS 'User''s preferred job location';
COMMENT ON COLUMN public.profiles.willing_to_relocate IS 'Whether the user is willing to relocate for a job';
COMMENT ON COLUMN public.profiles.additional_info IS 'Additional information for job applications';

-- Grant permissions for all new tables
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.work_experience TO authenticated;
GRANT ALL ON TABLE public.work_experience TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.skills TO authenticated;
GRANT ALL ON TABLE public.skills TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.references TO authenticated;
GRANT ALL ON TABLE public.references TO service_role; 