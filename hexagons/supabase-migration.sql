-- ============================================================
-- Hexagons — Supabase Migration
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- 1. Profiles — auto-created on signup via trigger
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  display_name text,
  email text,
  created_at timestamptz default now() not null
);

-- 2. Game results — one row per user per puzzle day
create table public.game_results (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  puzzle_date text not null,
  puzzle_number integer,
  solved boolean default false not null,
  competitive boolean default false not null,
  elapsed_seconds integer default 0,
  mistakes integer default 0,
  difficulty text,
  difficulty_level integer,
  completed_at timestamptz default now() not null,
  constraint unique_user_puzzle unique(user_id, puzzle_date)
);

create index idx_game_results_user_date
  on public.game_results(user_id, puzzle_date desc);

-- 3. Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, split_part(new.email, '@', 1));
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 4. Row Level Security
alter table public.profiles enable row level security;
alter table public.game_results enable row level security;

create policy "Users can view own profile"
  on public.profiles for select using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

create policy "Users can view own results"
  on public.game_results for select using (auth.uid() = user_id);

create policy "Users can insert own results"
  on public.game_results for insert with check (auth.uid() = user_id);

create policy "Users can update own results"
  on public.game_results for update using (auth.uid() = user_id);
