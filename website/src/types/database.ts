// Define the structure of the profiles table data
export type Profile = {
  id: string // Corresponds to UUID in DB
  updated_at: string | null // Keep as string | null for consistency with DB fetch? Or Date?
                            // Supabase client usually handles Date -> string conversion.
                            // Let's keep as string | null for now, as fetched data is string.
                            // The action uses new Date(), Supabase client handles it.
  username: string | null
  full_name: string | null // Kept for potential future use or if schema wasn't fully cleaned
  avatar_url: string | null
  website: string | null
  // Added fields
  first_name: string | null
  last_name: string | null
  phone: string | null
  location: string | null
  resume_url: string | null
  cover_letter_url: string | null
}

// Define Education type 
export type Education = {
  id: string
  user_id: string
  school_name: string
  degree: string | null // Match the enum type from migration
  field_of_study: string | null
  start_date: string | null // Use string for date inputs initially
  end_date: string | null
  created_at: string // fetched as string
  updated_at: string // fetched as string
}

// You might also want to define types for your Supabase schema if using generated types
// For example, using supabase gen types typescript > types/supabase.ts
// import { Database } from './supabase';
// export type Profile = Database['public']['Tables']['profiles']['Row']; 