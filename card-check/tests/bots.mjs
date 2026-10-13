// Bots that play Card Check through its real engine (engine.js), for the tests and
// for `node card-check/tests/sim.mjs`. Each bot picks one move per call; `apply`
// plays it the way the page does: on a copy, kept only if the engine allows it,
// then afterAction.
import * as E from '../engine.js';

const ICONS = ['Crunch', 'Pay', 'Layoffs', 'Credit', 'Harassment'];

// Every move open to the player right now, as [name, fn(g) -> error|null].
export function moves(g) {
  const out = [];
  const p = g.pending && g.pending[0];
  if (g.phase === 'over') return out;
  if (g.phase === 'absorb') {
    out.push(['absorb all', (x) => E.doAbsorbDecision(x, Object.fromEntries(E.stewardsAvail(x).map((w) => [w.id, true])))]);
    out.push(['absorb none', (x) => E.doAbsorbDecision(x, {})]);
    return out;
  }
  if (p && p.type === 'steward') {
    E.stewardTargets(g, p.dept).forEach((w) => out.push([`steward ${w.id}`, (x) => E.doStewardPick(x, w.id)]));
    out.push(['steward skip', (x) => E.doStewardSkip(x)]);
    return out;
  }
  if (p && p.type === 'influence') {
    E.onBoard(g, p.dept).filter((w) => w.disp < 3 && !E.immovable(w) && !(w.disp === 2 && E.locked(g, w)))
      .forEach((w) => out.push([`influence ${w.id}`, (x) => E.doInfluencePick(x, w.id)]));
    out.push(['influence skip', (x) => E.doSkipInfluence(x)]);
    return out;
  }
  if (p && p.type === 'icon') {
    ICONS.forEach((ic) => out.push([`icon ${ic}`, (x) => { x.pending = []; return E.doSmallWin(x, x.cur, 'wild', ic); }]));
    return out;
  }
  if (g.phase !== 'org') return out;
  const oi = g.cur;
  Object.keys(E.DEPTS).forEach((d) => out.push([`map ${d}`, (x) => E.doMap(x, oi, d)]));
  E.onBoard(g).forEach((w) => {
    out.push([`one ${w.id}`, (x) => E.doOne(x, oi, w.id)]);
    if (w.leader && w.disp === 3) out.push([`committee ${w.id}`, (x) => E.doCommittee(x, oi, w.id)]);
  });
  g.issues.filter((i) => i.state === 'open').forEach((i) => out.push([`win ${i.id}`, (x) => E.doSmallWin(x, oi, i.id)]));
  out.push(['reassure', (x) => E.doReassure(x, oi)], ['reset', (x) => E.doReset(x, oi)], ['overwork', (x) => E.doOverwork(x, oi)]);
  out.push(['end', (x) => E.doEnd(x, oi)]);
  return out;
}

// The game after a move: a new state, or the same one when the engine refused it.
export function apply(g, [, fn]) {
  const next = E.clone(g);
  if (fn(next)) return g;
  E.afterAction(next);
  return next;
}

// Any legal-looking move, at random: what the fuzzer throws at the engine.
export const randomBot = (g, rng) => rng.pick(moves(g));

// A plain organizer: take a ready Small Win, make Stewards, keep Fear under 7,
// talk to whoever is closest to signing, map when there's nobody to talk to.
export function organizerBot(g) {
  const all = moves(g);
  const by = (prefix) => all.filter(([n]) => n.startsWith(prefix));
  if (g.phase !== 'org' || (g.pending && g.pending.length)) {
    return by('absorb all')[0] || by('steward ')[0] || by('influence ')[0] || all.find(([n]) => n.startsWith('icon') && trial(g, n)) || all[0];
  }
  const o = g.orgs[g.cur];
  const tryFirst = (list) => list.find(([n, fn]) => trial(g, n, fn));
  const ready = tryFirst(by('win '));
  if (ready) return ready;
  if (g.fear >= 5) { const r = tryFirst(by('reassure')); if (r) return r; }
  const com = tryFirst(by('committee '));
  if (com) return com;
  const talks = by('one ').map((m) => [m, g.workers[+m[0].split(' ')[1]]])
    .filter(([, w]) => w.disp < 3 && w.disp >= 0).sort((a, b) => b[1].disp - a[1].disp || b[1].infl - a[1].infl);
  const talk = tryFirst(talks.map(([m]) => m));
  if (talk) return talk;
  if (o.burnout >= 2) { const r = tryFirst(by('reset')); if (r) return r; }
  const map = tryFirst([by(`map ${o.d}`)[0], ...by('map ')].filter(Boolean));
  if (map) return map;
  return by('end')[0];
}

// Would this move go through? Tried on a copy.
function trial(g, name, fn) {
  const m = fn ? [name, fn] : moves(g).find(([n]) => n === name);
  if (!m) return false;
  return apply(g, m) !== g;
}

// A new game, dealt from `seed`, with the given organizers, ready for round 1.
export function deal(seed, orgs = ['senior']) {
  const g = E.newGame(orgs.map((k) => ({ k, playerId: k })), seed);
  E.setupFlips(g);
  E.startRound(g);
  return g;
}

// Plays one game to the end with a bot. Returns the finished game.
export function playOut(g, bot, rng, maxMoves = 4000) {
  for (let i = 0; i < maxMoves && g.phase !== 'over'; i++) {
    const m = bot(g, rng);
    if (!m) break;
    g = apply(g, m);
  }
  return g;
}
