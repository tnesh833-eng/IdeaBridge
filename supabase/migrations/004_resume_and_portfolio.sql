-- Stage 1: Resume Private Storage, Portfolio Completion & Project Publishing Gate

-- 1. Optional portfolio & resume metadata columns on profiles
alter table public.profiles
  add column if not exists bio text not null default '',
  add column if not exists about text not null default '',
  add column if not exists github_url text not null default '',
  add column if not exists linkedin_url text not null default '',
  add column if not exists resume_storage_path text,
  add column if not exists resume_filename text,
  add column if not exists resume_size_bytes integer check (resume_size_bytes is null or (resume_size_bytes > 0 and resume_size_bytes <= 5242880)),
  add column if not exists resume_uploaded_at timestamptz;

-- 2. Private storage bucket for PDF resumes (max 5 MB, PDF only)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('resumes', 'resumes', false, 5242880, array['application/pdf'])
on conflict (id) do update
  set public = false,
      file_size_limit = 5242880,
      allowed_mime_types = array['application/pdf'];

-- Storage RLS: students can read, upload, replace, and delete only inside their own folder (<uid>/*)
create policy "Students can view own private resume"
  on storage.objects for select
  using (bucket_id = 'resumes' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Students can upload own private resume"
  on storage.objects for insert
  with check (bucket_id = 'resumes' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Students can replace own private resume"
  on storage.objects for update
  using (bucket_id = 'resumes' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Students can delete own private resume"
  on storage.objects for delete
  using (bucket_id = 'resumes' and auth.uid()::text = (storage.foldername(name))[1]);

-- 3. Student Projects table (publishing gated by uploaded resume)
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  idea_id uuid references public.ideas(id) on delete set null,
  builder_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 4 and 120),
  description text not null check (char_length(description) between 20 and 2000),
  domain text not null check (domain in ('Environment', 'Health', 'Education', 'FinTech', 'Campus Tech', 'Civic')),
  difficulty text not null check (difficulty in ('Beginner', 'Intermediate', 'Advanced')),
  tech_stack text[] not null default '{}',
  github_url text not null,
  demo_url text not null default '',
  status text not null default 'published' check (status in ('published', 'draft')),
  created_at timestamptz not null default now()
);

alter table public.projects enable row level security;

-- Projects appear publicly ONLY when published and the builder currently has a resume uploaded
create policy "Anyone can view published projects with active resume"
  on public.projects for select
  using (
    builder_id = auth.uid()
    or (
      status = 'published'
      and exists (
        select 1 from public.profiles p
        where p.id = builder_id and p.resume_storage_path is not null
      )
    )
  );

-- Students can insert/publish a project ONLY when their profile has a resume uploaded
create policy "Builders can publish projects only with resume"
  on public.projects for insert
  with check (
    auth.uid() = builder_id
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.resume_storage_path is not null
    )
  );

create policy "Builders can delete own projects"
  on public.projects for delete
  using (auth.uid() = builder_id);
