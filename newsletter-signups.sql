-- ============================================================
-- Permadeath Media mailing list
-- Run this once in the Supabase SQL Editor (Dashboard > SQL Editor)
-- of the project the games already use (kmxkuyloybrdtcdiiqwo).
-- ============================================================

create table public.newsletter_signups (
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
create policy "Anyone can join the list"
  on public.newsletter_signups for insert
  to anon, authenticated
  with check (true);

grant insert on public.newsletter_signups to anon, authenticated;

-- Export the list for a mailer:
--   select email, source, created_at from public.newsletter_signups order by created_at;
