-- ============================================================
-- Permadeath Media /homies: the "How we work" quiz (homies/crew.js)
-- Run this once in the Supabase SQL Editor of the studio project
-- (kmxkuyloybrdtcdiiqwo), after homies.sql. Safe to run again.
--
-- One row per person per question. `value` is the answer as the page writes
-- it: a string (pick one, or a few words), an array (pick any), or an object
-- (a grid: row id -> level). Same rules as homies_answers: the crew reads
-- everyone's, and only you can write yours.
-- ============================================================

create table if not exists public.homies_crew_answers (
  email text not null references public.homies_members(email) on delete cascade,
  question text not null,
  value jsonb not null,
  answered_at timestamptz default now() not null,
  primary key (email, question),
  constraint homies_crew_answers_question check (length(question) <= 40),
  constraint homies_crew_answers_size check (pg_column_size(value) <= 4096)
);

alter table public.homies_crew_answers enable row level security;

drop policy if exists "Crew reads crew answers" on public.homies_crew_answers;
drop policy if exists "Own crew answers only (insert)" on public.homies_crew_answers;
drop policy if exists "Own crew answers only (update)" on public.homies_crew_answers;
drop policy if exists "Own crew answers only (delete)" on public.homies_crew_answers;

create policy "Crew reads crew answers" on public.homies_crew_answers
  for select to authenticated using (public.homies_is_member());
create policy "Own crew answers only (insert)" on public.homies_crew_answers
  for insert to authenticated with check (public.homies_is_member() and email = public.homies_email());
create policy "Own crew answers only (update)" on public.homies_crew_answers
  for update to authenticated using (email = public.homies_email()) with check (email = public.homies_email());
create policy "Own crew answers only (delete)" on public.homies_crew_answers
  for delete to authenticated using (email = public.homies_email());

grant select, insert, update, delete on public.homies_crew_answers to authenticated;

-- Read-out, for the SQL Editor: who has answered how many.
--   select m.name, count(a.question) as answered
--   from public.homies_members m left join public.homies_crew_answers a using (email)
--   group by m.name order by answered desc;
