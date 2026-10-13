# Studio kit

The pieces every Permadeath game was writing for itself, written once. A new game
starts with saves, a tutorial, mailing-list signups, play analytics, seeded
randomness and a bot harness without building any of them.

| Module | What it is | Where it came from |
| --- | --- | --- |
| `newsletter.js` | Signup to the studio list via `/api/subscribe`, plus `mountSignupForm` for the footer form every page has | the footer form on every page, Hedy's `site.jsx` |
| `save.js` | `createLocalSave` (browser save with versions and migrations) and `createCloudSave` (emailed login link, Supabase `game_saves`) | Hedy Plant's `App.jsx` and `site.jsx` |
| `tutorial.js` | The step engine: which step shows, when the game pauses, what's been seen | Guild Rising's `Tutorial.jsx`, Card Check's `TUT` and `CALLOUTS` |
| `analytics.js` | `createAnalytics`: run starts and ends (win, loss, quit), milestones, choices, and where a run stood when the tab closed, sent to `/api/events` | new: no game recorded outcomes |
| `rng.js` | Seeded random source (mulberry32) with `int`, `pick`, `shuffle`, `weighted`, save/restore | Union Up's `engine/rng.js` |
| `test/harness.js` | `suite`, `test`, `eq`, `near`, `report`: tests on plain `node`, no dependencies | Hedy Plant's `tests/harness.mjs` |
| `test/sim.js` | `simulate` (a bot plays the real engine), `runMany`, `fuzz` (invariants every turn), `replays` (same seed, same run), `greedy` | Hedy's `tests/bots.mjs`, Union Up's `sim/` |
| `react.js` | `useKit`, `useTutorialStep`, `useSignup` for React games | new |
| `config.js` | Site origin, signup URL, Supabase project and public key | |

Everything except `react.js` is plain ES modules with no dependencies, so it runs
in a page as-is, in node for sims and tests, and through any bundler. None of it
draws anything: each game keeps its own look.

Run the kit's own tests with `node kit/tests/run.mjs`.

## Using it

**A page in this repo** (Card Check, Hexagons, the homepage, a new game) imports
it from the site:

```html
<script type="module">
  import { mountSignupForm, createLocalSave, createTutorial, createRng } from '/kit/index.js';
  mountSignupForm(document.getElementById('signup-form'), { source: 'card-check', tag: null });
</script>
```

**A game in its own repo** (Hedy Plant, Guild Rising, Union Up) copies the kit in,
so its build never reaches across repos:

```sh
node ../permadeath-media/kit/sync.mjs src/kit     # re-run to take a newer kit
```

then `import { createTutorial } from './kit/index.js'`. Each copied file names the
commit it came from. Fix bugs here, not in a copy.

## New game checklist

1. **Signups.** Add the game's name to `SOURCES` in `api/subscribe.js` (and any
   milestone tags to `TAGS`), then `createNewsletter({ source: 'my-game' })`. An
   unlisted source is filed as `unknown`.
2. **Local save.** `createLocalSave({ key: 'my-game-save', version: 1 })`. Bump
   `version` and give a `migrate(data, from)` when the state changes shape; a save
   written before the game used the kit reaches `migrate` as version 0.
3. **Cloud save.** Load `SUPABASE_SCRIPT` (or pass your own client), then
   `createCloudSave({ game: 'my-game', getState, setState, savedAt: local.savedAt, progress: s => s.t })`.
   Add the game's page to Supabase → Authentication → URL Configuration →
   Redirect URLs, or the login link won't come back to it. The `game_saves` table
   already takes any game name.
4. **Tutorial.** Write steps (`id`, `title`, `body`, `when`, `done`), call
   `tutorial.observe(game)` each render or tick and draw the step it returns; skip
   the tick while `tutorial.paused(game)`. `mode: 'scripted'` for a guided game in a
   fixed order, `autoStart: true` for one-time callouts.
5. **Analytics.** Add the game to `GAMES` in `api/events.js`, then
   `const stats = createAnalytics({ game: 'my-game', version: BUILD })`. Call
   `stats.runStart()`, `stats.milestone(name)` at each progress point,
   `stats.choice(id, option)` for decisions worth comparing, `stats.runEnd('win' | 'loss' | 'quit')`,
   and `stats.progress(() => ({ t, ... }))` so a closed tab records where the run
   stood. Keep `stats.run` in the save and pass it back as `runStart(props, { resume })`
   so a resumed run stays one run. The read-outs (win rate, where people quit,
   choice shares, win rate by choice) are SQL at the bottom of `game-events.sql`.
6. **Randomness.** One `createRng()` for the whole engine; every roll goes through
   it. Unseeded it's `Math.random`; seed it for sims, daily puzzles, shared tables.
7. **Tests and bots.** `test/harness.js` for tests, `test/sim.js` for pacing bots
   and fuzzing. Seed with `seedFromEnv(rng)` so `SEED=7 node sim/x.mjs` replays.

## Studio rules the kit keeps

No login walls: the local save always works and the cloud save is only offered.
Analytics is anonymous (a random id the browser makes up, no emails or IPs), sends
nothing when the browser has Do Not Track or Global Privacy Control on, and can be
turned off for good with `optOut()`.
No pre-ticked boxes and no signup pop-ups on load. The tutorial can always be
skipped, and skipping is remembered.

## Not yet using it

The games still carry their own copies of these pieces. Moving each one onto the
kit is follow-up work, one game at a time, once the save (Guild Rising) and
tutorial (Hedy Plant) work in flight has landed. Values that must carry over when
a game moves:

- Card Check: newsletter `doneKey: 'cc-newsletter'`; callouts used `cc_seen_<k>` keys.
- Hedy Plant: newsletter `doneKey: 'hp-newsletter'`; local save key
  `hedy-plant-save-v2` (a bare state, so adopt it through `migrate` at version 0);
  cloud `progress: s => s.t`.
- Union Up: `createRng` matches `seedRng` draw for draw, so existing `SEED=` sim
  output stays the same.
- Guild Rising: tutorial key `guild-rising-tutorial`, version 1; its stored shape
  (`{ v, status, seen }`) loads as-is.
