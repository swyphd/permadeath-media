import { suite, test, ok, eq, deepEq } from '../test/harness.js';
import { installStorage } from './fakes.mjs';
import { createTutorial, isActionStep } from '../tutorial.js';

// Shaped like Guild Rising's TUTORIAL_STEPS.
const steps = [
  { id: 'pitch', title: 'Fill the treasury', when: (g) => g.phase === 'survival' && !g.garden, done: (g) => g.coins >= 20 },
  { id: 'garden', title: 'Build the garden', when: (g) => g.phase === 'survival' && g.coins >= 20, done: (g) => g.garden },
  { id: 'goal', title: 'Goals unlock the game', when: (g) => g.phase !== 'survival' },
  { id: 'vote', title: 'Cast your vote', when: (g) => !!g.vote, done: (g) => !g.vote || g.vote.cast },
];
const game = (o = {}) => ({ phase: 'survival', coins: 0, garden: false, vote: null, modalOpen: false, ...o });

suite('tutorial: contextual (Guild Rising)', () => {
  test('starts on a welcome that pauses the game', () => {
    installStorage();
    const t = createTutorial({ key: 'gr-tut', steps });
    eq(t.status, 'new');
    ok(t.paused(game()));
    eq(t.observe(game()), null);
  });
  test('skip turns it off for good, and is remembered', () => {
    installStorage();
    createTutorial({ key: 'gr-tut', steps }).skip();
    const again = createTutorial({ key: 'gr-tut', steps });
    eq(again.status, 'skipped');
    eq(again.paused(game()), false);
  });
  test('action steps wait without pausing and finish when the player does the thing', () => {
    installStorage();
    const t = createTutorial({ key: 'gr-tut', steps });
    t.start();
    eq(t.observe(game()).id, 'pitch');
    eq(t.paused(game()), false);
    eq(t.observe(game({ coins: 20 })).id, 'garden');
    deepEq(t.seen, ['pitch']);
    eq(t.observe(game({ coins: 20, garden: true, phase: 'commons' })).id, 'goal');
    deepEq(t.seen, ['pitch', 'garden']);
  });
  test('read steps pause until "Got it"', () => {
    installStorage();
    const t = createTutorial({ key: 'gr-tut', steps, autoStart: true });
    const g = game({ phase: 'commons', garden: true });
    t.observe(g); t.observe(g); // pitch and garden no longer apply and were never shown
    eq(t.observe(g).id, 'goal');
    ok(t.paused(g));
    t.next(g);
    eq(t.paused(g), false);
    eq(t.observe(g), null);
  });
  test('an action step that stops applying is retired, not shown stale later', () => {
    installStorage();
    const t = createTutorial({ key: 'gr-tut', steps: [steps[3], steps[2]], autoStart: true });
    const open = game({ phase: 'commons', vote: { cast: false } });
    eq(t.observe(open).id, 'vote');
    // the vote closed without the player: retired once no modal hides the page
    eq(t.observe(game({ phase: 'commons' })).id, 'goal');
    ok(t.seen.includes('vote'));
  });
  test('a modal keeps an unfinished action step for later', () => {
    installStorage();
    const vote = { id: 'vote', when: (g) => !g.modalOpen && !!g.vote, done: (g) => g.vote.cast };
    const t = createTutorial({ key: 'gr-tut', steps: [vote], autoStart: true, hidden: (g) => g.modalOpen });
    eq(t.observe(game({ vote: { cast: false } })).id, 'vote');
    eq(t.observe(game({ vote: { cast: false }, modalOpen: true })), null);
    eq(t.seen.length, 0);
    eq(t.observe(game({ vote: { cast: false } })).id, 'vote');
  });
  test('seeing every step finishes it; replay starts over', () => {
    installStorage();
    const t = createTutorial({ key: 'gr-tut', steps: [steps[2]], autoStart: true });
    const g = game({ phase: 'x' });
    t.observe(g); t.next(g);
    eq(t.status, 'done');
    t.replay();
    eq(t.status, 'active');
    eq(t.observe(g).id, 'goal');
  });
  test('progress survives a reload; a new version starts fresh', () => {
    installStorage();
    const t = createTutorial({ key: 'gr-tut', steps, autoStart: true });
    t.markSeen('pitch');
    deepEq(createTutorial({ key: 'gr-tut', steps }).seen, ['pitch']);
    deepEq(createTutorial({ key: 'gr-tut', steps, version: 2 }).seen, []);
  });
  test('subscribers hear every change', () => {
    installStorage();
    const t = createTutorial({ key: 'gr-tut', steps });
    let n = 0;
    const off = t.subscribe(() => n++);
    t.start(); t.markSeen('pitch');
    off(); t.skip();
    eq(n, 2);
  });
});

// Shaped like Card Check's scripted TUT, with its parts.
const script = [
  { id: 'welcome', title: 'Welcome', next: true },
  { id: 'map', title: 'Click Map', done: (g) => g.armed === 'map' },
  { id: 'pile', title: 'Click the pile', done: (g) => g.mapped },
  { id: 'meet', title: 'Meet Tomasz', next: true, done: () => true },
  { id: 'end', title: 'End your turn', done: (g) => g.round === 2 },
];
const parts = [{ name: 'The basics', from: 0 }, { name: 'Stewards', from: 3 }];

suite('tutorial: scripted (Card Check)', () => {
  test('runs in order; action steps advance on their own, read steps wait for Next', () => {
    const t = createTutorial({ steps: script, mode: 'scripted', autoStart: true, persist: false, parts });
    const g = { armed: null, mapped: false, round: 1 };
    eq(t.observe(g).id, 'welcome');
    ok(t.paused(g));
    t.next(g);
    eq(t.observe(g).id, 'map');
    eq(t.paused(g), false);
    g.armed = 'map'; g.mapped = true; // one click can satisfy a chain of action steps
    eq(t.observe(g).id, 'meet', 'a read step stops the chain even when its done() holds');
    deepEq(t.progress(), { part: 1, parts: 2, name: 'Stewards', step: 1, of: 2 });
    t.next(g);
    g.round = 2;
    eq(t.observe(g), null);
    eq(t.status, 'done');
  });
  test('snapshot and initial let a game keep the tutorial in its own save', () => {
    const t = createTutorial({ steps: script, mode: 'scripted', autoStart: true, persist: false });
    t.next({});
    const snap = JSON.parse(JSON.stringify(t.snapshot()));
    const back = createTutorial({ steps: script, mode: 'scripted', persist: false, initial: snap });
    eq(back.index, 1);
    eq(back.current({}).id, 'map');
  });
  test('persist: false writes nothing to storage', () => {
    const store = installStorage();
    createTutorial({ key: 'cc', steps: script, mode: 'scripted', persist: false }).start();
    eq(store.size, 0);
  });
  test('isActionStep', () => {
    ok(isActionStep(script[1]));
    ok(!isActionStep(script[0]));
    ok(!isActionStep(script[3]));
  });
});

suite('tutorial: callouts (Card Check, once per device)', () => {
  const callouts = [
    { id: 'fear7', title: 'Fear is 7', when: (g) => g.fear >= 7 },
    { id: 'burnout', title: 'Burnout', when: (g) => g.burnout > 0 },
  ];
  test('each shows the first time it applies, and never again', () => {
    installStorage();
    const c = createTutorial({ key: 'cc-callouts', steps: callouts, autoStart: true });
    eq(c.observe({ fear: 3, burnout: 0 }), null);
    const g = { fear: 8, burnout: 1 };
    eq(c.observe(g).id, 'fear7');
    c.next(g);
    eq(c.observe(g).id, 'burnout');
    c.next(g);
    eq(createTutorial({ key: 'cc-callouts', steps: callouts, autoStart: true }).observe(g), null);
  });
});
