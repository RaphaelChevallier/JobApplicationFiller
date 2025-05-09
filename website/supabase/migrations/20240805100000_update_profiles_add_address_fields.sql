-- Migration: Add detailed address fields to profiles table
-- Purpose: Replace the single location field with structured address fields and add a generated full_address column

-- Add new columns to the public.profiles table
ALTER TABLE public.profiles
  ADD COLUMN street_address text,
  ADD COLUMN address_line_2 text,
  ADD COLUMN city text,
  ADD COLUMN state_province text,
  ADD COLUMN zip_postal_code text,
  ADD COLUMN country text;

-- Add column comments for clarity
COMMENT ON COLUMN public.profiles.street_address IS 'Primary street address line';
COMMENT ON COLUMN public.profiles.address_line_2 IS 'Optional secondary address line (apt, suite, etc.)';
COMMENT ON COLUMN public.profiles.city IS 'City name';
COMMENT ON COLUMN public.profiles.state_province IS 'State or province';
COMMENT ON COLUMN public.profiles.zip_postal_code IS 'Postal or ZIP code';
COMMENT ON COLUMN public.profiles.country IS 'Country name';

-- Add a generated column that concatenates all address fields
-- This will be automatically updated whenever the address components change
ALTER TABLE public.profiles
  ADD COLUMN full_address text GENERATED ALWAYS AS (
    COALESCE(street_address, '') 
    || CASE WHEN address_line_2 IS NOT NULL AND address_line_2 != '' THEN E'\n' || address_line_2 ELSE '' END
    || CASE WHEN city IS NOT NULL AND city != '' THEN E'\n' || city ELSE '' END
    || CASE 
         WHEN state_province IS NOT NULL AND state_province != '' AND zip_postal_code IS NOT NULL AND zip_postal_code != '' 
         THEN ', ' || state_province || ' ' || zip_postal_code
         WHEN state_province IS NOT NULL AND state_province != '' 
         THEN ', ' || state_province
         WHEN zip_postal_code IS NOT NULL AND zip_postal_code != '' 
         THEN ', ' || zip_postal_code
         ELSE ''
       END
    || CASE WHEN country IS NOT NULL AND country != '' THEN E'\n' || country ELSE '' END
  ) STORED;

COMMENT ON COLUMN public.profiles.full_address IS 'Generated field containing the complete formatted address';

-- Note: We're keeping the original 'location' field for backward compatibility
-- In a future migration, we might want to migrate data from location to these new fields
-- and eventually drop the location column if it's no longer needed. 