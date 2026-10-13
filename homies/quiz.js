// The "this or that" quiz the crew answers before the launch meeting, and the
// scoring that turns four sets of answers into one picture of the game.
//
// Every question is a pair of real games (or two concrete ways a game could be).
// Each side carries tags, one pole of an axis in AXES; a pick is a vote for each
// of its poles. A person's profile is their votes per axis; the crew's picture is
// where everyone landed on each axis, which questions were unanimous, and which
// split the room. No free text anywhere: the meeting starts from the splits.
//
// Plain ES module, no DOM, so `node homies/tests/quiz.test.mjs` can check it.

// Each axis has two poles. `phrase` is how the pole reads in the crew summary.
export const AXES = [
  { id: 'pace', label: 'Pace', a: { id: 'realtime', label: 'Real-time', phrase: 'real-time' }, b: { id: 'turns', label: 'Turn-based', phrase: 'turn-based' } },
  { id: 'skill', label: 'What it tests', a: { id: 'reflex', label: 'Reflexes', phrase: 'about reflexes' }, b: { id: 'brain', label: 'Thinking', phrase: 'about thinking' } },
  { id: 'loop', label: 'The loop', a: { id: 'runs', label: 'Runs you lose', phrase: 'run-based (lose, start over)' }, b: { id: 'persistent', label: 'A world you keep', phrase: 'persistent (a world that keeps going)' } },
  { id: 'company', label: 'Company', a: { id: 'multi', label: 'With others', phrase: 'played with others' }, b: { id: 'solo', label: 'Alone', phrase: 'played alone' } },
  { id: 'rivalry', label: 'With others, how', a: { id: 'coop', label: 'Co-op', phrase: 'cooperative' }, b: { id: 'versus', label: 'Versus', phrase: 'competitive' } },
  { id: 'depth', label: 'Rules', a: { id: 'simulation', label: 'Deep simulation', phrase: 'systems-heavy' }, b: { id: 'tight', label: 'Tight ruleset', phrase: 'built on a few tight rules' } },
  { id: 'story', label: 'Story', a: { id: 'authored', label: 'Written for you', phrase: 'with a written story' }, b: { id: 'emergent', label: 'Made by play', phrase: 'with stories that come out of play' } },
  { id: 'tone', label: 'Tone', a: { id: 'grim', label: 'Grim', phrase: 'grim' }, b: { id: 'light', label: 'Light', phrase: 'light-hearted' } },
  { id: 'world', label: 'World', a: { id: 'grounded', label: 'Grounded', phrase: 'grounded' }, b: { id: 'fantastic', label: 'Fantastical', phrase: 'fantastical' } },
  { id: 'setting', label: 'Setting', a: { id: 'scifi', label: 'Sci-fi', phrase: 'sci-fi' }, b: { id: 'fantasy', label: 'Fantasy', phrase: 'fantasy' } },
  { id: 'era', label: 'When', a: { id: 'past', label: 'The past', phrase: 'set in the past' }, b: { id: 'present', label: 'Now-ish', phrase: 'set around now' } },
  { id: 'look', label: 'Look', a: { id: 'flat', label: '2D', phrase: '2D' }, b: { id: 'deep', label: '3D', phrase: '3D' } },
  { id: 'session', label: 'A sitting', a: { id: 'short', label: 'Short sessions', phrase: 'played in short sittings' }, b: { id: 'long', label: 'Long sessions', phrase: 'played in long sittings' } },
  { id: 'scope', label: 'Scope', a: { id: 'small', label: 'Ship it small', phrase: 'small enough to ship in months' }, b: { id: 'big', label: 'Go big', phrase: 'a big multi-year build' } },
  { id: 'home', label: 'Where it lives', a: { id: 'browser', label: 'Browser, free', phrase: 'free in the browser' }, b: { id: 'steam', label: 'Steam, paid', phrase: 'sold on Steam' } },
  { id: 'device', label: 'Device', a: { id: 'phone', label: 'Phone', phrase: 'on phones' }, b: { id: 'desk', label: 'Desk', phrase: 'on a PC' } },
];

const q = (id, ask, a, b) => ({ id, ask, a, b });
const o = (game, note, tags) => ({ game, note, tags });

export const DEFAULT_ASK = 'Would you rather build a game like…';

export const QUESTIONS = [
  q('zomboid-helldivers', DEFAULT_ASK,
    o('Project Zomboid', 'Slow-burn zombie survival. Every scratch matters and every run ends.', ['realtime', 'simulation', 'grim', 'grounded', 'emergent', 'long', 'present']),
    o('Helldivers 2', 'Four friends, one drop, forty minutes of chaos.', ['realtime', 'reflex', 'multi', 'coop', 'light', 'deep', 'short', 'scifi'])),
  q('catan-chess', 'Should this game be…',
    o('Catan, but online', 'Trade, talk and backstab on a shared board.', ['turns', 'multi', 'versus', 'brain', 'long', 'flat']),
    o('Chess, but faster', 'Two players, perfect information, a clock that bites.', ['turns', 'multi', 'versus', 'tight', 'brain', 'short'])),
  q('spire-aoe', DEFAULT_ASK,
    o('Slay the Spire', 'Build a deck, climb, die, climb again.', ['turns', 'runs', 'solo', 'brain', 'tight', 'short', 'flat']),
    o('Age of Empires II', 'Build an economy, raise an army, out-think a human.', ['realtime', 'multi', 'versus', 'big', 'long', 'grounded', 'past'])),
  q('stardew-darkest', DEFAULT_ASK,
    o('Stardew Valley', 'A farm, a town, a life that keeps going.', ['persistent', 'light', 'long', 'flat', 'simulation', 'present']),
    o('Darkest Dungeon', 'Heroes break. Some don’t come back.', ['runs', 'grim', 'turns', 'fantastic', 'flat', 'fantasy'])),
  q('vampire-breach', DEFAULT_ASK,
    o('Vampire Survivors', 'Move, dodge, watch the numbers go up.', ['reflex', 'realtime', 'runs', 'short', 'tight', 'small']),
    o('Into the Breach', 'Three mechs, an eight-by-eight grid, no luck to blame.', ['brain', 'turns', 'runs', 'short', 'tight', 'small'])),
  q('amongus-ittakestwo', DEFAULT_ASK,
    o('Among Us', 'Lie to your friends. Catch them lying.', ['multi', 'versus', 'light', 'short', 'small', 'tight']),
    o('It Takes Two', 'Two players, one story, built for the couch.', ['multi', 'coop', 'authored', 'light', 'deep', 'long'])),
  q('dwarf-celeste', DEFAULT_ASK,
    o('Dwarf Fortress', 'Simulate everything. Losing is fun.', ['simulation', 'emergent', 'big', 'persistent', 'long', 'brain', 'fantasy']),
    o('Celeste', 'One mountain, one jump, polished to a point.', ['tight', 'authored', 'small', 'reflex', 'flat', 'short'])),
  q('wordle-balatro', DEFAULT_ASK,
    o('Wordle', 'One puzzle a day, in the browser, shared as a screenshot.', ['browser', 'small', 'short', 'brain', 'solo', 'tight']),
    o('Balatro', 'A fifteen-dollar Steam run game you lose a week to.', ['steam', 'runs', 'long', 'brain', 'solo', 'small'])),
  q('disco-rimworld', DEFAULT_ASK,
    o('Disco Elysium', 'A story someone wrote, every line of it.', ['authored', 'brain', 'solo', 'grounded', 'grim', 'long']),
    o('RimWorld', 'A story the systems wrote, and nobody saw coming.', ['emergent', 'simulation', 'solo', 'persistent', 'long', 'scifi'])),
  q('kerbal-hades', DEFAULT_ASK,
    o('Kerbal Space Program', 'Real orbital mechanics. Real explosions.', ['grounded', 'simulation', 'deep', 'brain', 'persistent', 'scifi']),
    o('Hades', 'Greek myth, fast combat, death as a plot point.', ['fantastic', 'reflex', 'runs', 'authored', 'realtime', 'fantasy'])),
  q('minecraft-portal', DEFAULT_ASK,
    o('Minecraft', 'An endless world to shape, alone or with friends.', ['persistent', 'big', 'emergent', 'deep', 'long', 'multi', 'coop']),
    o('Portal', 'Three hours, one idea, no fat.', ['authored', 'small', 'tight', 'short', 'solo', 'deep'])),
  q('papers-overcooked', DEFAULT_ASK,
    o('Papers, Please', 'A border booth, a stamp, a moral weight.', ['solo', 'grim', 'grounded', 'brain', 'authored', 'flat', 'past']),
    o('Overcooked', 'Four cooks, one kitchen, everyone shouting.', ['multi', 'coop', 'light', 'reflex', 'realtime', 'short'])),
  q('rocket-civ', DEFAULT_ASK,
    o('Rocket League', 'Five-minute matches, a ten-year skill ceiling.', ['realtime', 'reflex', 'multi', 'versus', 'short', 'deep']),
    o('Civilization VI', 'One. More. Turn.', ['turns', 'brain', 'long', 'big', 'persistent', 'grounded', 'past'])),
  q('obradinn-factorio', DEFAULT_ASK,
    o('Return of the Obra Dinn', 'A mystery with one right answer.', ['authored', 'brain', 'solo', 'small', 'grounded', 'past']),
    o('Factorio', 'The factory must grow.', ['emergent', 'simulation', 'big', 'persistent', 'long', 'brain', 'scifi'])),
  q('hollow-tft', DEFAULT_ASK,
    o('Hollow Knight', 'A hand-drawn world you explore alone.', ['solo', 'authored', 'flat', 'persistent', 'fantastic', 'reflex', 'fantasy']),
    o('Teamfight Tactics', 'Eight players, auto-battles, a new meta every patch.', ['multi', 'versus', 'brain', 'short', 'runs', 'fantastic'])),
  q('ftl-masseffect', DEFAULT_ASK,
    o('FTL: Faster Than Light', 'A ship, a crew, a jump you probably won’t survive.', ['runs', 'emergent', 'small', 'short', 'solo', 'flat']),
    o('Mass Effect', 'A galaxy, a cast, and choices that carry over.', ['persistent', 'authored', 'big', 'long', 'deep', 'solo'])),
  q('valheim-cuphead', DEFAULT_ASK,
    o('Valheim', 'Viking survival you build with four friends over months.', ['multi', 'coop', 'persistent', 'deep', 'long', 'fantastic', 'simulation', 'past']),
    o('Cuphead', 'Boss fights, hand-drawn, brutally tight.', ['solo', 'flat', 'reflex', 'tight', 'short', 'authored'])),
  q('crusader-spelunky', DEFAULT_ASK,
    o('Crusader Kings III', 'Medieval dynasties and all their scheming.', ['grounded', 'simulation', 'emergent', 'big', 'long', 'persistent', 'past', 'brain']),
    o('Spelunky', 'Caves that kill you in a new way every time.', ['runs', 'reflex', 'tight', 'small', 'short', 'flat', 'realtime'])),
  q('frostpunk-crossing', DEFAULT_ASK,
    o('Frostpunk', 'Keep the city alive. Decide who freezes.', ['grim', 'brain', 'simulation', 'grounded', 'persistent', 'past']),
    o('Animal Crossing', 'Nobody dies. Tom Nook gets paid.', ['light', 'persistent', 'fantastic', 'long', 'present'])),
  q('inscryption-sf6', DEFAULT_ASK,
    o('Inscryption', 'A card game that is hiding something.', ['authored', 'runs', 'solo', 'grim', 'brain', 'turns']),
    o('Street Fighter 6', 'You, them, and frame data.', ['multi', 'versus', 'reflex', 'realtime', 'short', 'deep'])),
  q('phasmo-drg', 'Same crew, same four players, same forty minutes. Which?',
    o('Phasmophobia', 'Hunt a ghost with friends. Whisper.', ['grim', 'multi', 'coop', 'short', 'grounded']),
    o('Deep Rock Galactic', 'Rock and stone. Mine, shoot, laugh.', ['light', 'multi', 'coop', 'short', 'fantastic', 'scifi'])),
  q('masseffect-dragonage', 'Same studio, same bones. Which setting?',
    o('Mass Effect', 'Starships, aliens, a galaxy to save.', ['scifi', 'deep', 'authored']),
    o('Dragon Age: Origins', 'Swords, dragons, a kingdom to save.', ['fantasy', 'deep', 'authored'])),
  q('starfield-skyrim', 'Same studio again. Which world would you rather fill?',
    o('Starfield', 'A thousand planets and a jetpack.', ['scifi', 'big', 'persistent']),
    o('Skyrim', 'One province and a shout.', ['fantasy', 'big', 'persistent'])),
  q('reddead-gta', 'Same studio, same open world. When is it set?',
    o('Red Dead Redemption 2', 'Horses, outlaws, the last of the frontier.', ['past', 'grounded', 'authored', 'deep']),
    o('Grand Theft Auto V', 'Cars, heists, a city like ours.', ['present', 'grounded', 'authored', 'deep'])),
  q('pentiment-nitw', 'Two story games about a small town. Which era?',
    o('Pentiment', 'A 16th-century Bavarian abbey and a murder.', ['past', 'authored', 'brain', 'flat', 'grounded']),
    o('Night in the Woods', 'A rust-belt town, now, and the friends you left there.', ['present', 'authored', 'flat', 'grounded', 'light'])),
  q('agar-deadcells', 'How does someone first touch it?',
    o('Agar.io', 'A link you text someone. They’re playing in five seconds.', ['browser', 'multi', 'versus', 'realtime', 'short', 'small', 'reflex']),
    o('Dead Cells', 'A proper Steam release with a trailer and a price tag.', ['steam', 'solo', 'runs', 'reflex', 'flat', 'long'])),
  q('cookie-dome', 'Where does it live?',
    o('Cookie Clicker', 'Free, in a browser tab, open for a week.', ['browser', 'small', 'persistent', 'solo', 'tight']),
    o('Dome Keeper', 'Eighteen dollars on Steam, a run at a time.', ['steam', 'runs', 'small', 'solo', 'flat'])),
  q('snap-noita', 'Which screen?',
    o('Marvel Snap', 'Three-minute matches on your phone, in a queue.', ['phone', 'multi', 'versus', 'short', 'turns', 'brain']),
    o('Noita', 'Every pixel simulated, on a PC, with a keyboard.', ['desk', 'runs', 'solo', 'simulation', 'emergent', 'reflex'])),
  q('monument-outerwilds', 'Which screen, again?',
    o('Monument Valley', 'Ten minutes on the bus, turning a tower in your hand.', ['phone', 'small', 'short', 'brain', 'authored', 'light']),
    o('Outer Wilds', 'An evening at a desk, a solar system to understand.', ['desk', 'authored', 'brain', 'long', 'deep', 'scifi'])),
  q('months-years', 'A year from now, which would you rather be true?',
    o('We shipped small', 'Like Vampire Survivors’ first version: out in months, then grown in public.', ['small', 'short']),
    o('We’re deep in something big', 'Like Hollow Knight: years of work for one great release.', ['big', 'long'])),
];

// pole id -> axis, and which side of it.
export const POLES = (() => {
  const map = {};
  for (const ax of AXES) {
    map[ax.a.id] = { axis: ax.id, side: 'a', ...ax.a };
    map[ax.b.id] = { axis: ax.id, side: 'b', ...ax.b };
  }
  return map;
})();

export const byId = Object.fromEntries(QUESTIONS.map((x) => [x.id, x]));

// Sanity checks on the bank, for the tests: every tag is a pole, no side votes
// for both poles of one axis, and every axis gets at least two questions.
export function checkBank(questions = QUESTIONS, axes = AXES) {
  const problems = [];
  const poles = {};
  for (const ax of axes) { poles[ax.a.id] = ax.id; poles[ax.b.id] = ax.id; }
  const perAxis = Object.fromEntries(axes.map((ax) => [ax.id, 0]));
  const ids = new Set();
  for (const x of questions) {
    if (ids.has(x.id)) problems.push(`${x.id}: duplicate id`);
    ids.add(x.id);
    if (x.id.length > 40) problems.push(`${x.id}: id longer than 40`);
    const touched = new Set();
    for (const side of ['a', 'b']) {
      const seen = {};
      for (const t of x[side].tags) {
        if (!poles[t]) { problems.push(`${x.id}.${side}: unknown tag ${t}`); continue; }
        if (seen[poles[t]]) problems.push(`${x.id}.${side}: votes both ways on ${poles[t]}`);
        seen[poles[t]] = t;
        touched.add(poles[t]);
      }
      if (!x[side].tags.length) problems.push(`${x.id}.${side}: no tags`);
    }
    for (const ax of touched) perAxis[ax]++;
  }
  for (const [ax, n] of Object.entries(perAxis)) if (n < 2) problems.push(`axis ${ax}: only ${n} question(s)`);
  return problems;
}

// answers: { [questionId]: 'a' | 'b' }
export function complete(answers, questions = QUESTIONS) {
  return questions.every((x) => answers?.[x.id] === 'a' || answers?.[x.id] === 'b');
}

export function nextUnanswered(answers, questions = QUESTIONS) {
  return questions.findIndex((x) => answers?.[x.id] !== 'a' && answers?.[x.id] !== 'b');
}

// One person's votes per axis: { [axis]: { a, b, lean } }, lean in [-1, 1]
// (toward a is positive) or null with no votes.
export function profile(answers, questions = QUESTIONS, axes = AXES) {
  const out = Object.fromEntries(axes.map((ax) => [ax.id, { a: 0, b: 0, lean: null }]));
  for (const x of questions) {
    const pick = answers?.[x.id];
    if (pick !== 'a' && pick !== 'b') continue;
    for (const t of x[pick].tags) {
      const p = POLES[t];
      if (p) out[p.axis][p.side]++;
    }
  }
  for (const v of Object.values(out)) {
    const n = v.a + v.b;
    v.lean = n ? (v.a - v.b) / n : null;
  }
  return out;
}

// The picture for the whole crew.
//   people: [{ email, name }]
//   answersByEmail: { [email]: answers }
// Returns:
//   done        emails that have answered every question
//   waiting     names still to finish
//   questions   per question: who picked a, who picked b, and 'unanimous' | 'split' | 'lean' | 'open'
//   unanimous   questions everyone (who finished) agreed on
//   splits      questions that divided the room evenly
//   axes        per axis: each person's lean, the crew mean, and a verdict
//   shelf       games picked, most picked first
//   leaning     phrases for axes the crew clearly leans on
//   open        axes with no clear lean (for the launch meeting to settle)
export function crewResults(people, answersByEmail, questions = QUESTIONS, axes = AXES) {
  const done = people.filter((p) => complete(answersByEmail?.[p.email], questions));
  const waiting = people.filter((p) => !complete(answersByEmail?.[p.email], questions)).map((p) => p.name);
  const profiles = Object.fromEntries(done.map((p) => [p.email, profile(answersByEmail[p.email], questions, axes)]));

  const qs = questions.map((x) => {
    const a = done.filter((p) => answersByEmail[p.email][x.id] === 'a').map((p) => p.name);
    const b = done.filter((p) => answersByEmail[p.email][x.id] === 'b').map((p) => p.name);
    let verdict = 'open';
    if (done.length) {
      if (!a.length || !b.length) verdict = 'unanimous';
      else if (a.length === b.length) verdict = 'split';
      else verdict = 'lean';
    }
    return { id: x.id, ask: x.ask, a, b, verdict, winner: a.length > b.length ? 'a' : b.length > a.length ? 'b' : null };
  });

  const axesOut = axes.map((ax) => {
    const leans = done.map((p) => ({ name: p.name, email: p.email, lean: profiles[p.email][ax.id].lean }))
      .filter((l) => l.lean !== null);
    const mean = leans.length ? leans.reduce((s, l) => s + l.lean, 0) / leans.length : null;
    const towardA = leans.filter((l) => l.lean > 0).length;
    const towardB = leans.filter((l) => l.lean < 0).length;
    let verdict = 'open';
    if (mean !== null) {
      if (leans.length && (towardA === leans.length || towardB === leans.length) && Math.abs(mean) >= 0.2) verdict = 'agreed';
      else if (Math.abs(mean) >= 0.2) verdict = 'lean';
      else verdict = 'split';
    }
    return { id: ax.id, label: ax.label, a: ax.a, b: ax.b, leans, mean, verdict, side: mean === null ? null : mean > 0 ? 'a' : mean < 0 ? 'b' : null };
  });

  const shelfCount = {};
  for (const p of done) for (const x of questions) {
    const pick = answersByEmail[p.email][x.id];
    const g = x[pick].game;
    shelfCount[g] = (shelfCount[g] || 0) + 1;
  }
  const shelf = Object.entries(shelfCount).map(([game, picks]) => ({ game, picks }))
    .sort((p, r) => r.picks - p.picks || p.game.localeCompare(r.game));

  const leaning = axesOut.filter((a) => a.verdict !== 'open' && a.verdict !== 'split' && a.side)
    .map((a) => ({ axis: a.id, pole: a[a.side], strength: a.verdict }));
  const open = axesOut.filter((a) => a.verdict === 'split').map((a) => ({ axis: a.id, label: a.label, a: a.a, b: a.b }));

  return {
    done: done.map((p) => p.email),
    waiting,
    profiles,
    questions: qs,
    unanimous: qs.filter((x) => x.verdict === 'unanimous' && done.length > 1),
    splits: qs.filter((x) => x.verdict === 'split'),
    axes: axesOut,
    shelf,
    leaning,
    open,
  };
}

// One sentence from the leanings, for the top of the results page.
export function summary(results) {
  const strong = results.leaning.filter((l) => l.strength === 'agreed').map((l) => l.pole.phrase);
  const soft = results.leaning.filter((l) => l.strength === 'lean').map((l) => l.pole.phrase);
  const parts = [];
  if (strong.length) parts.push(`Everyone leans ${list(strong)}.`);
  if (soft.length) parts.push(`Most lean ${list(soft)}.`);
  if (results.open.length) parts.push(`Still open: ${list(results.open.map((o) => o.label.toLowerCase()))}.`);
  return parts.join(' ');
}

function list(items) {
  if (items.length <= 1) return items.join('');
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`;
}
