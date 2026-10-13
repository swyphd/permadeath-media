// node card-check/tests/tutorial.test.mjs
// The guided game keeps the studio's tutorial rule, and its goals fire on outcomes.
import { suite, test, ok, eq, deepEq, report } from '../../kit/test/harness.js';
import { guideSteps, callouts, guideFor, calloutsFor, checkSteps } from '../tutorial.js';

// Stand-ins for the page's engine helpers, over a tiny hand-made game state.
const h = {
  onBoard: (g, d) => Object.values(g.workers).filter((w) => w.onBoard && (!d || w.dept === d)),
  won: (g, id) => !!(g.won && g.won[id]),
  locked: (g, w) => !!(w.lock && !(g.unlocked && g.unlocked[w.lock])),
};
const worker = (id, o) => ({ id, onBoard: true, dept: 'Eng', disp: 2, lock: null, reserve: false, ...o });
const game = (o = {}) => ({
  round: 1, fear: 3, phase: 'org', pending: [], orgs: [{ burnout: 0 }],
  issues: [{ id: 'crunch', state: 'open' }, { id: 'pay', state: 'open' }],
  workers: { 1: worker(1), 2: worker(2, { lock: 'Pay', disp: 1 }), 3: worker(3) },
  ...o,
});
const store = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) }; };

suite('card check: guided game', () => {
  test('keeps the rule: goals, no locked controls, short reads', () => {
    // Each goal here spans a round or more of real play, so five in a row is fine.
    deepEq(checkSteps(guideSteps(h), { maxInARow: 5 }), []);
    ok(guideSteps(h).every((s) => !s.allow));
  });
  test('callouts are short read notes', () => {
    deepEq(checkSteps(callouts(h)), []);
  });
  test('every goal has hints for a player who stalls', () => {
    ok(guideSteps(h).filter((s) => s.goal).every((s) => s.hints && s.hints.length >= 1));
  });
  test('goals fire on outcomes, whatever the route', () => {
    const t = guideFor({ tutorial: { status: 'active', index: 0, seen: [] } }, h);
    let g = game();
    eq(t.observe(g).id, 'welcome');
    t.next(g);
    eq(t.observe(g).id, 'first');
    g.workers[3].disp = 3; // Dev, not Priya: any signature counts
    eq(t.observe(g).id, 'win');
    g.issues[0].state = 'done';
    eq(t.observe(g).id, 'steward');
    g.workers[3].disp = 4;
    eq(t.observe(g).id, 'fear');
    g.round = 5;
    eq(t.observe(g).id, 'holdout');
    g.workers[2].disp = 3;
    eq(t.observe(g).id, 'yours');
    t.next(g);
    eq(t.status, 'done');
  });
  test('a player who gets ahead skips the goals they already met', () => {
    const t = guideFor({ tutorial: { status: 'active', index: 1, seen: [] } }, h);
    const g = game({ round: 5 });
    g.workers[1].disp = 4; g.issues[1].state = 'done'; g.workers[2].disp = 3;
    eq(t.observe(g).id, 'yours');
  });
  test('the fear hint waits for Fear, not the clock', () => {
    const t = guideFor({ tutorial: { status: 'active', index: 4, seen: [] } }, h);
    const g = game();
    eq(t.observe(g).id, 'fear');
    eq(t.hint(g), null);
    g.fear = 6;
    ok(t.hint(g).body.startsWith('Fear is climbing'));
  });
  test('an old click-by-click save resumes at the first goal', () => {
    const t = guideFor({ tutorial: { step: 17, done: false } }, h);
    eq(t.observe(game()).id, 'first');
    eq(guideFor({ tutorial: { step: 40, done: true } }, h).status, 'done');
  });
});

suite('card check: callouts', () => {
  test('adopt the old per-device seen keys', () => {
    const s = store();
    s.setItem('cc_seen_mgmt', '1');
    globalThis.localStorage = s;
    const c = calloutsFor(h, s);
    ok(c.seen.includes('mgmt'));
    const g = game({ fear: 8, phase: 'org', round: 2 });
    g.workers[2].lock = null;
    eq(c.observe(g).id, 'fear7');
  });
});

await report();
