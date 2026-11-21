-- IdeaBridge Nearby Events, College Profiles, Visitor Reviews, Approximate Location & Bridgey Cache

create table if not exists public.colleges (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  city text not null,
  address text not null,
  lat double precision not null,
  lng double precision not null,
  photos text[] not null default '{}',
  specialties text[] not null default '{}',
  previous_events jsonb not null default '[]'::jsonb,
  tips_canteen text not null default '',
  tips_restrooms text not null default '',
  tips_transport text not null default '',
  tips_wifi_charging text not null default '',
  tips_what_to_carry text not null default '',
  updated_at timestamptz not null default now()
);

alter table public.colleges enable row level security;

create policy "Anyone can view college profiles"
  on public.colleges for select using (true);

create table if not exists public.college_organizers (
  college_id uuid not null references public.colleges(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (college_id, user_id)
);

alter table public.college_organizers enable row level security;

create policy "Verified organizers can update their own college official details"
  on public.colleges for update
  using (
    exists (
      select 1 from public.college_organizers co
      where co.college_id = colleges.id and co.user_id = auth.uid()
    )
  );

create table if not exists public.nearby_events (
  id uuid primary key default gen_random_uuid(),
  college_id uuid not null references public.colleges(id) on delete cascade,
  title text not null,
  event_type text not null,
  event_date date not null,
  end_date date not null,
  mode text not null,
  summary text not null,
  description text not null,
  team_size text not null,
  registration_deadline date not null,
  venue_hall text not null,
  what_to_bring text not null,
  created_at timestamptz not null default now()
);

alter table public.nearby_events enable row level security;

create policy "Anyone can view nearby events"
  on public.nearby_events for select using (true);

create table if not exists public.college_reviews (
  id uuid primary key default gen_random_uuid(),
  college_id uuid not null references public.colleges(id) on delete cascade,
  event_id uuid references public.nearby_events(id) on delete set null,
  author_id uuid not null references public.profiles(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  review_text text not null,
  canteen_tip text not null default '',
  restroom_tip text not null default '',
  transport_tip text not null default '',
  wifi_tip text not null default '',
  carry_tip text not null default '',
  created_at timestamptz not null default now()
);

alter table public.college_reviews enable row level security;

create policy "Anyone can read college reviews"
  on public.college_reviews for select using (true);

create policy "Authenticated attendees can insert own reviews"
  on public.college_reviews for insert
  with check (auth.uid() = author_id);

-- Store ONLY approximate user location (rounded to ~1km city grid)
create table if not exists public.user_approx_locations (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  approx_lat numeric(6, 2) not null,
  approx_lng numeric(6, 2) not null,
  city_label text not null default '',
  updated_at timestamptz not null default now()
);

alter table public.user_approx_locations enable row level security;

create policy "Users can view and update only own approximate location"
  on public.user_approx_locations for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
