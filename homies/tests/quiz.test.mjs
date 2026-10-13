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
  test('each side is a kind of game with two or three examples', () => {
    for (const x of QUESTIONS) for (const s of ['a', 'b']) {
      ok(x[s].label && x[s].label.length <= 48, `${x.id}.${s} label`);
      ok(x[s].examples.length >= 2 && x[s].examples.length <= 3, `${x.id}.${s} needs 2-3 examples`);
      ok(x[s].examples.join(' / ').length <= 70, `${x.id}.${s} examples too long for a phone card`);
    }
  });
  test('no example appears on both sides of one question', () => {
    for (const x of QUESTIONS) for (const g of x.a.examples) ok(!x.b.examples.includes(g), `${x.id}: ${g} on both sides`);
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
    const p = profile({ 'rts-tbs': 'a' });
    eq(p.pace.a, 1); eq(p.pace.b, 0); eq(p.pace.lean, 1);
    eq(p.skill.b, 1); eq(p.company.a, 1); eq(p.rivalry.b, 1);
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
      'michael@x.test': { ...all('a'), 'boardgame-abstract': 'b', 'rts-tbs': 'b' },
      'josh@x.test': { ...all('a'), 'boardgame-abstract': 'b' },
    };
    const r = crewResults(crew, answers);
    eq(r.waiting.length, 0);
    const byId = Object.fromEntries(r.questions.map((x) => [x.id, x]));
    eq(byId['boardgame-abstract'].verdict, 'split');
    deepEq(byId['boardgame-abstract'].a, ['Jeff', 'Eric']);
    deepEq(byId['boardgame-abstract'].b, ['Michael', 'Josh']);
    eq(byId['rts-tbs'].verdict, 'lean');
    eq(byId['rts-tbs'].winner, 'a');
    eq(byId['survival-setting'].verdict, 'unanimous');
    eq(r.unanimous.length, QUESTIONS.length - 2);
    eq(r.splits.length, 1);
  });
  test('shelf counts the examples of picked sides across the crew', () => {
    const r = crewResults(crew, { 'jeff@x.test': all('a'), 'eric@x.test': all('a') });
    const sideA = new Set(QUESTIONS.flatMap((x) => x.a.examples));
    eq(r.shelf.length, sideA.size, 'every side-a example, once');
    ok(r.shelf.every((s) => s.picks % 2 === 0 && sideA.has(s.game)), 'two people, same picks: even counts, side-a games only');
    ok(r.shelf[0].picks >= r.shelf[r.shelf.length - 1].picks, 'most picked first');
    const one = crewResults(crew, { 'jeff@x.test': { ...all('a'), 'survival-setting': 'b' } });
    const games = one.shelf.map((s) => s.game);
    ok(games.includes('Enshrouded') && games.includes('Valheim'), 'picked side\'s examples are on the shelf');
    ok(!games.includes('Space Engineers'), 'unpicked side\'s examples are not');
  });
  test('axis verdicts', () => {
    const r = crewResults(crew, { 'jeff@x.test': all('a'), 'eric@x.test': all('b') });
    // Two people on opposite sides of every question cancel out on symmetric axes.
    const pace = r.axes.find((a) => a.id === 'pace');
    eq(pace.leans.length, 2);
    ok(['split', 'lean', 'agreed'].includes(pace.verdict));
    const same = crewResults(crew, { 'jeff@x.test': all('a'), 'eric@x.test': all('a') });
    const era = same.axes.find((a) => a.id === 'era');
    eq(era.mean, 1, 'every side-a era vote is the past');
    eq(era.verdict, 'agreed');
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
