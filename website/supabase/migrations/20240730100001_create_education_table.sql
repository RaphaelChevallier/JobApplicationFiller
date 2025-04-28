-- Migration: Create the education table
-- Purpose: Store user education history (multiple entries per user).

-- Define an enum type for degree levels (based on user image)
create type public.degree_type as enum (
  'High School',
  'Associate''s Degree',
  'Bachelor''s Degree',
  'Master''s Degree',
  'Master of Business Administration (M.B.A.)',
  'Juris Doctor (J.D.)',
  'Doctor of Medicine (M.D.)',
  'Doctor of Philosophy (Ph.D.)',
  -- Add other relevant types as needed
  'Other',
  'Not Applicable'
);

-- Create the education table
create table public.education (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  school_name text not null,
  degree degree_type, -- Use the enum type
  field_of_study text,
  start_date date,
  end_date date, -- Can be null if ongoing
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,

  constraint user_id_fk foreign key (user_id) references public.profiles (id)
);

-- Add comments
comment on table public.education is 'Stores user education entries.';
comment on column public.education.user_id is 'Links to the user in the profiles table.';

-- Enable Row Level Security (RLS)
alter table public.education enable row level security;

-- RLS Policies for education table

-- Policy: Allow individuals to view their own education entries
create policy "Allow individuals to view their own education entries."
  on public.education for select
  using (auth.uid() = user_id);

-- Policy: Allow individuals to insert their own education entries
create policy "Allow individuals to insert their own education entries."
  on public.education for insert
  with check (auth.uid() = user_id);

-- Policy: Allow individuals to update their own education entries
create policy "Allow individuals to update their own education entries."
  on public.education for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Policy: Allow individuals to delete their own education entries
create policy "Allow individuals to delete their own education entries."
  on public.education for delete
  using (auth.uid() = user_id);

-- Set up trigger for 'updated_at' timestamp (using the function created in the profiles migration)
create trigger on_education_updated
  before update on public.education
  for each row execute procedure public.handle_updated_at();

-- Grant permissions
grant select, insert, update, delete on table public.education to authenticated;
grant all on table public.education to service_role;

-- Grant usage on the degree_type enum
grant usage on type public.degree_type to authenticated;
grant usage on type public.degree_type to service_role; 