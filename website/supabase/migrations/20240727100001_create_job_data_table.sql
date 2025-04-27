-- Migration: Create the job_data table
-- Purpose: Stores detailed information used for filling job applications, linked to a user profile.
-- Affected tables/columns: public.job_data

-- Enable pgcrypto extension if not already enabled (needed for gen_random_uuid())
-- create extension if not exists pgcrypto with schema extensions;

-- Create the job_data table
create table public.job_data (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone,
  first_name text,
  last_name text,
  email text,
  phone text,
  linkedin_url text,
  portfolio_url text,
  github_url text,
  website_url text,
  resume_url text, -- Store URL to the resume file (e.g., in Supabase Storage)
  cover_letter_template text, -- Store a template or default text
  desired_salary numeric, -- Use numeric for potential decimal values
  salary_currency text, -- e.g., 'USD', 'EUR'
  location_preference text,
  work_authorization text, -- e.g., 'US Citizen', 'Requires Sponsorship'
  additional_info text, -- For any extra notes or fields

  primary key (id),
  constraint job_data_user_id_fkey foreign key (user_id)
    references public.profiles (id) on delete cascade
);

-- Add comments for clarity
comment on table public.job_data is 'Stores user-specific data for filling job applications.';
comment on column public.job_data.user_id is 'Links to the user in the profiles table.';
comment on column public.job_data.resume_url is 'URL to the user''s resume, potentially stored in Supabase Storage.';

-- Create index on user_id for faster lookups
create index idx_job_data_user_id on public.job_data(user_id);

-- Enable Row Level Security (RLS)
alter table public.job_data enable row level security;

-- Create RLS policies for job_data table

-- Policy: Allow individuals to view their own job data
create policy "Allow individuals to view their own job data."
  on public.job_data for select
  using (auth.uid() = user_id);

-- Policy: Allow individuals to insert their own job data
create policy "Allow individuals to insert their own job data."
  on public.job_data for insert
  with check (auth.uid() = user_id);

-- Policy: Allow individuals to update their own job data
create policy "Allow individuals to update their own job data."
  on public.job_data for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Policy: Allow individuals to delete their own job data
create policy "Allow individuals to delete their own job data."
  on public.job_data for delete
  using (auth.uid() = user_id);

-- Use the existing function for updating the timestamp
create trigger on_job_data_updated
  before update on public.job_data
  for each row execute procedure public.handle_updated_at();

-- Grant permissions for the job_data table
grant select, insert, update, delete on table public.job_data to authenticated;
grant all on table public.job_data to service_role;

-- Anon role should not have access to this personal data. 