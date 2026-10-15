-- ============================================================
-- Permadeath Media mailing list
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor) of the
-- project the games already use (kmxkuyloybrdtcdiiqwo). It's safe to run
-- again: an existing table keeps its rows and gains any newer columns.
-- ============================================================

create table if not exists public.newsletter_signups (
  id uuid default gen_random_uuid() primary key,
  email text not null unique,
  source text,                            -- which page the signup came from
  created_at timestamptz default now() not null,
  constraint newsletter_email_format check (
    email = lower(btrim(email))
    and length(email) <= 254
    and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  ),
  constraint newsletter_source_length check (source is null or length(source) <= 40)
);

alter table public.newsletter_signups enable row level security;

-- Anyone may add an address. Nobody may read, change or remove one through
-- the public API: the list is only visible from the dashboard (Table Editor
-- or SQL Editor) and to the service role.
drop policy if exists "Anyone can join the list" on public.newsletter_signups;
create policy "Anyone can join the list"
  on public.newsletter_signups for insert
  to anon, authenticated
  with check (true);

grant insert on public.newsletter_signups to anon, authenticated;

-- Added 2026-10-15: the ?ref=
-- tag the browser first arrived with, so /stats/ can count signups by source.
alter table public.newsletter_signups add column if not exists ref text;
do $$ begin
  alter table public.newsletter_signups add constraint newsletter_ref_length check (ref is null or length(ref) <= 40);
exception when duplicate_object then null; end $$;

-- Export the list for a mailer:
--   select email, source, created_at from public.newsletter_signups order by created_at;
