-- ============================================================
-- Permadeath Media stats dashboard: the read-out behind /stats/
-- Run this once in the Supabase SQL Editor (Dashboard > SQL Editor) of the
-- studio project (kmxkuyloybrdtcdiiqwo), after game-events.sql. Running it
-- again replaces the function, so a later change is the same step.
--
-- game_stats(since) reads game_events and returns every number the dashboard
-- shows as one JSON object. Only the service role can call it: the public key
-- and signed-in players can't, and api/stats.js calls it only after checking
-- the caller signed in with Google as an allowed email.
-- ============================================================

create or replace function public.game_stats(since timestamptz default null)
returns jsonb
language sql
stable
set search_path = public
as $$
with
-- Events in the window.
ev as (
  select * from game_events
  where created_at >= coalesce(since, '-infinity'::timestamptz)
),
-- Every run with activity in the window, with all of its events, so a save
-- resumed today that started last week counts whole.
run_ids as (select distinct game, run from ev where run is not null),
rev as (
  select e.* from game_events e join run_ids r on r.run = e.run and r.game = e.game
),
runs0 as (
  select
    game, run,
    min(player) as player,
    min(created_at) as first_at,
    max(created_at) as last_at,
    coalesce(max(t), 0) as seconds,
    (array_agg(props->>'outcome' order by id desc) filter (where name = 'run_end'))[1] as outcome,
    -- Games name how a run ended differently: Hedy Plant `ending`, Card Check `ended_by`.
    (array_agg(coalesce(props->>'ending', props->>'ended_by', props->>'reason', props->>'kind') order by id desc)
      filter (where name = 'run_end'))[1] as ending,
    (array_agg(props->>'milestone' order by t desc nulls last, id desc) filter (where name = 'milestone'))[1] as last_milestone,
    (array_agg(game_version order by id) filter (where game_version is not null))[1] as version
  from rev
  group by game, run
),
-- result: win / loss / quit as sent; no run_end and quiet for 30 minutes is
-- 'abandoned' (the player left); no run_end but recent is 'playing'.
runs as (
  select *,
    case
      when outcome is not null then outcome
      when last_at > now() - interval '30 minutes' then 'playing'
      else 'abandoned'
    end as result,
    first_at >= coalesce(since, '-infinity'::timestamptz) as started_in_window
  from runs0
),
sessions as (
  select game, session,
    extract(epoch from max(created_at) - min(created_at)) as seconds
  from ev group by game, session
),
player_days as (
  select game, player, count(distinct (created_at at time zone 'utc')::date) as days
  from ev group by game, player
),
-- When each player in the window was first seen at all, for "new players".
first_seen as (
  select player, game, min(created_at) as first_at
  from game_events
  where player in (select distinct player from ev)
  group by player, game
),
games as (
  select
    e.game,
    count(distinct e.player) as players,
    count(distinct e.session) as sessions,
    count(*) as events,
    max(e.created_at) as last_event_at
  from ev e group by e.game
),
run_totals as (
  select game,
    count(*) as runs,
    count(*) filter (where started_in_window) as runs_started,
    count(*) filter (where result = 'win') as wins,
    count(*) filter (where result = 'loss') as losses,
    count(*) filter (where result = 'quit') as quits,
    count(*) filter (where result = 'abandoned') as abandoned,
    count(*) filter (where result = 'playing') as playing,
    sum(seconds) as play_seconds,
    percentile_cont(0.5) within group (order by seconds) as median_run_seconds,
    percentile_cont(0.9) within group (order by seconds) as p90_run_seconds
  from runs group by game
),
session_totals as (
  select game,
    percentile_cont(0.5) within group (order by seconds) as median_session_seconds
  from sessions group by game
),
new_players as (
  select game, count(*) as new_players
  from first_seen
  where first_at >= coalesce(since, '-infinity'::timestamptz)
  group by game
),
returning_players as (
  select game,
    count(*) filter (where days >= 2) as returning_players,
    count(*) filter (where days = 1) as one_day,
    count(*) filter (where days between 2 and 3) as two_three_days,
    count(*) filter (where days between 4 and 7) as four_seven_days,
    count(*) filter (where days >= 8) as eight_plus_days
  from player_days group by game
),
-- Where players came from, from the ?ref= tags the kit records on run_start
-- and run_resume (kit/analytics.js). A player's source is the first tag their
-- browser ever arrived with (props.first_ref), or this visit's tag on builds
-- from before first_ref; '(none)' is no tag at all: typed in, a bookmark, the
-- site's own links, or a game whose build doesn't record tags.
player_source as (
  select p.player, coalesce((
    select coalesce(e.props->>'first_ref', e.props->>'ref')
    from game_events e
    where e.player = p.player and e.name in ('run_start', 'run_resume')
      and (e.props ? 'first_ref' or e.props ? 'ref')
    order by e.created_at, e.id limit 1
  ), '(none)') as source
  from (select distinct player from ev) p
),
-- Plays that arrived through a tagged link in the window: each run_start or
-- run_resume carrying ?ref= on that visit.
link_plays as (
  select props->>'ref' as ref, game, player, run from ev
  where name in ('run_start', 'run_resume') and props ? 'ref'
),
first_seen_any as (
  select player, min(first_at) as first_at from first_seen group by player
),
source_totals as (
  select ps.source,
    count(*) as players,
    count(*) filter (where f.first_at >= coalesce(since, '-infinity'::timestamptz)) as new_players
  from player_source ps join first_seen_any f using (player)
  group by ps.source
),
source_runs as (
  select ps.source,
    count(*) as runs,
    count(*) filter (where r.started_in_window) as runs_started,
    count(*) filter (where r.result = 'win') as wins,
    count(*) filter (where r.result in ('win', 'loss', 'quit')) as ended,
    coalesce(sum(r.seconds), 0) as play_seconds
  from runs r join player_source ps using (player)
  group by ps.source
),
source_links as (
  select ref as source, count(*) as link_plays, count(distinct player) as link_players
  from link_plays group by ref
)
select jsonb_build_object(
  'generated_at', now(),
  'since', since,

  'totals', (
    select jsonb_build_object(
      'players', (select count(distinct player) from ev),
      'new_players', (select count(*) from (select player from first_seen group by player
                       having min(first_at) >= coalesce(since, '-infinity'::timestamptz)) n),
      'returning_players', (select count(*) from (select player from ev group by player
                             having count(distinct (created_at at time zone 'utc')::date) >= 2) r),
      'multi_game_players', (select count(*) from (select player from ev group by player
                              having count(distinct game) >= 2) m),
      'sessions', (select count(distinct session) from ev),
      'events', (select count(*) from ev),
      'runs', (select count(*) from runs),
      'runs_started', (select count(*) from runs where started_in_window),
      'wins', (select count(*) from runs where result = 'win'),
      'losses', (select count(*) from runs where result = 'loss'),
      'quits', (select count(*) from runs where result = 'quit'),
      'abandoned', (select count(*) from runs where result = 'abandoned'),
      'play_seconds', (select coalesce(sum(seconds), 0) from runs),
      'median_run_seconds', (select percentile_cont(0.5) within group (order by seconds) from runs),
      'median_session_seconds', (select percentile_cont(0.5) within group (order by seconds) from sessions)
    )
  ),

  'games', coalesce((
    select jsonb_agg(jsonb_build_object(
      'game', g.game,
      'players', g.players,
      'new_players', coalesce(n.new_players, 0),
      'returning_players', coalesce(rp.returning_players, 0),
      'active_days', jsonb_build_object('1', coalesce(rp.one_day, 0), '2-3', coalesce(rp.two_three_days, 0),
                                        '4-7', coalesce(rp.four_seven_days, 0), '8+', coalesce(rp.eight_plus_days, 0)),
      'sessions', g.sessions,
      'events', g.events,
      'last_event_at', g.last_event_at,
      'runs', coalesce(rt.runs, 0),
      'runs_started', coalesce(rt.runs_started, 0),
      'wins', coalesce(rt.wins, 0),
      'losses', coalesce(rt.losses, 0),
      'quits', coalesce(rt.quits, 0),
      'abandoned', coalesce(rt.abandoned, 0),
      'playing', coalesce(rt.playing, 0),
      'play_seconds', coalesce(rt.play_seconds, 0),
      'median_run_seconds', rt.median_run_seconds,
      'p90_run_seconds', rt.p90_run_seconds,
      'median_session_seconds', st.median_session_seconds
    ) order by g.players desc, g.game)
    from games g
    left join run_totals rt using (game)
    left join session_totals st using (game)
    left join new_players n using (game)
    left join returning_players rp using (game)
  ), '[]'::jsonb),

  -- One row per UTC day per game.
  'daily', coalesce((
    select jsonb_agg(d order by d->>'day', d->>'game') from (
      select jsonb_build_object(
        'day', (created_at at time zone 'utc')::date,
        'game', game,
        'players', count(distinct player),
        'sessions', count(distinct session),
        'runs_started', count(*) filter (where name = 'run_start')
      ) as d
      from ev group by (created_at at time zone 'utc')::date, game
    ) x
  ), '[]'::jsonb),

  -- How runs ended, and the game's own name for the ending.
  'endings', coalesce((
    select jsonb_agg(x order by x->>'game', (x->>'runs')::int desc) from (
      select jsonb_build_object(
        'game', game, 'result', result, 'ending', ending,
        'runs', count(*),
        'median_seconds', percentile_cont(0.5) within group (order by seconds)
      ) as x
      from runs group by game, result, ending
    ) y
  ), '[]'::jsonb),

  -- Where runs stop: the last milestone reached in runs that were lost, quit or abandoned.
  'stops', coalesce((
    select jsonb_agg(x order by x->>'game', x->>'result', (x->>'runs')::int desc) from (
      select jsonb_build_object(
        'game', game, 'result', result,
        'milestone', coalesce(last_milestone, '(before the first milestone)'),
        'runs', count(*),
        'median_seconds', percentile_cont(0.5) within group (order by seconds)
      ) as x
      from runs where result in ('loss', 'quit', 'abandoned')
      group by game, result, coalesce(last_milestone, '(before the first milestone)')
    ) y
  ), '[]'::jsonb),

  -- How far runs get: of the runs started in the window, how many reached each milestone.
  'milestones', coalesce((
    select jsonb_agg(x order by x->>'game', (x->>'median_t')::float nulls last) from (
      select jsonb_build_object(
        'game', m.game,
        'milestone', m.props->>'milestone',
        'runs', count(distinct m.run),
        'of', (select count(*) from runs r2 where r2.game = m.game and r2.started_in_window),
        'median_t', percentile_cont(0.5) within group (order by m.t)
      ) as x
      from rev m join runs r on r.run = m.run and r.game = m.game and r.started_in_window
      where m.name = 'milestone'
      group by m.game, m.props->>'milestone'
    ) y
  ), '[]'::jsonb),

  -- Choices, and how runs that made each one ended.
  'choices', coalesce((
    select jsonb_agg(x order by x->>'game', x->>'choice', (x->>'times')::int desc) from (
      select jsonb_build_object(
        'game', c.game,
        'choice', c.props->>'choice',
        'option', c.props->>'option',
        'times', count(*),
        'runs', count(distinct c.run),
        'ended', count(distinct c.run) filter (where r.result in ('win', 'loss', 'quit')),
        'wins', count(distinct c.run) filter (where r.result = 'win')
      ) as x
      from ev c left join runs r on r.run = c.run and r.game = c.game
      where c.name = 'choice'
      group by c.game, c.props->>'choice', c.props->>'option'
    ) y
  ), '[]'::jsonb),

  -- Builds, so a balance change can be compared with the one before it.
  'versions', coalesce((
    select jsonb_agg(x order by x->>'game', x->>'first_at' desc) from (
      select jsonb_build_object(
        'game', game,
        'version', coalesce(version, '(none)'),
        'first_at', min(first_at),
        'runs', count(*),
        'players', count(distinct player),
        'wins', count(*) filter (where result = 'win'),
        'losses', count(*) filter (where result = 'loss'),
        'quits', count(*) filter (where result = 'quit'),
        'abandoned', count(*) filter (where result = 'abandoned'),
        'median_seconds', percentile_cont(0.5) within group (order by seconds)
      ) as x
      from runs group by game, coalesce(version, '(none)')
    ) y
  ), '[]'::jsonb),

  -- Any other event names a game sends, so nothing it records goes unseen.
  'event_names', coalesce((
    select jsonb_agg(x order by x->>'game', (x->>'count')::int desc) from (
      select jsonb_build_object('game', game, 'name', name, 'count', count(*)) as x
      from ev group by game, name
    ) y
  ), '[]'::jsonb),

  -- Where players came from (see player_source), with the plays that came
  -- straight through each tagged link in the window.
  'sources', coalesce((
    select jsonb_agg(x order by (x->>'players')::int desc, (x->>'link_plays')::int desc, x->>'source') from (
      select jsonb_build_object(
        'source', s.source,
        'players', coalesce(t.players, 0),
        'new_players', coalesce(t.new_players, 0),
        'runs', coalesce(r.runs, 0),
        'runs_started', coalesce(r.runs_started, 0),
        'wins', coalesce(r.wins, 0),
        'ended', coalesce(r.ended, 0),
        'play_seconds', coalesce(r.play_seconds, 0),
        'link_plays', coalesce(l.link_plays, 0),
        'link_players', coalesce(l.link_players, 0)
      ) as x
      from (select source from source_totals union select source from source_links) s
      left join source_totals t using (source)
      left join source_runs r using (source)
      left join source_links l using (source)
    ) y
  ), '[]'::jsonb),

  -- Players and runs by source and game.
  'source_games', coalesce((
    select jsonb_agg(x order by x->>'source', x->>'game') from (
      select jsonb_build_object(
        'source', ps.source, 'game', e.game,
        'players', count(distinct e.player),
        'runs', count(distinct e.run)
      ) as x
      from ev e join player_source ps using (player)
      group by ps.source, e.game
    ) y
  ), '[]'::jsonb),

  -- One row per UTC day per source.
  'source_daily', coalesce((
    select jsonb_agg(d order by d->>'day', d->>'source') from (
      select jsonb_build_object(
        'day', (e.created_at at time zone 'utc')::date,
        'source', ps.source,
        'players', count(distinct e.player),
        'runs_started', count(*) filter (where e.name = 'run_start')
      ) as d
      from ev e join player_source ps using (player)
      group by (e.created_at at time zone 'utc')::date, ps.source
    ) x
  ), '[]'::jsonb)
);
$$;

-- Supabase grants new functions to the public roles by default; take that back.
revoke all on function public.game_stats(timestamptz) from public, anon, authenticated;
grant execute on function public.game_stats(timestamptz) to service_role;
-- The function reads as its caller; Supabase's service role can already read
-- every table, and this makes that explicit for game_events.
grant select on public.game_events to service_role;

-- Lookups by player for "new players".
create index if not exists game_events_player on public.game_events (player, created_at);
