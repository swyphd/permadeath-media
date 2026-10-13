import { suite, test, ok, eq } from '../test/harness.js';
import { createRng } from '../rng.js';
import { simulate, runMany, fuzz, replays, greedy, seedFromEnv, clock } from '../test/sim.js';

// A toy idle game to drive: cash grows by rate; machines raise the rate.
const rng = createRng();
const init = () => ({ t: 0, cash: 0, rate: 1, machines: 0, inbox: [] });
const step = (s, dt) => {
  s.t += dt;
  s.cash += s.rate * dt;
  if (rng.chance(0.01)) s.cash += 5;
  if (s.machines === 3 && !s.inbox.length) s.inbox.push({ t: s.t, kind: 'tier' });
};
const price = (s) => 10 * 2 ** s.machines;
const buyer = (s) => greedy(s, {
  options: (x) => (x.cash >= price(x) ? ['machine'] : []),
  score: (x) => 1 / price(x),
  buy: (x) => { x.cash -= price(x); x.machines++; x.rate++; return true; },
});

suite('sim', () => {
  test('simulate runs a bot through the engine and logs its events', () => {
    const r = simulate({ init, bot: buyer, step, dt: 0.5, duration: 120, events: (s) => s.inbox, sample: (s) => s.rate });
    ok(r.state.machines >= 3, `bought ${r.state.machines}`);
    eq(r.log[0].kind, 'tier');
    eq(r.samples.length, 240);
  });
  test('simulate stops early when done', () => {
    const r = simulate({ init, step: (s, dt) => { s.t += dt; s.cash += s.rate * dt; }, duration: 1000, done: (s) => s.cash >= 10 });
    eq(r.t, 10);
  });
  test('the same seed replays byte for byte', () => {
    const run = () => simulate({ init, bot: buyer, step, duration: 300 }).state;
    ok(replays(rng, 7, run).same);
    rng.seed(null);
  });
  test('runMany tallies outcomes across seeded games', () => {
    const a = runMany(20, { rng, seed: 'x', init, bot: buyer, step, duration: 60, outcome: (r) => r.state.machines });
    const b = runMany(20, { rng, seed: 'x', init, bot: buyer, step, duration: 60, outcome: (r) => r.state.machines });
    eq(a.mean, b.mean);
    eq(a.values.length, 20);
    const c = runMany(5, { init, step, duration: 1, outcome: (r) => (r.state.cash > 0 ? 'earned' : 'broke') });
    eq(c.counts.earned, 5);
    rng.seed(null);
  });
  test('fuzz finds a broken invariant and a mutating engine', () => {
    const r = fuzz({
      games: 20, turns: 20, seed: 3,
      init: () => ({ hp: 10 }),
      plan: (s, rr) => rr.int(4),
      apply: (s, dmg) => ({ hp: s.hp - dmg }),
      check: (s, bad, label) => { if (s.hp < 0) bad('hp below zero', label); },
    });
    eq(r.clean, false);
    ok(r.problems['hp below zero'].n > 0);
    const m = fuzz({ games: 2, turns: 2, init: () => ({ n: 0 }), plan: () => 1, apply: (s) => { s.n++; return s; }, check() {} });
    ok(m.problems['mutated its input']);
    const clean = fuzz({ games: 5, turns: 5, init: () => ({ n: 0 }), plan: () => 1, apply: (s, d) => ({ n: s.n + d }), check() {} });
    ok(clean.clean);
  });
  test('fuzz reports an engine that throws', () => {
    const r = fuzz({ games: 1, turns: 3, init: () => ({}), plan: () => 0, apply: () => { throw new Error('boom'); }, check() {} });
    ok(r.problems.threw.detail.includes('boom'));
  });
  test('seedFromEnv seeds only when SEED is set', () => {
    const r = createRng();
    seedFromEnv(r, {});
    eq(r.seeded(), false);
    seedFromEnv(r, { SEED: '7' });
    eq(r.seeded(), true);
  });
  test('clock', () => { eq(clock(65), '1:05'); eq(clock(600), '10:00'); });
});
