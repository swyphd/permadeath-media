// node card-check/tests/engine.test.mjs
// The rules engine on the studio kit: seeded deals replay, the guided game's opening
// holds, and random play never breaks the game's invariants.
import { suite, test, ok, eq, deepEq, report } from '../../kit/test/harness.js';
import { fuzz } from '../../kit/test/sim.js';
import { createRng } from '../../kit/rng.js';
import * as E from '../engine.js';
import { TUT_SCRIPT } from '../tutorial.js';
import { deal, apply, moves, randomBot, organizerBot, playOut } from './bots.mjs';

const PHASES = ['mgmt', 'absorb', 'steward', 'org', 'over'];

suite('card check: engine', () => {
  test('the same seed deals the same game', () => {
    deepEq(deal(42, ['senior', 'tester']), deal(42, ['senior', 'tester']));
    ok(JSON.stringify(deal(42).piles) !== JSON.stringify(deal(43).piles));
  });
  test('the guided game opens on its script', () => {
    const g = E.newGame([{ k: 'senior' }], 7, TUT_SCRIPT);
    deepEq(g.piles.Eng.slice(0, 5), TUT_SCRIPT.piles.Eng);
    eq(g.piles.Prod[0], 26);
    deepEq(g.deck[1].slice(0, 4), TUT_SCRIPT.deck[1]);
    eq(g.piles.Eng.length, 8);
  });
  test('a refused move leaves the game as it was', () => {
    const g = deal(3);
    const before = JSON.stringify(g);
    eq(apply(g, ['win pay', (x) => E.doSmallWin(x, 0, 'pay')]), g);
    eq(JSON.stringify(g), before);
  });
  test("a Steward's free One-on-One is spent by a burned-out Animator too", () => {
    const g = deal(4, ['animator']);
    const o = g.orgs[0]; o.burnout = 3; o.actions = 1;
    const st = Object.values(g.workers).find((w) => w.dept === 'Art' && w.leader);
    const crunch = Object.values(g.workers).filter((w) => w.dept === 'Art' && w.issues.includes('Crunch') && !w.leader);
    st.onBoard = true; st.disp = 4;
    crunch.forEach((w) => { w.onBoard = true; w.disp = 0; });
    eq(E.oneCost(g, o, crunch[0]), 0);
    eq(E.doOne(g, 0, crunch[0].id), null);
    ok(st.freeUsed);
    eq(E.oneCost(g, o, crunch[1]), 1);
  });
  test('no turn ends while a choice is waiting', () => {
    const g = deal(5);
    g.pending = [{ type: 'icon', issue: 'wild' }];
    ok(E.doEnd(g, 0));
    eq(g.orgs[0].done, false);
  });
  test('a whole game replays move for move', () => {
    const play = () => playOut(deal(9, ['senior', 'animator']), randomBot, createRng(5));
    deepEq(play(), play());
  });
});

suite('card check: random play', () => {
  const { problems, clean } = fuzz({
    games: 60, turns: 600, seed: 11,
    init: (rng, i) => deal(i, [['senior'], ['senior', 'tester'], ['tester', 'animator', 'ap', 'cm']][i % 3]),
    plan: (g, rng) => randomBot(g, rng),
    apply,
    done: (g) => g.phase === 'over',
    check: (g, bad, at) => {
      if (!PHASES.includes(g.phase)) bad('phase', `${at}: ${g.phase}`);
      if (g.phase !== 'over' && !moves(g).length) bad('stuck', `${at}: no move in ${g.phase}`);
      if (g.fear < 0 || g.fear > 10) bad('fear', `${at}: ${g.fear}`);
      if (g.round > g.maxRound) bad('round', `${at}: ${g.round} of ${g.maxRound}`);
      g.orgs.forEach((o) => { if (o.burnout < 0 || o.burnout > 3 || o.actions < 0) bad('organizer', `${at}: ${JSON.stringify(o)}`); });
      Object.values(g.workers).forEach((w) => { if (w.disp < -2 || w.disp > 4) bad('disposition', `${at}: ${w.name} ${w.disp}`); });
      if (E.winsLeft(g) < 0) bad('small wins', at);
      if (g.phase === 'over' && !['win', 'loss'].includes(g.result)) bad('result', at);
    },
  });
  test('no thrown errors, stuck turns or broken counters', () => {
    deepEq(problems, {});
    ok(clean);
  });
  test('games finish', () => {
    const rng = createRng(2);
    for (let i = 0; i < 10; i++) eq(playOut(deal(100 + i), organizerBot, rng).phase, 'over');
  });
});

await report();
