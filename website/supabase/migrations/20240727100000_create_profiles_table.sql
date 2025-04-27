-- Migration: Create the profiles table
-- Purpose: Stores public user profile information linked to authentication.
-- Affected tables/columns: public.profiles

-- Enable pgcrypto extension if not already enabled (for gen_random_uuid())
-- create extension if not exists pgcrypto with schema extensions;

-- Create the profiles table
create table public.profiles (
  id uuid not null references auth.users on delete cascade,
  updated_at timestamp with time zone,
  username text unique,
  full_name text,
  avatar_url text,
  website text,

  primary key (id),
  constraint username_length check (char_length(username) >= 3)
);

-- Add comment for the table
comment on table public.profiles is 'Profile data for each user.';
comment on column public.profiles.id is 'References the internal Supabase Auth user.';

-- Enable Row Level Security (RLS)
alter table public.profiles enable row level security;

-- Create RLS policies for profiles table

-- Policy: Allow individuals to view their own profile
create policy "Allow individuals to view their own profile."
  on public.profiles for select
  using (auth.uid() = id);

-- Policy: Allow individuals to insert their own profile
-- Note: This assumes the user's auth.uid() is used for the 'id' column during insert.
-- Supabase helper functions often handle this automatically.
create policy "Allow individuals to insert their own profile."
  on public.profiles for insert
  with check (auth.uid() = id);

-- Policy: Allow individuals to update their own profile
create policy "Allow individuals to update their own profile."
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Optional: Set up a trigger to automatically update 'updated_at' timestamp
-- Create the function to update timestamp
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql security definer;

-- Create the trigger
create trigger on_profile_updated
  before update on public.profiles
  for each row execute procedure public.handle_updated_at();

-- Grant usage on the schema to necessary roles
grant usage on schema public to postgres;
grant usage on schema public to authenticated;
grant usage on schema public to service_role;

-- Grant permissions for the profiles table
grant select, insert, update, delete on table public.profiles to authenticated;
grant all on table public.profiles to service_role;

-- Note: Anon role typically should not have access unless specific public profiles are intended. 