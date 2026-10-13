// node homies/tests/quiz.test.mjs
import { suite, test, ok, eq, deepEq, report } from '../../kit/test/harness.js';
import { AXES, QUESTIONS, POLES, checkBank, complete, nextUnanswered, profile, crewResults, summary } from '../quiz.js';

const crew = [
  { email: 'jeff@x.test', name: 'Jeff' },
  { email: 'eric@x.test', name: 'Eric' },
  { email: 'michael@x.test', name: 'Michael' },
  { email: 'josh@x.test', name: 'Josh' },
];
const all = (pick) => Object.fromEntries(QUESTIONS.map((x) => [x.id, pick]));

suite('bank', () => {
  test('is consistent', () => deepEq(checkBank(), []));
  test('has enough questions to profile every axis', () => {
    for (const ax of AXES) {
      const n = QUESTIONS.filter((x) => [...x.a.tags, ...x.b.tags].some((t) => POLES[t].axis === ax.id)).length;
      ok(n >= 2, `${ax.id} only in ${n}`);
    }
  });
  test('each side names a game and a note', () => {
    for (const x of QUESTIONS) for (const s of ['a', 'b']) {
      ok(x[s].game && x[s].note, `${x.id}.${s}`);
      ok(x[s].note.length <= 110, `${x.id}.${s} note too long for a phone card`);
    }
  });
  test('catches a bad bank', () => {
    const bad = [{ id: 'x', a: { tags: ['realtime', 'turns'] }, b: { tags: ['nope'] } }, { id: 'x', a: { tags: [] }, b: { tags: ['brain'] } }];
    const p = checkBank(bad);
    ok(p.some((m) => m.includes('both ways')));
    ok(p.some((m) => m.includes('unknown tag')));
    ok(p.some((m) => m.includes('duplicate')));
    ok(p.some((m) => m.includes('no tags')));
  });
});

suite('one person', () => {
  test('complete and nextUnanswered', () => {
    eq(complete({}), false);
    eq(nextUnanswered({}), 0);
    const partial = { [QUESTIONS[0].id]: 'a' };
    eq(nextUnanswered(partial), 1);
    eq(complete(all('a')), true);
    eq(nextUnanswered(all('b')), -1);
    eq(complete({ ...all('a'), [QUESTIONS[3].id]: 'x' }), false);
  });
  test('profile counts votes per axis', () => {
    const p = profile({ 'spire-aoe': 'a' });
    eq(p.pace.b, 1); eq(p.pace.a, 0); eq(p.pace.lean, -1);
    eq(p.loop.a, 1); eq(p.company.b, 1);
    eq(p.setting.lean, null);
  });
  test('lean is in [-1, 1]', () => {
    const p = profile(all('a'));
    for (const v of Object.values(p)) if (v.lean !== null) ok(v.lean >= -1 && v.lean <= 1);
  });
});

suite('crew', () => {
  test('waits for everyone', () => {
    const r = crewResults(crew, { 'jeff@x.test': all('a') });
    deepEq(r.done, ['jeff@x.test']);
    deepEq(r.waiting, ['Eric', 'Michael', 'Josh']);
    eq(r.unanimous.length, 0, 'one person is not unanimity');
  });
  test('unanimous, split and lean questions', () => {
    const answers = {
      'jeff@x.test': all('a'),
      'eric@x.test': all('a'),
      'michael@x.test': { ...all('a'), 'catan-chess': 'b', 'spire-aoe': 'b' },
      'josh@x.test': { ...all('a'), 'catan-chess': 'b' },
    };
    const r = crewResults(crew, answers);
    eq(r.waiting.length, 0);
    const byId = Object.fromEntries(r.questions.map((x) => [x.id, x]));
    eq(byId['catan-chess'].verdict, 'split');
    deepEq(byId['catan-chess'].a, ['Jeff', 'Eric']);
    deepEq(byId['catan-chess'].b, ['Michael', 'Josh']);
    eq(byId['spire-aoe'].verdict, 'lean');
    eq(byId['spire-aoe'].winner, 'a');
    eq(byId['zomboid-helldivers'].verdict, 'unanimous');
    eq(r.unanimous.length, QUESTIONS.length - 2);
    eq(r.splits.length, 1);
  });
  test('shelf counts picks across the crew', () => {
    const r = crewResults(crew, { 'jeff@x.test': all('a'), 'eric@x.test': all('a') });
    eq(r.shelf[0].picks, 2);
    ok(r.shelf.every((s) => s.picks === 2));
    eq(r.shelf.length, QUESTIONS.length, 'two people, same picks, one shelf entry per question');
  });
  test('axis verdicts', () => {
    const r = crewResults(crew, { 'jeff@x.test': all('a'), 'eric@x.test': all('b') });
    // Two people on opposite sides of every question cancel out on symmetric axes.
    const pace = r.axes.find((a) => a.id === 'pace');
    eq(pace.leans.length, 2);
    ok(['split', 'lean', 'agreed'].includes(pace.verdict));
    const same = crewResults(crew, { 'jeff@x.test': { 'spire-aoe': 'a', ...all('a') }, 'eric@x.test': all('a') });
    const loop = same.axes.find((a) => a.id === 'loop');
    ok(loop.mean !== null);
    eq(loop.verdict, 'agreed');
  });
  test('summary reads', () => {
    const r = crewResults(crew, { 'jeff@x.test': all('a'), 'eric@x.test': all('a') });
    const s = summary(r);
    ok(s.startsWith('Everyone leans'), s);
    const empty = crewResults(crew, {});
    eq(summary(empty), '');
    eq(empty.axes[0].verdict, 'open');
  });
});

await report();
