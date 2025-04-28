-- Migration: Add new fields to profiles table
-- Purpose: Store additional user information like name parts, contact, location, and attachment URLs.

-- Add new columns to the public.profiles table
alter table public.profiles
  add column first_name text,
  add column last_name text,
  add column phone text,       -- Consider validation/formatting constraints if needed
  add column location text,    -- Store city/region as text for now
  add column resume_url text,  -- URL pointing to the uploaded resume in storage
  add column cover_letter_url text; -- URL pointing to the uploaded cover letter in storage

-- Add comments for new columns (optional but good practice)
comment on column public.profiles.first_name is 'User''s first name.';
comment on column public.profiles.last_name is 'User''s last name.';
comment on column public.profiles.phone is 'User''s contact phone number.';
comment on column public.profiles.location is 'User''s general location (e.g., City, Country).';
comment on column public.profiles.resume_url is 'URL path to the user''s resume file in Supabase Storage.';
comment on column public.profiles.cover_letter_url is 'URL path to the user''s cover letter file in Supabase Storage.';

-- Update RLS policies if necessary to allow updating the new columns
-- The existing policy "Allow individuals to update their own profile." should cover these
-- as it doesn't restrict specific columns, but double-check if you have column-level security.

-- Example: If you had column-level update permissions, you might need:
-- drop policy "Allow individuals to update their own profile." on public.profiles;
-- create policy "Allow individuals to update their own profile."
--   on public.profiles for update
--   using (auth.uid() = id)
--   with check (auth.uid() = id); 