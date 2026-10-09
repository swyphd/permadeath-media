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

Every page (the site, Hexagons, Card Check) and the two games hosted
elsewhere (Guild Rising, Union Up) carry an email signup form. Signups
are stored in the `newsletter_signups` table of the Supabase project the
games already use; nothing is sent to a third-party mailer.

Setup, once: open the Supabase SQL Editor and run `newsletter-signups.sql`.
Until the table exists the forms show "Something went wrong".

Each form posts the lowercased address and a `source` (`site`, `hexagons`,
`card-check`, `guild-rising`, `union-up`) straight to the Supabase REST
API with the public key. The table is insert-only from the public API, so
the list can only be read from the dashboard. A repeat address is treated
as success. To export the list for a mailer:

```sql
select email, source, created_at from public.newsletter_signups order by created_at;
```

To move the list to a mailing service later, change `SIGNUP_URL`,
`SIGNUP_KEY` and the body of `subscribe()` in each page; the forms do not
depend on anything else.
