// Type definitions for database schema

// Profile type
export type Profile = {
  id: string;
  updated_at: string | null;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  website: string | null;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  location: string | null;
  resume_url: string | null;
  cover_letter_url: string | null;
  linkedin_url: string | null;
  github_url: string | null;
  portfolio_url: string | null;
  website_url: string | null;
  desired_salary: number | null;
  salary_currency: string | null;
  work_authorization: string | null;
  preferred_location: string | null;
  willing_to_relocate: boolean | null;
  additional_info: string | null;
  street_address: string | null;
  address_line_2: string | null;
  city: string | null;
  state_province: string | null;
  zip_postal_code: string | null;
  country: string | null;
  full_address: string | null;
  force_exact_resume: boolean | null;
};

// Education type
export type Education = {
  id: string;
  user_id: string;
  school_name: string;
  degree: string | null;
  field_of_study: string | null;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  updated_at: string;
};

// Work Experience type
export type WorkExperience = {
  id: string;
  user_id: string;
  company_name: string;
  job_title: string;
  start_date: string | null;
  end_date: string | null;
  is_current_position: boolean;
  location: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
};

// Skill type
export type Skill = {
  id: string;
  user_id: string;
  skill_name: string;
  proficiency: string | null;
  created_at: string;
  updated_at: string;
};

// Reference type
export type Reference = {
  id: string;
  user_id: string;
  full_name: string;
  company: string | null;
  job_title: string | null;
  email: string | null;
  phone: string | null;
  relationship: string | null;
  created_at: string;
  updated_at: string;
};

// Job Data type (from the original schema)
export type JobData = {
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  linkedin_url: string | null;
  portfolio_url: string | null;
  github_url: string | null;
  website_url: string | null;
  resume_url: string | null;
  cover_letter_template: string | null;
  desired_salary: number | null;
  salary_currency: string | null;
  location_preference: string | null;
  work_authorization: string | null;
  additional_info: string | null;
};

// You might also want to define types for your Supabase schema if using generated types
// For example, using supabase gen types typescript > types/supabase.ts
// import { Database } from './supabase';
// export type Profile = Database['public']['Tables']['profiles']['Row']; 