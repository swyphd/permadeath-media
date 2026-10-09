# Permadeath Media

Official website for Permadeath Media, served at https://permadeathmedia.com.

## Where the games live

| Path | Source |
| --- | --- |
| `/hexagons/` | `hexagons/` in this repo |
| `/card-check/` | `card-check/` in this repo |
| `/guild-rising/` | the `swyphd/guild-rising` repo, deployed on its own Vercel project |
| `/union-up/` | the `swyphd/union-up` repo, deployed on its own Vercel project |

`vercel.json` proxies `/guild-rising/` and `/union-up/` to those two
deployments, so each game keeps its own repo, build and deploy. The two
apps are built with a matching Vite `base`, and their old `*.vercel.app`
addresses send visitors here. Adding another separately-built game is the
same three steps: a rewrite here, a `base` there, a redirect on its old
address.

## Mailing list

Every page (the site, Hexagons, Card Check, Guild Rising, Union Up) carries
an email signup form. The forms post to `/api/subscribe`, a Vercel
serverless function in `api/subscribe.js`, which:

1. creates the subscriber in **Buttondown**, tagged with the page it came
   from (`site`, `hexagons`, `card-check`, `guild-rising`, `union-up`).
   Buttondown sends the welcome email and handles unsubscribes;
2. writes the same address to the `newsletter_signups` table in the
   Supabase project the games already use, as a backup record
   (`newsletter-signups.sql` creates it; insert-only from the public API).

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
