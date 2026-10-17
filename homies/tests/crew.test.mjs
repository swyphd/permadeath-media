// node homies/tests/crew.test.mjs
import { suite, test, ok, eq, deepEq, report } from '../../kit/test/harness.js';
import { QUESTIONS, SCALES, AREAS, byId, checkBank, answered, complete, progress, nextUnanswered, crewResults, houseRule, summary } from '../crew.js';

const crew = [
  { email: 'jeff@x.test', name: 'Jeff' },
  { email: 'eric@x.test', name: 'Eric' },
  { email: 'michael@x.test', name: 'Michael' },
  { email: 'josh@x.test', name: 'Josh' },
];

// A full set of answers: the first option everywhere, one grid level for every row.
function full(levels = {}, over = {}) {
  const a = {};
  for (const x of QUESTIONS) {
    if (x.kind === 'one') a[x.id] = x.options[0].id;
    else if (x.kind === 'many') a[x.id] = [x.options[0].id];
    else if (x.kind === 'text') a[x.id] = '';
    else a[x.id] = Object.fromEntries(x.rows.map((r) => [r.id, levels[x.id] || SCALES[x.scale][0].id]));
  }
  return { ...a, ...over };
}

suite('bank', () => {
  test('is consistent', () => deepEq(checkBank(), []));
  test('covers time, work and AI', () => {
    for (const s of ['time', 'work', 'ai']) ok(QUESTIONS.some((x) => x.section === s), s);
  });
  test('labels fit a phone', () => {
    for (const x of QUESTIONS) {
      ok(x.ask.length <= 110, `${x.id} ask`);
      for (const o of x.options || []) ok(o.label.length <= 44, `${x.id}.${o.id}`);
      for (const r of x.rows || []) ok(r.label.length <= 70, `${x.id}.${r.id}`);
    }
  });
  test('every area maps to a launch-meeting role', () => {
    const roles = ['Code', 'Art', 'Design', 'Audio', 'Writing', 'Production', 'Marketing'];
    for (const a of AREAS) ok(roles.includes(a.role), a.id);
  });
  test('catches a bad bank', () => {
    const p = checkBank([{ id: 'x', section: 'nope', kind: 'one', options: [{ id: 'a' }] }, { id: 'x', section: 'time', kind: 'grid', scale: 'zzz', rows: [] }]);
    ok(p.some((m) => m.includes('duplicate id')));
    ok(p.some((m) => m.includes('unknown section')));
    ok(p.some((m) => m.includes('two or more')));
    ok(p.some((m) => m.includes('unknown scale')));
    ok(p.some((m) => m.includes('no rows')));
  });
});

suite('one person', () => {
  test('answered, by kind', () => {
    eq(answered(byId.hours, 'h5'), true);
    eq(answered(byId.hours, 'nope'), false);
    eq(answered(byId.windows, []), false);
    eq(answered(byId.windows, ['weekends']), true);
    eq(answered(byId.busy, undefined), false);
    eq(answered(byId.busy, ''), true, 'a skipped optional counts once seen');
    eq(answered(byId.areas, { 'code-game': 'lead' }), false, 'a grid needs every row');
    eq(answered(byId.areas, full().areas), true);
  });
  test('progress and next', () => {
    eq(progress({}), 0);
    eq(nextUnanswered({}), 0);
    eq(nextUnanswered({ hours: 'h2' }), 1);
    eq(complete(full()), true);
    eq(progress(full()), QUESTIONS.length);
    eq(nextUnanswered(full()), -1);
  });
});

suite('crew', () => {
  test('waits for everyone', () => {
    const r = crewResults(crew, { 'jeff@x.test': full() });
    deepEq(r.done, ['jeff@x.test']);
    deepEq(r.waiting, ['Eric', 'Michael', 'Josh']);
  });
  test('time: hours add up, shared windows, slowest call', () => {
    const r = crewResults(crew, {
      'jeff@x.test': full({}, { hours: 'h5', windows: ['weeknights', 'weekends'], meet: 'weekly' }),
      'eric@x.test': full({}, { hours: 'h2', windows: ['weekends', 'late'], meet: 'biweekly' }),
    });
    eq(r.time.lo, 7); eq(r.time.hi, 15);
    deepEq(r.time.shared.map((w) => w.id), ['weekends']);
    eq(r.time.meet, 'biweekly');
    ok(summary(r).includes('7–15 hours'), summary(r));
    ok(summary(r).includes('every two weeks'), summary(r));
  });
  test('work: gaps, crowded, owned, roles', () => {
    const jeff = full({ areas: 'pass' }, {});
    jeff.areas = { ...jeff.areas, 'code-game': 'lead', design: 'lead' };
    const eric = full({ areas: 'pass' });
    eric.areas = { ...eric.areas, design: 'lead', 'art-2d': 'help' };
    const r = crewResults(crew, { 'jeff@x.test': jeff, 'eric@x.test': eric });
    const by = Object.fromEntries(r.work.areas.map((a) => [a.id, a]));
    eq(by['code-game'].flag, 'owned');
    eq(by.design.flag, 'crowded');
    eq(by['art-2d'].flag, 'unled', 'help with no lead is not a gap');
    eq(by.audio.flag, 'gap');
    deepEq(r.work.roles.Design.lead, ['Jeff', 'Eric']);
    deepEq(r.work.roles.Art.help, ['Eric']);
    ok(summary(r).includes('Nobody leads or helps on'), summary(r));
  });
  test('ai: cautious answer, spread, house rule', () => {
    const jeff = full({ 'ai-areas': 'free' });
    const eric = full({ 'ai-areas': 'free' });
    eric['ai-areas'] = { ...eric['ai-areas'], art: 'none', code: 'draft' };
    const r = crewResults(crew, { 'jeff@x.test': jeff, 'eric@x.test': eric });
    const by = Object.fromEntries(r.ai.areas.map((a) => [a.id, a]));
    eq(by.art.cautious, 'none'); eq(by.art.spread, 'split');
    eq(by.code.cautious, 'draft'); eq(by.code.spread, 'close');
    eq(by.music.cautious, 'free'); eq(by.music.spread, 'agreed');
    const rule = Object.fromEntries(houseRule(r).map((x) => [x.id, x.level]));
    eq(rule.art, 'none'); eq(rule.music, 'free');
    ok(summary(r).includes('AI splits us on art that ships in the game'), summary(r));
  });
  test('ai views and hard lines', () => {
    const jeff = full({ 'ai-views': 'agree' }, { 'ai-line': 'No AI voices.' });
    const eric = full({ 'ai-views': 'agree' });
    eric['ai-views'] = { ...eric['ai-views'], 'no-art': 'disagree' };
    const r = crewResults(crew, { 'jeff@x.test': jeff, 'eric@x.test': eric });
    const by = Object.fromEntries(r.ai.views.map((v) => [v.id, v]));
    eq(by.disclose.verdict, 'agreed');
    eq(by['no-art'].verdict, 'split');
    deepEq(r.ai.lines.map((l) => l.name), ['Jeff']);
  });
  test('empty crew', () => {
    const r = crewResults(crew, {});
    eq(summary(r), '');
    eq(r.time.meet, null);
    eq(r.work.areas[0].flag, null);
  });
});

await report();
