# Card Check — playtest build

`index.html` is the whole game. With no Firebase config it runs on one
device (solo or pass-and-play). Add a config and games sync live between
devices by five-character code.

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
- **First-time callouts** (also in `tutorial.js`) appear once per device the
  first time a mechanic shows up, in the guided game and in real games.
- Both run on the studio kit's tutorial engine (`../kit/tutorial.js`), which
  `index.html` loads before starting.
- **Rules** in the header is generated from the engine's own data tables.

`node card-check/tests/tutorial.test.mjs` checks that the guided game keeps
the studio's tutorial rule (goals, no locked controls, short reads) and that
each goal fires on its outcome. If a rule changes, update the goal or hint
it touches.
