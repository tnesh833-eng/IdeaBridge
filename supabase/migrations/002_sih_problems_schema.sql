-- IdeaBridge SIH Problems, Cached AI Ideas, Saved Ideas, and Daily AI Quota Schema

alter table public.profiles
  add column if not exists role text not null default 'student'
  check (role in ('student', 'admin'));

create table if not exists public.sih_problems (
  id uuid primary key default gen_random_uuid(),
  problem_id text unique not null,
  title text not null,
  organization text not null,
  category text not null,
  description text not null,
  ideas_initialized boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.sih_problems enable row level security;

create policy "Anyone can view SIH problem statements"
  on public.sih_problems for select
  using (true);

create policy "Only admins can insert or update SIH problem statements"
  on public.sih_problems for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

create table if not exists public.sih_problem_ideas (
  id uuid primary key default gen_random_uuid(),
  problem_db_id uuid not null references public.sih_problems(id) on delete cascade,
  title text not null,
  description text not null,
  tech_stack text[] not null default '{}',
  difficulty text not null check (difficulty in ('Beginner', 'Intermediate', 'Advanced')),
  batch_number integer not null default 1,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.sih_problem_ideas enable row level security;

create policy "Anyone can read cached SIH solution ideas"
  on public.sih_problem_ideas for select
  using (true);

create table if not exists public.saved_sih_ideas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  sih_idea_id uuid not null references public.sih_problem_ideas(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, sih_idea_id)
);

alter table public.saved_sih_ideas enable row level security;

create policy "Users can view and manage only their own saved SIH ideas"
  on public.saved_sih_ideas for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table if not exists public.ai_usage_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  problem_db_id uuid not null references public.sih_problems(id) on delete cascade,
  usage_date date not null default current_date,
  created_at timestamptz not null default now()
);

alter table public.ai_usage_logs enable row level security;

create policy "Users can view own AI usage counts"
  on public.ai_usage_logs for select
  using (auth.uid() = user_id);
