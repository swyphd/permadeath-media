-- ============================================================
-- Permadeath Media /homies: the crew's game-picking quiz, meetings and tasks
-- Run this once in the Supabase SQL Editor (Dashboard > SQL Editor)
-- of the project the games already use (kmxkuyloybrdtcdiiqwo).
--
-- /homies/ is for the four people building the next game. They sign in with
-- Google (Supabase Auth, Google provider: see homies/README.md). Everything
-- here is visible only to the crew: homies_is_member() checks the signed-in
-- email against homies_members, and every policy below starts from it.
--
-- The first person to sign in claims the crew (homies_me() adds them when the
-- members table is empty). After that, members add the others by email, so a
-- friend is on the list before they ever sign in.
-- ============================================================

-- ------------------------------------------------------------
-- Tables
-- ------------------------------------------------------------

create table public.homies_members (
  email text primary key,
  name text not null,                     -- what the crew calls them: 'Jeff'
  user_id uuid references auth.users(id) on delete set null,  -- filled in on first sign-in
  created_at timestamptz default now() not null,
  constraint homies_members_email check (
    email = lower(btrim(email)) and length(email) <= 254
    and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  ),
  constraint homies_members_name check (length(btrim(name)) between 1 and 40)
);

-- One row per person per quiz question (homies/quiz.js). pick is the side.
create table public.homies_answers (
  email text not null references public.homies_members(email) on delete cascade,
  question text not null,
  pick text not null,
  answered_at timestamptz default now() not null,
  primary key (email, question),
  constraint homies_answers_question check (length(question) <= 40),
  constraint homies_answers_pick check (pick in ('a', 'b'))
);

-- The launch meeting and every check-in after it. `notes` is the agenda's
-- structured state (pillars, pitch, roles, who showed, decisions...), written
-- by the page as a whole object.
create table public.homies_meetings (
  id uuid default gen_random_uuid() primary key,
  kind text not null,
  scheduled_at timestamptz,
  status text not null default 'planned',
  notes jsonb not null default '{}'::jsonb,
  created_by text,
  created_at timestamptz default now() not null,
  closed_at timestamptz,
  constraint homies_meetings_kind check (kind in ('launch', 'checkin')),
  constraint homies_meetings_status check (status in ('planned', 'done')),
  constraint homies_meetings_notes_size check (pg_column_size(notes) <= 65536)
);

-- What each person owes the crew between meetings.
create table public.homies_tasks (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  owner text not null references public.homies_members(email) on delete cascade,
  due_on date,
  status text not null default 'open',
  note text,                              -- why it's blocked, or a word on how it went
  meeting_id uuid references public.homies_meetings(id) on delete set null,  -- where it was agreed
  created_by text,
  created_at timestamptz default now() not null,
  done_at timestamptz,
  constraint homies_tasks_title check (length(btrim(title)) between 1 and 200),
  constraint homies_tasks_status check (status in ('open', 'done', 'blocked')),
  constraint homies_tasks_note check (note is null or length(note) <= 500)
);

create index homies_tasks_owner_status on public.homies_tasks (owner, status, due_on);
create index homies_meetings_when on public.homies_meetings (status, scheduled_at);

-- A few crew-wide switches, such as whether quiz results were revealed early.
create table public.homies_state (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now() not null,
  constraint homies_state_key check (length(key) <= 40),
  constraint homies_state_size check (pg_column_size(value) <= 16384)
);

-- ------------------------------------------------------------
-- Who's in
-- ------------------------------------------------------------

-- The signed-in person's email, lower-cased, or '' when nobody is signed in.
create or replace function public.homies_email()
returns text language sql stable as $$
  select lower(coalesce(auth.jwt() ->> 'email', ''))
$$;

-- security definer so it can read the members table from inside a policy
-- without the policy depending on itself.
create or replace function public.homies_is_member()
returns boolean language sql stable security definer set search_path = public as $$
  select auth.uid() is not null and exists (
    select 1 from public.homies_members m where m.email = public.homies_email()
  )
$$;

-- The caller's member row, or null when they're not on the crew. Links the
-- row to their account on first sign-in. When nobody is on the list yet, the
-- caller claims the crew and becomes its first member.
create or replace function public.homies_me()
returns public.homies_members language plpgsql security definer set search_path = public as $$
declare
  em text := public.homies_email();
  me public.homies_members;
  guess text;
begin
  if auth.uid() is null or em = '' then return null; end if;
  select * into me from public.homies_members where email = em;
  if me.email is null then
    if exists (select 1 from public.homies_members) then return null; end if;
    guess := coalesce(
      auth.jwt() -> 'user_metadata' ->> 'name',
      auth.jwt() -> 'user_metadata' ->> 'full_name',
      split_part(em, '@', 1));
    guess := left(btrim(split_part(guess, ' ', 1)), 40);
    if guess = '' then guess := 'Me'; end if;
    insert into public.homies_members (email, name, user_id) values (em, guess, auth.uid())
      returning * into me;
  elsif me.user_id is distinct from auth.uid() then
    update public.homies_members set user_id = auth.uid() where email = em returning * into me;
  end if;
  return me;
end
$$;

-- Sets one field of a meeting's notes in place (one or two levels deep:
-- {pitch} or {roles,jeff@x}), so two people editing the agenda at once don't
-- overwrite each other. Row security applies: only the crew can call it to
-- any effect.
create or replace function public.homies_note(meeting uuid, path text[], value jsonb)
returns void language plpgsql set search_path = public as $$
begin
  if array_length(path, 1) = 1 then
    update public.homies_meetings
      set notes = jsonb_set(coalesce(notes, '{}'::jsonb), path, coalesce(value, 'null'::jsonb), true)
      where id = meeting;
  elsif array_length(path, 1) = 2 then
    update public.homies_meetings
      set notes = jsonb_set(coalesce(notes, '{}'::jsonb), path[1:1],
        coalesce(notes -> path[1], '{}'::jsonb) || jsonb_build_object(path[2], coalesce(value, 'null'::jsonb)), true)
      where id = meeting;
  else
    raise exception 'homies_note: path must have one or two parts';
  end if;
end
$$;

grant execute on function public.homies_email() to authenticated;
grant execute on function public.homies_note(uuid, text[], jsonb) to authenticated;
grant execute on function public.homies_is_member() to authenticated;
grant execute on function public.homies_me() to authenticated;

-- ------------------------------------------------------------
-- Row Level Security: the crew sees and edits everything; nobody else
-- sees anything. Answers can only be written by the person they belong to.
-- ------------------------------------------------------------

alter table public.homies_members enable row level security;
alter table public.homies_answers enable row level security;
alter table public.homies_meetings enable row level security;
alter table public.homies_tasks enable row level security;
alter table public.homies_state enable row level security;

create policy "Crew reads the crew" on public.homies_members
  for select to authenticated using (public.homies_is_member());
create policy "Crew adds to the crew" on public.homies_members
  for insert to authenticated with check (public.homies_is_member());
create policy "Crew renames the crew" on public.homies_members
  for update to authenticated using (public.homies_is_member()) with check (public.homies_is_member());
create policy "Crew trims the crew" on public.homies_members
  for delete to authenticated using (public.homies_is_member() and email <> public.homies_email());

create policy "Crew reads answers" on public.homies_answers
  for select to authenticated using (public.homies_is_member());
create policy "Own answers only (insert)" on public.homies_answers
  for insert to authenticated with check (public.homies_is_member() and email = public.homies_email());
create policy "Own answers only (update)" on public.homies_answers
  for update to authenticated using (email = public.homies_email()) with check (email = public.homies_email());
create policy "Own answers only (delete)" on public.homies_answers
  for delete to authenticated using (email = public.homies_email());

create policy "Crew runs meetings" on public.homies_meetings
  for all to authenticated using (public.homies_is_member()) with check (public.homies_is_member());
create policy "Crew runs tasks" on public.homies_tasks
  for all to authenticated using (public.homies_is_member()) with check (public.homies_is_member());
create policy "Crew flips switches" on public.homies_state
  for all to authenticated using (public.homies_is_member()) with check (public.homies_is_member());

grant select, insert, update, delete on public.homies_members to authenticated;
grant select, insert, update, delete on public.homies_answers to authenticated;
grant select, insert, update, delete on public.homies_meetings to authenticated;
grant select, insert, update, delete on public.homies_tasks to authenticated;
grant select, insert, update, delete on public.homies_state to authenticated;

-- ------------------------------------------------------------
-- Read-outs, for the SQL Editor.
-- ------------------------------------------------------------

-- Who's answered how many questions.
--   select m.name, count(a.question) as answered
--   from public.homies_members m left join public.homies_answers a using (email)
--   group by m.name order by answered desc;

-- Open tasks per person, oldest due first.
--   select m.name, t.title, t.due_on, t.status
--   from public.homies_tasks t join public.homies_members m on m.email = t.owner
--   where t.status <> 'done' order by t.due_on nulls last;

-- Add a friend by hand (the page does this too).
--   insert into public.homies_members (email, name) values ('friend@gmail.com', 'Eric');
