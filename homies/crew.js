// The second quiz, "How we work": how much time each person can give, what
// they want to do on the game, and where they stand on using AI. The game quiz
// (quiz.js) picks what we build; this one picks how we build it.
//
// Four kinds of question:
//   one   pick one option
//   many  pick any number of options (at least one)
//   grid  a row per area, one answer from a shared scale per row
//   text  a few optional words
// Answers are { [questionId]: string | string[] | { [rowId]: scaleId } }.
// Like the game quiz, nobody's answers show until everyone has finished, or
// until someone taps "reveal early".
//
// Plain ES module, no DOM, so `node homies/tests/crew.test.mjs` can check it.

export const SECTIONS = [
  { id: 'time', label: 'Time', blurb: 'What you can actually give, not what you’d like to. Lowball it: a small promise kept beats a big one missed.' },
  { id: 'work', label: 'Work', blurb: 'What you’d want to do on the game. “Learn it” is a real answer: say so if you want a go at something you’ve never done.' },
  { id: 'ai', label: 'AI', blurb: 'How and when we use AI, if at all. We’ll set a house rule from these, so say where your lines are.' },
];

// Scales a grid can use. `rank` orders a scale from most to least (interest)
// or least to most (AI use), so the read-out can find the cautious end.
export const SCALES = {
  interest: [
    { id: 'lead', label: 'Lead it', rank: 3 },
    { id: 'help', label: 'Help', rank: 2 },
    { id: 'learn', label: 'Learn it', rank: 1 },
    { id: 'pass', label: 'Pass', rank: 0 },
  ],
  ai: [
    { id: 'none', label: 'No AI', rank: 0 },
    { id: 'ideas', label: 'Ideas only', rank: 1 },
    { id: 'draft', label: 'Drafts we redo', rank: 2 },
    { id: 'free', label: 'Use freely', rank: 3 },
  ],
  agree: [
    { id: 'agree', label: 'Agree', rank: 2 },
    { id: 'unsure', label: 'Not sure', rank: 1 },
    { id: 'disagree', label: 'Disagree', rank: 0 },
  ],
};

// The areas of work, each mapped to the launch meeting's role hats (ROLES in
// index.html) so the "Who does what" item can show who wants which hat.
export const AREAS = [
  { id: 'code-game', label: 'Gameplay code', role: 'Code' },
  { id: 'code-tools', label: 'Tools, servers, the website', role: 'Code' },
  { id: 'design', label: 'Game design and balance', role: 'Design' },
  { id: 'levels', label: 'Levels, puzzles, content', role: 'Design' },
  { id: 'art-2d', label: '2D art and UI', role: 'Art' },
  { id: 'art-3d', label: '3D models and animation', role: 'Art' },
  { id: 'writing', label: 'Writing and story', role: 'Writing' },
  { id: 'audio', label: 'Music and sound', role: 'Audio' },
  { id: 'production', label: 'Running the schedule', role: 'Production' },
  { id: 'qa', label: 'Playtesting and bugs', role: 'Production' },
  { id: 'marketing', label: 'Marketing and community', role: 'Marketing' },
  { id: 'business', label: 'Store page, money, paperwork', role: 'Marketing' },
];

// Where AI could come in, by the thing being made.
export const AI_AREAS = [
  { id: 'code', label: 'Code' },
  { id: 'concept', label: 'Concept art, mood boards' },
  { id: 'art', label: 'Art that ships in the game' },
  { id: 'writing', label: 'Story and dialogue' },
  { id: 'music', label: 'Music' },
  { id: 'sfx', label: 'Sound effects' },
  { id: 'voice', label: 'Voices' },
  { id: 'marketing', label: 'Store page and posts' },
  { id: 'testing', label: 'Playtesting and balance sims' },
];

// Where AI could come in, by when.
export const AI_STAGES = [
  { id: 'pitch', label: 'Brainstorming the idea' },
  { id: 'prototype', label: 'Throwaway prototypes' },
  { id: 'production', label: 'Making what ships' },
  { id: 'polish', label: 'Polish and bug fixing' },
  { id: 'launch', label: 'Launch and after' },
];

const one = (id, section, ask, options, extra = {}) => ({ id, section, kind: 'one', ask, options, ...extra });
const many = (id, section, ask, options, extra = {}) => ({ id, section, kind: 'many', ask, options, ...extra });
const grid = (id, section, ask, rows, scale, extra = {}) => ({ id, section, kind: 'grid', ask, rows, scale, ...extra });
const text = (id, section, ask, extra = {}) => ({ id, section, kind: 'text', ask, optional: true, max: 280, ...extra });
const opt = (id, label, more = {}) => ({ id, label, ...more });

export const QUESTIONS = [
  one('hours', 'time', 'In a normal week, how many hours can you give the game?', [
    opt('h0', 'Under 2', { lo: 0, hi: 2 }),
    opt('h2', '2 to 5', { lo: 2, hi: 5 }),
    opt('h5', '5 to 10', { lo: 5, hi: 10 }),
    opt('h10', '10 to 20', { lo: 10, hi: 20 }),
    opt('h20', 'More than 20', { lo: 20, hi: 30 }),
  ]),
  many('windows', 'time', 'When do those hours happen?', [
    opt('weeknights', 'Weeknights'),
    opt('weekdays', 'Weekday daytime'),
    opt('weekends', 'Weekends'),
    opt('late', 'Late nights'),
    opt('bursts', 'Whenever, in bursts'),
  ], { hint: 'Pick all that apply.' }),
  one('rhythm', 'time', 'Which sounds like you?', [
    opt('steady', 'About the same every week'),
    opt('bursty', 'Big pushes, then quiet stretches'),
    opt('unknown', 'Honestly, it depends on life'),
  ]),
  one('meet', 'time', 'How often can you make a live call?', [
    opt('weekly', 'Every week'),
    opt('biweekly', 'Every two weeks'),
    opt('monthly', 'Once a month'),
    opt('async', 'Rarely; I’d rather catch up in writing'),
  ]),
  one('horizon', 'time', 'How long are you signing up for, to start?', [
    opt('m1', 'A month, to see how it goes'),
    opt('m3', 'Three months'),
    opt('m6', 'Six months'),
    opt('y1', 'A year or more'),
    opt('open', 'As long as it’s fun'),
  ]),
  one('goal', 'time', 'What do you most want out of it?', [
    opt('fun', 'Making something with friends'),
    opt('craft', 'Getting better at a craft'),
    opt('portfolio', 'Something to show for it'),
    opt('income', 'Some money on the side'),
    opt('career', 'A shot at doing this for real'),
  ]),
  text('busy', 'time', 'Anything coming up that eats your time? A move, a launch at work, a baby, exams.'),

  grid('areas', 'work', 'For each part of the work, how much do you want it?', AREAS, 'interest',
    { hint: 'Lead it: you’d own it. Help: you’d pitch in. Learn it: you want a go. Pass: rather not.' }),
  one('main', 'work', 'If you could only do one, which?', AREAS.map((a) => opt(a.id, a.label))),
  many('tools', 'work', 'Which of these have you used for real?', [
    opt('unity', 'Unity'),
    opt('godot', 'Godot'),
    opt('unreal', 'Unreal'),
    opt('web', 'JavaScript and the web'),
    opt('blender', 'Blender'),
    opt('aseprite', 'Aseprite or a pixel editor'),
    opt('photoshop', 'Photoshop, Krita or similar'),
    opt('daw', 'A DAW (Ableton, FL, Reaper…)'),
    opt('git', 'Git'),
    opt('none', 'None yet'),
  ], { hint: 'Pick all that apply.' }),
  text('learn', 'work', 'Something you’d love to get better at on this project?'),

  one('ai-use', 'ai', 'How much do you use AI tools today?', [
    opt('daily', 'Most days'),
    opt('weekly', 'Now and then'),
    opt('tried', 'I’ve tried them'),
    opt('never', 'Never'),
  ]),
  grid('ai-areas', 'ai', 'For each of these, how far should AI go?', AI_AREAS, 'ai',
    { hint: 'No AI: people only. Ideas only: AI to think with, nothing it makes ships. Drafts we redo: AI starts it, a person reworks it. Use freely: whatever works.' }),
  grid('ai-stages', 'ai', 'And by stage of the project?', AI_STAGES, 'ai'),
  grid('ai-views', 'ai', 'Agree or disagree?', [
    { id: 'disclose', label: 'We should tell players exactly where AI was used.' },
    { id: 'no-art', label: 'AI-made art should never ship in the game.' },
    { id: 'code-ok', label: 'AI code is fine if one of us understands every line.' },
    { id: 'scale', label: 'AI could let four part-timers make what used to take a studio.' },
    { id: 'slower', label: 'I’d rather ship slower than lean on AI for the creative parts.' },
    { id: 'say-no', label: 'Any one of us should be able to veto AI on their own part.' },
  ], 'agree'),
  text('ai-line', 'ai', 'Where’s your hard line on AI, if you have one?'),
];

export const byId = Object.fromEntries(QUESTIONS.map((x) => [x.id, x]));
const scaleOf = (x) => SCALES[x.scale] || [];
const rankOf = (x, id) => scaleOf(x).find((s) => s.id === id)?.rank;

// Sanity checks on the bank, for the tests.
export function checkBank(questions = QUESTIONS) {
  const problems = [];
  const ids = new Set();
  const sections = new Set(SECTIONS.map((s) => s.id));
  for (const x of questions) {
    if (ids.has(x.id)) problems.push(`${x.id}: duplicate id`);
    ids.add(x.id);
    if (x.id.length > 40) problems.push(`${x.id}: id longer than 40`);
    if (!sections.has(x.section)) problems.push(`${x.id}: unknown section ${x.section}`);
    if (!['one', 'many', 'grid', 'text'].includes(x.kind)) problems.push(`${x.id}: unknown kind ${x.kind}`);
    if (x.kind === 'one' || x.kind === 'many') {
      if (!x.options?.length || x.options.length < 2) problems.push(`${x.id}: needs two or more options`);
      const o = new Set();
      for (const op of x.options || []) { if (o.has(op.id)) problems.push(`${x.id}: duplicate option ${op.id}`); o.add(op.id); }
    }
    if (x.kind === 'grid') {
      if (!SCALES[x.scale]) problems.push(`${x.id}: unknown scale ${x.scale}`);
      if (!x.rows?.length) problems.push(`${x.id}: no rows`);
      const r = new Set();
      for (const row of x.rows || []) { if (r.has(row.id)) problems.push(`${x.id}: duplicate row ${row.id}`); r.add(row.id); }
    }
  }
  return problems;
}

// Is one question answered (an optional one counts as answered once seen,
// which the page records as an empty string)?
export function answered(x, v) {
  if (x.kind === 'text') return typeof v === 'string';
  if (x.kind === 'one') return !!x.options.find((o) => o.id === v);
  if (x.kind === 'many') return Array.isArray(v) && v.some((id) => x.options.find((o) => o.id === id));
  if (x.kind === 'grid') return !!v && typeof v === 'object' && x.rows.every((r) => scaleOf(x).some((s) => s.id === v[r.id]));
  return false;
}

export function complete(answers, questions = QUESTIONS) {
  return questions.every((x) => answered(x, answers?.[x.id]));
}

export function progress(answers, questions = QUESTIONS) {
  return questions.filter((x) => answered(x, answers?.[x.id])).length;
}

export function nextUnanswered(answers, questions = QUESTIONS) {
  return questions.findIndex((x) => !answered(x, answers?.[x.id]));
}

const optionLabel = (qid, id) => byId[qid]?.options?.find((o) => o.id === id)?.label || '';

// The crew read-out.
//   people: [{ email, name }]
//   answersByEmail: { [email]: answers }
// Only people who finished count. Returns:
//   done, waiting           emails done / names still to finish
//   time.people             per person: hours label, windows, rhythm, meet, horizon, goal, busy
//   time.lo, time.hi        the crew's weekly hours, low and high end
//   time.windows            per window: who picked it; time.shared: windows everyone picked
//   time.meet               the most frequent call everyone can make (the slowest answer)
//   work.areas              per area: names by level, and a flag: gap (nobody leads or helps),
//                           unled (help, but no lead), crowded (two or more want to lead),
//                           owned (exactly one lead)
//   work.roles              per role hat: who wants to lead or help it
//   ai.areas, ai.stages     per row: names by level, the cautious answer (lowest), the
//                           spread (agreed | close | split)
//   ai.views                per statement: names by agree / unsure / disagree, and agreed
export function crewResults(people, answersByEmail, questions = QUESTIONS) {
  const doneP = people.filter((p) => complete(answersByEmail?.[p.email], questions));
  const waiting = people.filter((p) => !complete(answersByEmail?.[p.email], questions)).map((p) => p.name);
  const A = (p) => answersByEmail[p.email];

  // ---- time
  const hoursQ = byId.hours;
  const timePeople = doneP.map((p) => {
    const a = A(p);
    const h = hoursQ.options.find((o) => o.id === a.hours);
    return {
      email: p.email, name: p.name,
      hours: h.label, lo: h.lo, hi: h.hi,
      windows: a.windows.map((w) => optionLabel('windows', w)).filter(Boolean),
      rhythm: optionLabel('rhythm', a.rhythm),
      meet: a.meet, meetLabel: optionLabel('meet', a.meet),
      horizon: optionLabel('horizon', a.horizon),
      goal: optionLabel('goal', a.goal),
      busy: (a.busy || '').trim(),
    };
  });
  const windows = byId.windows.options.map((o) => ({
    id: o.id, label: o.label,
    names: doneP.filter((p) => A(p).windows.includes(o.id)).map((p) => p.name),
  }));
  const shared = doneP.length ? windows.filter((w) => w.names.length === doneP.length && w.id !== 'bursts') : [];
  const meetOrder = byId.meet.options.map((o) => o.id); // most to least often
  const slowest = doneP.length ? meetOrder[Math.max(...doneP.map((p) => meetOrder.indexOf(A(p).meet)))] : null;

  // ---- work
  const byLevel = (x, rowId) => Object.fromEntries(scaleOf(x).map((s) => [s.id, doneP.filter((p) => A(p)[x.id][rowId] === s.id).map((p) => p.name)]));
  const areasQ = byId.areas;
  const areas = AREAS.map((ar) => {
    const lv = byLevel(areasQ, ar.id);
    let flag = null;
    if (doneP.length) {
      if (!lv.lead.length && !lv.help.length) flag = 'gap';
      else if (lv.lead.length >= 2) flag = 'crowded';
      else if (lv.lead.length === 1) flag = 'owned';
      else flag = 'unled';
    }
    return { id: ar.id, label: ar.label, role: ar.role, ...lv, flag, main: doneP.filter((p) => A(p).main === ar.id).map((p) => p.name) };
  });
  const roleNames = [...new Set(AREAS.map((a) => a.role))];
  const roles = Object.fromEntries(roleNames.map((role) => {
    const rows = areas.filter((a) => a.role === role);
    return [role, {
      lead: [...new Set(rows.flatMap((r) => r.lead))],
      help: [...new Set(rows.flatMap((r) => r.help))].filter((n) => !rows.some((r) => r.lead.includes(n))),
    }];
  }));

  // ---- ai
  const aiRows = (x) => x.rows.map((row) => {
    const lv = byLevel(x, row.id);
    const ranks = doneP.map((p) => rankOf(x, A(p)[x.id][row.id]));
    let cautious = null; let spread = null;
    if (ranks.length) {
      const lo = Math.min(...ranks); const hi = Math.max(...ranks);
      cautious = scaleOf(x).find((s) => s.rank === lo).id;
      spread = hi === lo ? 'agreed' : hi - lo === 1 ? 'close' : 'split';
    }
    return { id: row.id, label: row.label, ...lv, cautious, spread };
  });
  const views = byId['ai-views'].rows.map((row) => {
    const lv = byLevel(byId['ai-views'], row.id);
    const n = doneP.length;
    return { id: row.id, label: row.label, ...lv, verdict: !n ? null : lv.agree.length === n ? 'agreed' : lv.disagree.length === n ? 'rejected' : lv.agree.length && lv.disagree.length ? 'split' : 'mixed' };
  });
  const lines = doneP.map((p) => ({ name: p.name, email: p.email, text: (A(p)['ai-line'] || '').trim() })).filter((l) => l.text);

  return {
    done: doneP.map((p) => p.email),
    waiting,
    time: {
      people: timePeople,
      lo: timePeople.reduce((s, p) => s + p.lo, 0),
      hi: timePeople.reduce((s, p) => s + p.hi, 0),
      windows, shared,
      meet: slowest, meetLabel: slowest ? optionLabel('meet', slowest) : '',
    },
    work: { areas, roles, learn: doneP.map((p) => ({ name: p.name, email: p.email, text: (A(p).learn || '').trim() })).filter((l) => l.text) },
    ai: { areas: aiRows(byId['ai-areas']), stages: aiRows(byId['ai-stages']), views, lines },
  };
}

// The house rule the most cautious answers add up to: per AI area, the lowest
// level anyone picked. A starting point for the launch meeting, not a verdict.
export function houseRule(results) {
  const label = (id) => SCALES.ai.find((s) => s.id === id)?.label || '';
  return results.ai.areas.filter((a) => a.cautious).map((a) => ({ id: a.id, label: a.label, level: a.cautious, levelLabel: label(a.cautious) }));
}

// One line for the top of the read-out.
export function summary(results) {
  const t = results.time;
  if (!results.done.length) return '';
  const parts = [`Together we have about ${t.lo}–${t.hi} hours a week.`];
  if (t.meet === 'async') parts.push('Not everyone can make regular calls.');
  else if (t.meetLabel) parts.push(`Everyone can make a call ${t.meetLabel.toLowerCase()}.`);
  const gaps = results.work.areas.filter((a) => a.flag === 'gap').map((a) => a.label.toLowerCase());
  if (gaps.length) parts.push(`Nobody leads or helps on ${list(gaps)}.`);
  const split = results.ai.areas.filter((a) => a.spread === 'split').map((a) => a.label.toLowerCase());
  if (split.length) parts.push(`AI splits us on ${list(split)}.`);
  return parts.join(' ');
}

function list(items) {
  if (items.length <= 1) return items.join('');
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`;
}
