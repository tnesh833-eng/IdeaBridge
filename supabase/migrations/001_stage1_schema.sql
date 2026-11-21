-- IdeaBridge Stage 1 Supabase PostgreSQL Schema & Row Level Security (RLS)

create extension if not exists "pgcrypto";

-- 1. Student Profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 80),
  college text not null check (char_length(college) between 2 and 120),
  skills text[] not null default '{}',
  points_balance integer not null default 0 check (points_balance >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Users can read their own full profile
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

-- Users can insert/update only their own profile (points_balance is immutable from client)
create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id and points_balance = 0);

create policy "Users can update own non-balance profile fields"
  on public.profiles for update
  using (auth.uid() = id)
  with check (
    auth.uid() = id
    and points_balance = (select p.points_balance from public.profiles p where p.id = auth.uid())
  );

-- 2. Project Ideas (public summary vs protected full details)
create table if not exists public.ideas (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 4 and 120),
  summary text not null check (char_length(summary) between 10 and 240),
  problem text not null check (char_length(problem) between 10 and 2000),
  purpose text not null check (char_length(purpose) between 10 and 2000),
  target_users text not null check (char_length(target_users) between 3 and 500),
  domain text not null check (domain in ('Environment', 'Health', 'Education', 'FinTech', 'Campus Tech', 'Civic')),
  difficulty text not null check (difficulty in ('Beginner', 'Intermediate', 'Advanced')),
  tech_stack text[] not null default '{}',
  created_at timestamptz not null default now()
);

alter table public.ideas enable row level security;

-- Only the author can directly select full idea details in Stage 1
-- (Stage 2 adds unlocked_ideas check for paid Razorpay unlocks)
create policy "Authors can view own full ideas"
  on public.ideas for select
  using (auth.uid() = author_id);

create policy "Authenticated users can insert ideas as author"
  on public.ideas for insert
  with check (auth.uid() = author_id);

create policy "Authors can delete own ideas"
  on public.ideas for delete
  using (auth.uid() = author_id);

-- Public feed projection exposing ONLY title, summary, domain, difficulty, and author attribution
create or replace view public.idea_feed_cards as
  select
    i.id,
    i.author_id,
    i.title,
    i.summary,
    i.domain,
    i.difficulty,
    i.created_at,
    p.name as author_name,
    p.college as author_college
  from public.ideas i
  join public.profiles p on p.id = i.author_id;

grant select on public.idea_feed_cards to anon, authenticated;
