# Card Check — playtest build

`index.html` is the page and `engine.js` holds the rules (data tables and
every action, no page code). With no Firebase config it runs on one device
(solo or pass-and-play). Add a config and games sync live between devices by
five-character code.

The page is laid out as a table: Management's side across the top (their deck,
the cards they turned over this round and what each did, the round track), the
studio floor in the middle, and the organizing committee along the bottom with
its actions and its own End turn button (which asks first if actions are left).
A scoreboard of the four resources stays pinned above it. `look.js` holds the
visual language: one icon and colour per resource (Fear, actions, Burnout,
Small Wins, Signed/Stewards), the worker issue icons, which resources each Small
Win moves, and the words for every tooltip. `tooltip.js` shows them on hover,
keyboard focus or tap.

It runs on the studio kit (`../kit`): seeded shuffles (`createRng`), the
guided game's local save (`createLocalSave`, key `cc_local`), the signup form
(`mountSignupForm`, key `cc-newsletter`), the tutorial engine, and play
analytics (`createAnalytics`, game `card-check`).

## Turning on online play

1. In the [Firebase console](https://console.firebase.google.com) create a
   project (Google Analytics can stay off).
2. Build → Firestore Database → Create database. Pick a region, start in
   **production mode**.
3. Build → Authentication → Get started → Sign-in method: turn on
   **Anonymous**. Each device signs in silently so the rules can tell the
   players at a table from anyone else holding the code.
4. Firestore → Rules tab: paste the contents of `firestore.rules` and publish.
   Anyone with a code can watch a game; only its players can change it, and
   someone new can only add themselves to a game still in its lobby.
5. Project settings → Your apps → Add app → Web. Register it, then copy
   the `firebaseConfig` object.
6. In `index.html`, fill in `FIREBASE_CONFIG` near the top of the app
   script with `apiKey`, `authDomain`, `projectId` and `appId`. The web
   config is public by design; the rules file is what guards the data.
7. Optional cleanup: in Google Cloud, set a Firestore TTL policy on the
   `games` collection using the `expires` field. Every write already
   stamps `expires` seven days out, so old games delete themselves.

Deploy as normal. The lobby shows "Join a game" and a share link once
sync is live, and falls back to device-only play if the SDK fails to load.

## Onboarding

- **Learn to play** on the start screen runs a solo guided game from a fixed
  opening (`TUT_SCRIPT`), with five goals in `tutorial.js`: sign a worker,
  win a Small Win, make a Steward, keep Fear down to round 5, sign a holdout.
  Each goal names an outcome and finishes however the player gets there;
  nothing on the board is locked. Hints appear in stages if the player
  stalls, by time or by game state. The game stays on the device and resumes
  after a reload.
- It runs on the studio kit's tutorial engine (`../kit/tutorial.js`).
- **Rules** in the header is generated from the engine's own data tables.

## Analytics

Every game is one run, its id kept on the game (`g.run`) so a reload or a
second device reports into the same run. Online, the device whose move changed
the game reports it, so a table counts once. Events: `run_start` (mode:
`tutorial`, `device`, `one_screen` or `online`, and the organizer count), a
`choice` per organizer seat, milestones `first_signed`, `first_steward`,
`small_win` (also a `choice`, so win rate by issue reads straight out) and
`round_N`, the guided game's goals as `tutorial_<goal>` plus `tutorial_done` or
a `tutorial`/`skip` choice, and `run_end` with outcome, round, signed, needed,
Fear and `ended_by` (`vote`, `fear` or `burnout`). The read-outs are at the
bottom of `../game-events.sql`; swap in `card-check`.

## Tests and bots

`node card-check/tests/engine.test.mjs` checks seeded deals replay, the guided
game's opening, and fuzzes the engine with random play (no throws, no stuck
turns, counters in range). `node card-check/tests/sim.mjs 200` has a simple
organizer bot (`tests/bots.mjs`) play full games at each table size and tallies
how they end; `SEED=7` replays a batch. It is a pacing check, not a strong player.

`node card-check/tests/tutorial.test.mjs` checks that the guided game keeps
the studio's tutorial rule (goals, no locked controls, short reads) and that
each goal fires on its outcome. If a rule changes, update the goal or hint
it touches.

`node card-check/tests/look.test.mjs` checks that every resource, issue and
board symbol has an icon and a tooltip, that every Small Win names the
resources it moves, and that management's cards keep a note of what they did.
