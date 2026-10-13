// Card Check's guided game and first-time callouts, run by the studio kit's
// tutorial engine (kit/tutorial.js).
//
// The guided game gives goals, not clicks: each one teaches the move it needs,
// names an outcome, and finishes however the player gets there. The board is
// never locked. Hints come in stages, and only if the player stalls.
//
// Steps read the game through `h`, the engine helpers the page passes in
// (onBoard, won, locked), so this file stays free of the page's globals.
import { createTutorial, checkSteps } from '../kit/tutorial.js';

export { createTutorial, checkSteps };

// A fixed opening, so every new player meets the same people: Priya and Dev are
// known and Leaning, Tomasz, Marcus (a Pay holdout) and Sam come next in
// Engineering, Esteban first in Production; management's first cards are mild.
export const TUT_SCRIPT = { piles: { Eng: [1, 3, 4, 2, 7], Prod: [26] }, deck: { 1: [5, 4, 2, 1], 2: [16, 14] } };

export function guideSteps(h) {
  const anyone = (g, f) => h.onBoard(g).some(f);
  return [
    { id: 'welcome', title: 'Welcome to Card Check', next: true, spot: '.board',
      body: 'You are <b>The Senior Engineer</b>, organizing a union at a video game studio. You win with <b>21 of 32 workers Signed</b> when the vote comes at the end of round 8. The board is the studio: a row per department, a column per stance from Hostile to Steward. The guide sets goals; how you reach them is up to you.' },

    { id: 'first', title: 'Sign your first worker',
      body: '<b>One-on-One</b> moves a worker you can see one step toward Signed. <b>Map</b> turns over a new worker card. Priya and Dev are already Leaning. Get anyone to Signed.',
      goal: (g) => anyone(g, (w) => w.disp >= 3),
      hints: [
        { after: 40, body: 'Pick One-on-One under your actions, then click a worker card on the board.' },
        { after: 90, body: 'Priya is in the Engineering row, Leaning column. One talk signs her.' },
      ] },

    { id: 'win', title: 'Win a Small Win',
      body: 'Each Issue on the right needs three Signed workers who share its icon. Winning one moves everyone with that icon up, lowers Fear, and changes a rule for the rest of the game. Find three who care about the same thing and win it, over as many rounds as it takes.',
      goal: (g) => g.issues.some((i) => i.state === 'done'),
      hints: [
        { after: 60, body: 'Look at the icons on your Signed workers. Which issue do two of them already share?' },
        { after: (g, secs) => g.round >= 3 || secs > 150, body: 'Priya, Dev and Tomasz all care about Crunch. Map Engineering to meet Tomasz. Out of actions? End your turn; next round brings three more.' },
      ] },

    { id: 'steward', title: 'Build your committee',
      body: 'A Signed Leader (★) can become a <b>Steward</b> with Build Committee, for 2 actions. Each round a Steward brings a colleague up a step for free, and once a game can absorb a management card aimed at their department. Make a Steward.',
      goal: (g) => anyone(g, (w) => w.disp === 4),
      hints: [
        { after: 60, body: 'Build Committee needs 2 actions left this turn. Short? End your turn and open the next one with it.' },
        { after: 120, body: 'Priya is a Leader. Once she is Signed, she can be your first Steward.' },
      ] },

    { id: 'fear', title: 'Keep Fear down',
      body: 'Management moves first every round and pushes Fear up. At 7, talks cost double and every organizer burns out a little each round; at 10 the drive collapses. <b>Reassure</b> lowers it by 1 once a round, and each Small Win lowers it too. Reach round 5 with the drive intact.',
      goal: (g) => g.round >= 5,
      hints: [
        { after: (g) => g.fear >= 5, body: 'Fear is climbing. Reassure costs 1 action and lowers it by 1, once per round.' },
        { after: (g) => g.fear >= 7, body: 'Fear is at 7 or more. Bring it under 7 before you end your turn, or everyone takes Burnout.' },
      ] },

    { id: 'holdout', title: 'Sign a holdout',
      body: 'Some workers carry a lock: they won’t sign until their Issue is won, however often you talk. Marcus in Engineering waits on Pay Transparency. Win the Issue a holdout cares about and get one Signed.',
      goal: (g) => anyone(g, (w) => w.lock && w.disp >= 3),
      hints: [
        { after: 60, body: 'Pay Transparency needs three Signed workers with Pay. Dev has it. So do Sam in Engineering and Esteban in Production.' },
        { after: (g, secs) => g.round >= 6 || secs > 240, body: 'Mapping another department costs 2 actions, or 1 once somebody there is Signed.' },
      ] },

    { id: 'yours', title: 'The drive is yours', next: true,
      body: 'Play it out from here. The vote is at the end of round 8 and you need 21 Signed. Management’s cards get harsher in round 7. The <b>Rules</b> button has everything on one page, and the game points out new things the first time they happen.' },
  ];
}

// Notes for real games, shown once per device the first time each thing happens.
export function callouts(h) {
  return [
    { id: 'mgmt', title: 'Management moves first', when: (g) => g.round === 1 && g.phase === 'org',
      body: 'Every round starts with management playing a card (more as you grow, and after each Small Win). The Management panel below the board shows what was played. Then you act: 3 actions per organizer, minus Burnout.' },
    { id: 'influence', title: 'Influence: choose who they bring along', when: (g) => g.pending && g.pending.some((p) => p.type === 'influence'),
      body: 'A worker who signs pulls colleagues in their department up one step, as many as their influence dots. Click the highlighted workers on the board, or skip the rest.' },
    { id: 'absorb', title: 'A Steward can absorb this card', when: (g) => g.phase === 'absorb',
      body: 'Each Steward can absorb one management card per game, cancelling its effect in their department. Tick the Stewards allowed to spend it if this card hits them, then resolve. Save it for the cards that hurt.' },
    { id: 'stewardphase', title: 'Steward phase', when: (g) => g.phase === 'steward',
      body: 'At the start of each round, every Steward brings one worker in their department up a step. Click a highlighted worker, or make no move.' },
    { id: 'holdout', title: 'Holdouts', when: (g) => h.onBoard(g).some((w) => h.locked(g, w)),
      body: 'A worker with a lock will not sign until the Issue they care about is won (Pay Transparency or End Crunch). One-on-Ones take them to Leaning and stop. Win the Issue and they all move up at once.' },
    { id: 'plant', title: 'A Plant took the empty desk', when: (g) => h.onBoard(g).some((w) => w.reserve),
      body: 'Whenever a worker is removed from the board, management fills the desk with a Plant: Hostile, immovable, and every One-on-One in that department costs +1 while it sits there.' },
    { id: 'fear7', title: 'Fear is 7 or higher', when: (g) => g.fear >= 7,
      body: 'One-on-Ones now cost 2, and every organizer takes +1 Burnout at the end of the round. Reassure (Fear −1, once per round) or win a Small Win to bring it down. At 10 the drive collapses.' },
    { id: 'burnout', title: 'Burnout', when: (g) => g.orgs.some((o) => o.burnout > 0),
      body: 'Burnout 1 and 2 still give 3 and 2 actions; at 3 an organizer has 1 action and loses their ability. Reset costs an action and removes one Burnout. If every organizer burns out, the drive is over.' },
    { id: 'smallwin', title: 'Small Win: now management reacts', when: (g) => g.issues.some((i) => i.state === 'done'),
      body: 'Each Issue you win changes a rule for the rest of the game, moves every worker with its icon up, and lowers Fear. It also adds a card to management’s next draw. Three Small Wins per game.' },
  ];
}

// The guided game's progress lives in the game's own save (g.tutorial), so a
// resumed tutorial picks up where it was. A save from the old click-by-click
// tutorial ({ step, done }) restarts at the first goal; goals the player has
// already met are passed over on the next look.
export function guideFor(g, h, opts = {}) {
  const t = g.tutorial || {};
  const initial = 'index' in t
    ? t
    : { status: t.done ? 'done' : 'active', index: t.done ? 0 : 1, seen: [] };
  return createTutorial({ steps: guideSteps(h), mode: 'scripted', persist: false, initial, ...opts });
}

// Callouts remember what this device has seen. The first time, they adopt the
// old per-callout keys (cc_seen_<id>) so nobody sees a note twice.
export function calloutsFor(h, storage = globalThis.localStorage) {
  const steps = callouts(h);
  const key = 'cc-callouts';
  let fresh = false;
  try { fresh = !storage.getItem(key); } catch {}
  const tut = createTutorial({ key, steps, autoStart: true });
  if (fresh) {
    for (const s of steps) {
      let old = null;
      try { old = storage.getItem(`cc_seen_${s.id}`); } catch {}
      if (old) tut.markSeen(s.id);
    }
  }
  return tut;
}
