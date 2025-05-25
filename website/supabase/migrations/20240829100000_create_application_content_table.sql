-- Migration: Create the application_content table
-- Purpose: Stores the content used for each job application submission
-- Affected tables/columns: public.application_content

-- Create the application_content table
create table public.application_content (
  id uuid not null default gen_random_uuid(),
  job_application_id uuid not null,
  resume_used text, -- URL to the specific resume used
  cover_letter_used text, -- URL or content of the cover letter used
  answers_provided jsonb, -- JSON object storing form field IDs and the answers provided
  custom_fields jsonb, -- Any additional custom fields/responses
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone,
  
  primary key (id),
  constraint application_content_job_application_id_fkey foreign key (job_application_id)
    references public.job_applications (id) on delete cascade
);

-- Add comments for clarity
comment on table public.application_content is 'Stores the content used for each job application submission.';
comment on column public.application_content.job_application_id is 'Links to the job application in the job_applications table.';
comment on column public.application_content.resume_used is 'URL to the specific resume used for this application.';
comment on column public.application_content.cover_letter_used is 'URL or content of the cover letter used for this application.';
comment on column public.application_content.answers_provided is 'JSON object storing form field IDs and the answers provided.';
comment on column public.application_content.custom_fields is 'Any additional custom fields or responses used in the application.';

-- Create index on job_application_id for faster lookups
create index idx_application_content_job_application_id on public.application_content(job_application_id);

-- Enable Row Level Security (RLS)
alter table public.application_content enable row level security;

-- Create RLS policies for application_content table

-- Policy: Allow individuals to view their own application content through the job application relationship
create policy "Allow individuals to view their own application content."
  on public.application_content for select
  using (
    exists (
      select 1
      from public.job_applications
      where job_applications.id = application_content.job_application_id
        and job_applications.user_id = auth.uid()
    )
  );

-- Policy: Allow individuals to insert their own application content
create policy "Allow individuals to insert their own application content."
  on public.application_content for insert
  with check (
    exists (
      select 1
      from public.job_applications
      where job_applications.id = application_content.job_application_id
        and job_applications.user_id = auth.uid()
    )
  );

-- Policy: Allow individuals to update their own application content
create policy "Allow individuals to update their own application content."
  on public.application_content for update
  using (
    exists (
      select 1
      from public.job_applications
      where job_applications.id = application_content.job_application_id
        and job_applications.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.job_applications
      where job_applications.id = application_content.job_application_id
        and job_applications.user_id = auth.uid()
    )
  );

-- Policy: Allow individuals to delete their own application content
create policy "Allow individuals to delete their own application content."
  on public.application_content for delete
  using (
    exists (
      select 1
      from public.job_applications
      where job_applications.id = application_content.job_application_id
        and job_applications.user_id = auth.uid()
    )
  );

-- Use the existing function for updating the timestamp
create trigger on_application_content_updated
  before update on public.application_content
  for each row execute procedure public.handle_updated_at();

-- Grant permissions for the application_content table
grant select, insert, update, delete on table public.application_content to authenticated;
grant all on table public.application_content to service_role;

-- Anon role should not have access to this personal data. 