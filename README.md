# Permadeath Media

Official website for Permadeath Media, served at https://permadeathmedia.com.

## Where the games live

| Path | Source |
| --- | --- |
| `/hexagons/` | `hexagons/` in this repo |
| `/card-check/` | `card-check/` in this repo |
| `/hedy-plant/` | `hedy-plant/` in this repo, a single-file build copied from the Hedy Plant source (`npm run build` there writes `dist/index.html`) |
| `/homies/` | `homies/` in this repo: the crew's private game-picking quiz, meetings and tasks (Google sign-in) |
| `/guild-rising/` | the `swyphd/guild-rising` repo, deployed on its own Vercel project |
| `/union-up/` | the `swyphd/union-up` repo, deployed on its own Vercel project |

`vercel.json` proxies `/guild-rising/` and `/union-up/` to those two
deployments, so each game keeps its own repo, build and deploy. The two
apps are built with a matching Vite `base`, and their old `*.vercel.app`
addresses send visitors here. Adding another separately-built game is the
same three steps: a rewrite here, a `base` there, a redirect on its old
address.

## Studio kit

`/kit/` is the shared code every game was writing for itself: the mailing-list
signup, local and cloud saves, the tutorial engine, play analytics, a seeded
random source, and the test harness with bots and sims. Pages here import it from `/kit/index.js`;
games in their own repos copy it in with `node kit/sync.mjs <dir>`. See
[`kit/README.md`](kit/README.md) for the new-game checklist, and run its tests
with `node kit/tests/run.mjs`.

## Play analytics

Games using the kit's `analytics.js` send what happens in a run (started,
milestones, choices, won, lost, tab closed mid-run) to `/api/events`
(`api/events.js`), which writes it to the `game_events` table in Supabase. The
public key can add rows but not read them; the numbers are visible only from the
dashboard. No emails, names or IPs are recorded, and browsers with Do Not Track
or Global Privacy Control send nothing. A game must be listed in `GAMES` in
`api/events.js`.

### Setup

- **Supabase**: run `game-events.sql` once in the SQL Editor. The bottom of that
  file has the read-outs: how runs end, where people quit, which choices people
  make, and win rate by choice.

## Homies

`/homies/` is the private page for the people building the next game: a
this-or-that quiz between kinds of game, with real games as examples, that
picks the genre, setting and reference games; a launch meeting and check-ins with fixed agendas that can't close until
everyone leaves with a task; and the task board in between. Google sign-in,
crew-only (`homies.sql` has the row-level security; the first person to sign in
claims the crew and adds the rest). Setup, including the Google OAuth client and
the Supabase provider, is in [`homies/README.md`](homies/README.md).

## Press kit

`/press/` is the press kit: fact sheet, copy, screenshots, gameplay GIF and
MP4, logos, and a zip of everything (`press/permadeath-hedy-plant-press-kit.zip`).
The screenshots are captures of real Hedy Plant runs. Rebuild the zip after
changing any image: `cd press && zip -qr permadeath-hedy-plant-press-kit.zip hedy-plant logos`.

## Mailing list

Every page (the site, Hexagons, Card Check, Hedy Plant, Guild Rising, Union Up) carries
an email signup form. The forms post to `/api/subscribe`, a Vercel
serverless function in `api/subscribe.js`, which:

1. creates the subscriber in **Buttondown**, tagged with the page it came
   from (`site`, `hexagons`, `card-check`, `guild-rising`, `union-up`, `hedy-plant`).
   Buttondown sends the welcome email and handles unsubscribes;
2. writes the same address to the `newsletter_signups` table in the
   Supabase project the games already use, as a backup record
   (`newsletter-signups.sql` creates it; insert-only from the public API).

A form can also send a `tag` saying which ask the address came from, so
Buttondown shows which moments convert. The allowed tags are listed in
`api/subscribe.js`:

| Tag | Where |
| --- | --- |
| `founding` | the homepage's founding playtesters offer |
| `hedy-plant-save` | ticked the news box while saving Hedy Plant to the cloud |
| `hedy-buyout` | the ask under Hedy Plant's buyout letter |
| `hedy-ending` | the ask under Hedy Plant's ending |
| `hexagons-account` | ticked the news box while creating a Hexagons account |

A repeat address counts as success in both places. If the Buttondown key
is missing the function still keeps the backup row and answers ok, so a
misconfiguration never breaks a form; it logs a warning instead.

### Setup

- **Vercel**: add the environment variable `BUTTONDOWN_API_KEY` to the
  permadeath-media project (Production and Preview) with the API key from
  Buttondown → Settings → Programming, then redeploy.
- **Buttondown**: write the welcome email under Settings → Subscribing.
  Decide there whether new subscribers must confirm their address first
  (Buttondown's default) or go straight on the list.
- **Supabase**: run `newsletter-signups.sql` once in the SQL Editor.

To export the backup list for any reason:

```sql
select email, source, created_at from public.newsletter_signups order by created_at;
```

## Cloud saves

Hedy Plant can save a run to the player's account: they enter an email,
get a login link (Supabase Auth, the same accounts Hexagons uses), and the
run is kept in the `game_saves` table, so it survives a cleared browser
and opens on any device. Playing never needs an account; the browser save
still works on its own. The code is `src/site.jsx` in the Hedy Plant source.

### Setup

- **Supabase**: run `game-saves.sql` once in the SQL Editor.
- **Supabase → Authentication → URL Configuration**: add
  `https://permadeathmedia.com/hedy-plant/` to the redirect URLs (next to
  the Hexagons one).
- **Supabase → Authentication → Emails → SMTP Settings**: turn on custom
  SMTP (for example Resend, which needs a few DNS records on
  permadeathmedia.com). Supabase's built-in sender only delivers to your
  own Supabase team and only a few emails an hour, so without this,
  players never get their login link. This applies to Hexagons too.
