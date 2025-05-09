-- Migration: Create languages table for user language proficiency
-- Purpose: Allow users to track languages they know and their proficiency level

-- Create table for languages
CREATE TABLE public.languages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  language_name TEXT NOT NULL,
  proficiency TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add comment to table
COMMENT ON TABLE public.languages IS 'Stores information about languages known by users';

-- Add comments on columns
COMMENT ON COLUMN public.languages.id IS 'Unique identifier for the language entry';
COMMENT ON COLUMN public.languages.user_id IS 'References the user who added this language';
COMMENT ON COLUMN public.languages.language_name IS 'Name of the language';
COMMENT ON COLUMN public.languages.proficiency IS 'Language proficiency level (e.g., Beginner, Intermediate, Advanced, Fluent, Native)';
COMMENT ON COLUMN public.languages.created_at IS 'Time when the language entry was created';
COMMENT ON COLUMN public.languages.updated_at IS 'Time when the language entry was last updated';

-- Create index for faster user lookups
CREATE INDEX languages_user_id_idx ON public.languages (user_id);

-- Enable Row Level Security
ALTER TABLE public.languages ENABLE ROW LEVEL SECURITY;

-- Create policy for users to select their own languages
CREATE POLICY "Users can view their own languages"
  ON public.languages
  FOR SELECT
  USING (auth.uid() = user_id);

-- Create policy for users to insert their own languages
CREATE POLICY "Users can insert their own languages"
  ON public.languages
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create policy for users to update their own languages
CREATE POLICY "Users can update their own languages"
  ON public.languages
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Create policy for users to delete their own languages
CREATE POLICY "Users can delete their own languages"
  ON public.languages
  FOR DELETE
  USING (auth.uid() = user_id);

-- Fix the full_address generated column in the profiles table to use commas instead of newlines
ALTER TABLE public.profiles
  DROP COLUMN full_address;

-- Add the improved full_address column with proper comma formatting
ALTER TABLE public.profiles
  ADD COLUMN full_address text GENERATED ALWAYS AS (
    NULLIF(
      TRIM(
        COALESCE(street_address, '') 
        || CASE WHEN address_line_2 IS NOT NULL AND address_line_2 != '' THEN ', ' || address_line_2 ELSE '' END
        || CASE WHEN city IS NOT NULL AND city != '' THEN ', ' || city ELSE '' END
        || CASE 
             WHEN state_province IS NOT NULL AND state_province != '' AND zip_postal_code IS NOT NULL AND zip_postal_code != '' 
             THEN ', ' || state_province || ' ' || zip_postal_code
             WHEN state_province IS NOT NULL AND state_province != '' 
             THEN ', ' || state_province
             WHEN zip_postal_code IS NOT NULL AND zip_postal_code != '' 
             THEN ', ' || zip_postal_code
             ELSE ''
           END
        || CASE WHEN country IS NOT NULL AND country != '' THEN ', ' || country ELSE '' END
      ),
      ''
    )
  ) STORED;

COMMENT ON COLUMN public.profiles.full_address IS 'Generated field containing the complete formatted address with comma separators'; 