# Hexagons

`index.html` is the whole game: a daily hexagonal number puzzle, served at
https://permadeathmedia.com/hexagons/. Accounts and stats use Supabase;
`supabase-migration.sql` is the schema for that project.

Auth emails (magic link, sign-up confirmation) send players back to
`https://permadeathmedia.com/hexagons/`. That address must be on the
Supabase project's redirect allow-list (Authentication → URL Configuration
→ Redirect URLs) or Supabase falls back to its Site URL.
