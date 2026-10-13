# Homies

`/homies/` is the private page for the four people building the next game:
pick the game, run the launch meeting, run every check-in after it, and keep
each other honest between meetings. It lives at
https://permadeathmedia.com/homies/, needs a Google sign-in, and shows nothing
to anyone who isn't on the crew list.

`index.html` is the whole page (no bundler; it imports `/kit/config.js` for the
Supabase project). `quiz.js` is the question bank and scoring, with no page code,
so `node homies/tests/quiz.test.mjs` can check it. `../homies.sql` is the schema.

## What it does

1. **Pick the game.** Thirty this-or-that questions, one pair of real games at
   a time (Project Zomboid or Helldivers 2; Catan but online or Chess but
   faster). Each side votes for poles on sixteen axes (pace, what it tests,
   runs or a persistent world, company, co-op or versus, rules, story, tone,
   world, setting, era, look, session length, scope, where it lives, device).
   Nobody's answers show until everyone has finished, or until someone taps
   "reveal early". The results page is the launch meeting's agenda: where each
   person landed on every axis, the questions everyone agreed on, the ones that
   split the room, the shelf of most-picked games, and each person's game in a
   phrase.
2. **Launch meeting.** A fixed agenda with a done-check per item: read the
   results together; lock each axis (a side, or "either"), with the crew's lean
   under each one; up to three reference games; the pitch in one sentence; a
   role per person; a cadence and the next check-in date; one task per person.
   The meeting can't close until every item is done. Closing creates the next
   check-in.
3. **Check-ins.** Round the table (every task owed since last time is marked
   done, carried over, or blocked with a few words); show and tell (did each
   person show something that exists now and didn't before, tracked on the
   home board); decisions, one line each; the next date; one task per person
   (a carried-over task counts). Closing moves carried tasks to the next date
   and creates the next check-in.
4. **Tasks.** Everyone's, or just yours; late ones go red; blocked ones carry
   their reason. Anyone can add a task for anyone at any time.
5. **Crew.** Add people by the Gmail address they'll sign in with (before they
   ever sign in), rename, remove.

The page refreshes its data every 20 seconds while open, and when the tab comes
back into view, so a meeting can be run with everyone looking at their own phone.

## Setup

Three things, once.

### 1. Supabase: the tables

Run `homies.sql` (repo root) in the SQL Editor of the studio project
(`kmxkuyloybrdtcdiiqwo`). It creates `homies_members`, `homies_answers`,
`homies_meetings`, `homies_tasks` and `homies_state`, and the row-level security
that makes all of it crew-only: every policy checks the signed-in email against
`homies_members`.

The crew list starts empty. **The first person to sign in with Google claims it**
(`homies_me()` adds them as the first member), then adds the other three on the
Crew tab. Nobody after the first can get in without being added. To seed it by
hand instead, in the SQL Editor:

```sql
insert into public.homies_members (email, name) values
  ('you@gmail.com', 'Jeff'), ('eric@gmail.com', 'Eric'),
  ('michael@gmail.com', 'Michael'), ('josh@gmail.com', 'Josh');
```

### 2. Google: an OAuth client

In [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services →
Credentials → Create credentials → OAuth client ID, type **Web application**:

- Authorized JavaScript origins: `https://permadeathmedia.com`
- Authorized redirect URIs: `https://kmxkuyloybrdtcdiiqwo.supabase.co/auth/v1/callback`

If the project has no OAuth consent screen yet, Google asks for one first:
External, app name "Permadeath Media", your email, no scopes beyond the defaults.
While the app is in "Testing", only the test users you list there can sign in,
so either add the four Gmail addresses as test users or publish the app.

Copy the client ID and client secret.

### 3. Supabase: turn on Google

Supabase dashboard → Authentication → Providers → Google: enable it, paste the
client ID and secret, save.

Then Authentication → URL Configuration → Redirect URLs: add
`https://permadeathmedia.com/homies/` (next to the Hexagons and Hedy Plant
ones). Without this the sign-in bounces to the project's Site URL instead of
back to the page.

Deploy as normal. The sign-in button sends people to Google and back to
`/homies/`; the Supabase client picks the session out of the URL.

## Tests

```sh
node homies/tests/quiz.test.mjs
```

checks the bank (every tag is a pole, no side votes both ways on an axis, every
axis has at least two questions, notes fit a phone card) and the scoring
(profiles, unanimous / split / leaning questions, axis verdicts, the shelf, the
summary line).

## Changing the questions

Edit `QUESTIONS` in `quiz.js`. Each side is a game, a one-line note, and the
poles it votes for; the ids in `AXES` are the only valid tags. Keep ids under 40
characters (the `homies_answers.question` column) and don't rename an id people
have already answered. Run the tests after.
