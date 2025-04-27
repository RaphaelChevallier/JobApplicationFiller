// Define the structure of the profiles table data
export type Profile = {
  id: string // Corresponds to UUID in DB
  user_id: string // Corresponds to UUID in DB (FK to auth.users)
  created_at: string // Corresponds to timestamptz in DB
  full_name: string | null
  phone_number: string | null
  address: string | null
  linkedin_url: string | null
  portfolio_url: string | null
  resume_url: string | null // Could be filename if using Storage
  cover_letter_template: string | null
}

// You might also want to define types for your Supabase schema if using generated types
// For example, using supabase gen types typescript > types/supabase.ts
// import { Database } from './supabase';
// export type Profile = Database['public']['Tables']['profiles']['Row']; 