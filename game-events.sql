-- ============================================================
-- Permadeath Media play analytics
-- Run this once in the Supabase SQL Editor (Dashboard > SQL Editor)
-- of the project the games already use (kmxkuyloybrdtcdiiqwo).
--
-- The games send what happens in a run (it started, a milestone, a choice,
-- a win or a loss, the tab closed) to /api/events, which writes here. No
-- emails, names or IP addresses: a player is a random id their browser made
-- up, and a browser with Do Not Track or Global Privacy Control sends nothing.
-- ============================================================

create table public.game_events (
  id bigint generated always as identity primary key,
  game text not null,                     -- 'hedy-plant', 'card-check', ...
  game_version text,                      -- the build, so a balance change can be compared
  player text not null,                   -- random id kept in the browser, not an account
  session text not null,                  -- one page load
  run text,                               -- one playthrough, from run_start to run_end
  name text not null,                     -- run_start, run_end, milestone, choice, session_end, ...
  props jsonb not null default '{}',      -- outcome, milestone, choice and option, progress ...
  t real,                                 -- seconds of play in the run when it happened
  created_at timestamptz default now() not null,
  constraint game_events_game_length check (length(game) <= 40),
  constraint game_events_name_length check (length(name) <= 40),
  constraint game_events_ids_length check (length(player) <= 64 and length(session) <= 64 and (run is null or length(run) <= 64)),
  constraint game_events_version_length check (game_version is null or length(game_version) <= 40),
  constraint game_events_props_size check (pg_column_size(props) <= 4096)
);

create index game_events_game_name on public.game_events (game, name, created_at);
create index game_events_run on public.game_events (run);

alter table public.game_events enable row level security;

-- Anyone may add an event. Nobody may read, change or remove one through the
-- public API: the numbers are only visible from the dashboard.
create policy "Anyone can record a game event"
  on public.game_events for insert
  to anon, authenticated
  with check (true);

grant insert on public.game_events to anon, authenticated;

-- ------------------------------------------------------------
-- Read-outs, for the SQL Editor. Swap the game name.
-- ------------------------------------------------------------

-- How runs end: wins, losses, and runs abandoned (started, never ended).
--   select coalesce(e.props->>'outcome', 'abandoned') as outcome, count(*) as runs,
--          round(100.0 * count(*) / sum(count(*)) over (), 1) as pct
--   from public.game_events s
--   left join public.game_events e on e.run = s.run and e.name = 'run_end'
--   where s.game = 'hedy-plant' and s.name = 'run_start'
--   group by 1 order by runs desc;

-- Where people quit: the last milestone reached in runs that never ended.
--   with open_runs as (
--     select s.run from public.game_events s
--     where s.game = 'hedy-plant' and s.name = 'run_start'
--       and not exists (select 1 from public.game_events e where e.run = s.run and e.name = 'run_end')
--   ), last as (
--     select distinct on (m.run) m.run, m.props->>'milestone' as milestone
--     from public.game_events m join open_runs o using (run)
--     where m.name = 'milestone' order by m.run, m.t desc nulls last, m.id desc
--   )
--   select coalesce(l.milestone, '(before the first milestone)') as quit_after, count(*) as runs
--   from open_runs o left join last l using (run) group by 1 order by runs desc;

-- Which choices people make.
--   select props->>'choice' as choice, props->>'option' as option, count(*) as times,
--          round(100.0 * count(*) / sum(count(*)) over (partition by props->>'choice'), 1) as pct
--   from public.game_events where game = 'hedy-plant' and name = 'choice'
--   group by 1, 2 order by 1, times desc;

-- Win rate by choice: do players who pick an option win more?
--   select c.props->>'choice' as choice, c.props->>'option' as option, count(distinct c.run) as runs,
--          round(100.0 * count(distinct e.run) filter (where e.props->>'outcome' = 'win') / count(distinct c.run), 1) as win_pct
--   from public.game_events c left join public.game_events e on e.run = c.run and e.name = 'run_end'
--   where c.game = 'hedy-plant' and c.name = 'choice'
--   group by 1, 2 order by 1, runs desc;

-- Players and runs per week.
--   select date_trunc('week', created_at) as week, count(distinct player) as players,
--          count(*) filter (where name = 'run_start') as runs
--   from public.game_events where game = 'hedy-plant' group by 1 order by 1;
