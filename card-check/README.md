# Card Check — playtest build

`index.html` is the whole game. With no Firebase config it runs on one
device (solo or pass-and-play). Add a config and games sync live between
devices by five-character code.

## Turning on online play

1. In the [Firebase console](https://console.firebase.google.com) create a
   project (Google Analytics can stay off).
2. Build → Firestore Database → Create database. Pick a region, start in
   **production mode**.
3. Rules tab: paste the contents of `firestore.rules` and publish.
4. Project settings → Your apps → Add app → Web. Register it, then copy
   the `firebaseConfig` object.
5. In `index.html`, fill in `FIREBASE_CONFIG` near the top of the app
   script with `apiKey`, `authDomain`, `projectId` and `appId`. The web
   config is public by design; the rules file is what guards the data.
6. Optional cleanup: in Google Cloud, set a Firestore TTL policy on the
   `games` collection using the `expires` field. Every write already
   stamps `expires` seven days out, so old games delete themselves.

Deploy as normal. The lobby shows "Join a game" and a share link once
sync is live, and falls back to device-only play if the SDK fails to load.

## Onboarding

- **Learn to play** on the start screen runs a scripted solo game: a fixed
  opening (`TUT_SCRIPT`) and a step list (`TUT`) in `index.html`. Each step
  names the one allowed target and a condition on game state; everything
  else is disabled until the condition holds. The game stays on the device
  and resumes after a reload.
- **First-time callouts** (`CALLOUTS`) appear once per device the first time
  a mechanic shows up in a real game. Finishing the tutorial marks them seen.
- **Rules** in the header is generated from the engine's own data tables.

If a rule changes, replay the tutorial (`scratchpad/tutorial.js` drives it
headlessly in Playwright) and adjust the step list where the script stalls.
