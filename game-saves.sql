-- ============================================================
-- Permadeath Media cloud saves
-- Run this once in the Supabase SQL Editor (Dashboard > SQL Editor)
-- of the project the games already use (kmxkuyloybrdtcdiiqwo).
--
-- Players sign in with an emailed login link (Supabase Auth, the same
-- accounts Hexagons uses). Each signed-in player has one save per game.
-- ============================================================

create table public.game_saves (
  user_id uuid references auth.users(id) on delete cascade not null,
  game text not null,                     -- 'hedy-plant', ...
  data jsonb not null,                    -- the game's own save object
  updated_at timestamptz default now() not null,
  primary key (user_id, game),
  constraint game_saves_game_length check (length(game) <= 40),
  constraint game_saves_size check (pg_column_size(data) <= 262144)  -- 256 KB
);

alter table public.game_saves enable row level security;

-- A player can read, create and overwrite only their own saves.
create policy "Players read their own saves"
  on public.game_saves for select to authenticated
  using (auth.uid() = user_id);

create policy "Players create their own saves"
  on public.game_saves for insert to authenticated
  with check (auth.uid() = user_id);

create policy "Players update their own saves"
  on public.game_saves for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Players delete their own saves"
  on public.game_saves for delete to authenticated
  using (auth.uid() = user_id);

grant select, insert, update, delete on public.game_saves to authenticated;
