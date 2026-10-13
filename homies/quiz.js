// The "this or that" quiz the crew answers before the launch meeting, and the
// scoring that turns four sets of answers into one picture of the game.
//
// Every question is a pair of kinds of game (a mechanic, a genre, a setting, a
// quality), each with two or three well-known examples, so a pick needs a taste,
// not a play history. Each side carries tags, one pole of an axis in AXES; a pick
// is a vote for each of its poles. A person's profile is their votes per axis; the crew's picture is
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
// A side is a kind of game (a mechanic, a genre, a quality), with two or three
// well-known examples so nobody needs to have played any one of them.
const o = (label, examples, tags) => ({ label, examples, tags });

export const DEFAULT_ASK = 'Would you rather build…';

export const QUESTIONS = [
  q('survival-setting', DEFAULT_ASK,
    o('Sci-fi survival', ['Space Engineers', 'Stationeers', 'Subnautica'], ['scifi', 'simulation', 'persistent', 'multi', 'coop', 'deep']),
    o('Fantasy survival', ['Valheim', 'Enshrouded', 'V Rising'], ['fantasy', 'simulation', 'persistent', 'multi', 'coop', 'deep'])),
  q('rts-tbs', DEFAULT_ASK,
    o('Real-time strategy', ['Age of Empires II', 'StarCraft II', 'They Are Billions'], ['realtime', 'brain', 'multi', 'versus', 'big', 'long']),
    o('Turn-based strategy', ['Civilization VI', 'Into the Breach', 'XCOM 2'], ['turns', 'brain', 'solo', 'big', 'long'])),
  q('deck-action-roguelike', DEFAULT_ASK,
    o('A deckbuilding roguelike', ['Slay the Spire', 'Balatro', 'Monster Train'], ['brain', 'turns', 'runs', 'solo', 'tight', 'flat', 'short']),
    o('An action roguelike', ['Hades', 'Dead Cells', 'Risk of Rain 2'], ['reflex', 'realtime', 'runs', 'solo', 'short'])),
  q('runs-world', 'Which loop?',
    o('Runs you lose and start over', ['Spelunky', 'FTL', 'Vampire Survivors'], ['runs', 'short', 'tight', 'small']),
    o('One world you keep building', ['Stardew Valley', 'Terraria', 'Minecraft'], ['persistent', 'long', 'simulation', 'big'])),
  q('coop-versus', 'If it’s multiplayer, which kind?',
    o('Co-op against the game', ['Deep Rock Galactic', 'Helldivers 2', 'Left 4 Dead 2'], ['coop', 'multi', 'light', 'realtime', 'short', 'deep']),
    o('Players against each other', ['Rocket League', 'Street Fighter 6', 'Counter-Strike 2'], ['versus', 'multi', 'reflex', 'realtime', 'short', 'deep'])),
  q('solo-multi', DEFAULT_ASK,
    o('A single-player game', ['Hollow Knight', 'Outer Wilds', 'Disco Elysium'], ['solo', 'authored', 'long']),
    o('A game you play with friends', ['Valheim', 'Among Us', 'Overcooked'], ['multi', 'emergent', 'short'])),
  q('deduction-couch', DEFAULT_ASK,
    o('Social deduction', ['Among Us', 'Werewolf', 'Secret Hitler'], ['versus', 'multi', 'light', 'short', 'tight', 'small', 'brain']),
    o('Chaotic couch co-op', ['Overcooked', 'It Takes Two', 'Moving Out'], ['coop', 'multi', 'light', 'short', 'reflex', 'realtime'])),
  q('simulation-rules', 'What kind of rules?',
    o('Deep simulation, lots of moving parts', ['Dwarf Fortress', 'RimWorld', 'Factorio'], ['simulation', 'emergent', 'big', 'long', 'persistent', 'brain']),
    o('A few tight rules, polished', ['Chess', 'Tetris', 'Baba Is You'], ['tight', 'small', 'short', 'brain', 'flat'])),
  q('authored-emergent', 'Where does the story come from?',
    o('Written, with a cast and an ending', ['Disco Elysium', 'Mass Effect', 'The Last of Us'], ['authored', 'solo', 'long', 'big']),
    o('From the systems, different every time', ['RimWorld', 'Crusader Kings III', 'Dwarf Fortress'], ['emergent', 'simulation', 'persistent', 'long'])),
  q('grim-light', 'Which tone?',
    o('Grim, heavy, consequences', ['Darkest Dungeon', 'Frostpunk', 'Papers, Please'], ['grim', 'brain']),
    o('Light, warm, funny', ['Animal Crossing', 'Untitled Goose Game', 'A Short Hike'], ['light', 'small'])),
  q('grounded-fantastic', 'How real is the world?',
    o('Grounded, could almost happen', ['Project Zomboid', 'Kerbal Space Program', 'This War of Mine'], ['grounded', 'simulation', 'grim']),
    o('Fantastical, anything goes', ['Hades', 'Noita', 'Hollow Knight'], ['fantastic', 'reflex', 'runs'])),
  q('space-fantasy-rpg', 'Same bones, which setting?',
    o('Space opera', ['Mass Effect', 'Starfield', 'The Outer Worlds'], ['scifi', 'authored', 'big', 'deep']),
    o('High fantasy', ['Dragon Age: Origins', 'Skyrim', 'Baldur’s Gate 3'], ['fantasy', 'authored', 'big', 'deep'])),
  q('past-present', 'When is it set?',
    o('History', ['Crusader Kings III', 'Red Dead Redemption 2', 'Pentiment'], ['past', 'grounded']),
    o('Now, more or less', ['Grand Theft Auto V', 'Night in the Woods', 'Phasmophobia'], ['present', 'grounded'])),
  q('2d-3d', 'Which look?',
    o('2D, pixels or hand-drawn', ['Celeste', 'Hollow Knight', 'Stardew Valley'], ['flat', 'small']),
    o('3D, a camera in a space', ['Valheim', 'Portal', 'Outer Wilds'], ['deep', 'big'])),
  q('short-long', 'How long is one sitting?',
    o('Ten minutes, come back later', ['Wordle', 'Vampire Survivors', 'Rocket League'], ['short', 'small', 'phone']),
    o('An evening disappears', ['Civilization VI', 'Factorio', 'Baldur’s Gate 3'], ['long', 'big', 'desk'])),
  q('months-years', 'A year from now, which would you rather be true?',
    o('We shipped small, then grew it in public', ['Vampire Survivors’ first version', 'Wordle', 'Hexagons'], ['small', 'short', 'browser']),
    o('We’re deep in one big release', ['Hollow Knight', 'Stardew Valley', 'Hades'], ['big', 'long', 'steam'])),
  q('browser-steam', 'Where does it live?',
    o('Free, in the browser, a link you text', ['Agar.io', 'Cookie Clicker', 'Wordle'], ['browser', 'small', 'short', 'tight']),
    o('Paid, on Steam, with a trailer', ['Balatro', 'Dome Keeper', 'Dead Cells'], ['steam', 'runs', 'long'])),
  q('phone-desk', 'Which screen?',
    o('A phone, one thumb, in a queue', ['Marvel Snap', 'Monument Valley', 'Threes'], ['phone', 'short', 'small', 'brain', 'turns']),
    o('A desk, keyboard and mouse', ['Noita', 'Factorio', 'Counter-Strike 2'], ['desk', 'long', 'simulation', 'realtime'])),
  q('puzzle-platformer', DEFAULT_ASK,
    o('A puzzle game', ['Baba Is You', 'Return of the Obra Dinn', 'Portal'], ['brain', 'turns', 'authored', 'small', 'solo', 'tight']),
    o('An action platformer', ['Celeste', 'Cuphead', 'Super Meat Boy'], ['reflex', 'realtime', 'authored', 'small', 'solo', 'flat'])),
  q('survival-builder', DEFAULT_ASK,
    o('Survival: stay alive, scrape by', ['Project Zomboid', 'The Long Dark', 'Don’t Starve'], ['simulation', 'grim', 'realtime', 'persistent', 'grounded']),
    o('Builder: a base, a city, a factory', ['Factorio', 'Frostpunk', 'Cities: Skylines'], ['simulation', 'brain', 'persistent', 'big', 'long'])),
  q('boardgame-abstract', 'Should it feel like…',
    o('A board game night, online', ['Catan', 'Wingspan', 'Ticket to Ride'], ['turns', 'multi', 'versus', 'long', 'light', 'brain']),
    o('A fast abstract duel', ['Chess', 'Hive', 'Go'], ['turns', 'multi', 'versus', 'short', 'tight', 'brain'])),
  q('autobattler-fighter', 'Head to head, which kind?',
    o('An autobattler: build, then watch it fight', ['Teamfight Tactics', 'Super Auto Pets', 'Backpack Battles'], ['brain', 'turns', 'runs', 'versus', 'multi', 'short']),
    o('A fighting game: you, them, frame data', ['Street Fighter 6', 'Super Smash Bros.', 'Tekken 8'], ['reflex', 'realtime', 'versus', 'multi', 'short'])),
  q('metroidvania-openworld', DEFAULT_ASK,
    o('A metroidvania', ['Hollow Knight', 'Dead Cells', 'Metroid Dread'], ['flat', 'authored', 'solo', 'reflex', 'small']),
    o('An open world', ['Minecraft', 'Elden Ring', 'Breath of the Wild'], ['deep', 'big', 'emergent', 'long', 'persistent'])),
  q('horror-comedy', 'Same four friends, same forty minutes. Which?',
    o('Horror: whisper, hide, run', ['Phasmophobia', 'Lethal Company', 'Dead by Daylight'], ['grim', 'multi', 'coop', 'short', 'deep']),
    o('Comedy: shout, laugh, fail together', ['Deep Rock Galactic', 'Untitled Goose Game', 'Overcooked'], ['light', 'multi', 'coop', 'short'])),
  q('daily-runs', DEFAULT_ASK,
    o('A daily puzzle everyone shares', ['Wordle', 'Connections', 'Hexagons'], ['browser', 'small', 'short', 'brain', 'tight', 'phone']),
    o('A run game you lose a week to', ['Balatro', 'Vampire Survivors', 'Slay the Spire'], ['runs', 'long', 'steam', 'small', 'desk'])),
  q('idle-twitch', DEFAULT_ASK,
    o('An idle game that ticks while you’re away', ['Cookie Clicker', 'Melvor Idle', 'Universal Paperclips'], ['persistent', 'browser', 'tight', 'phone', 'long']),
    o('A twitch game that punishes a slow thumb', ['Celeste', 'Super Meat Boy', 'Geometry Dash'], ['reflex', 'realtime', 'small', 'desk', 'short'])),
  q('narrative-sandbox', DEFAULT_ASK,
    o('A narrative adventure', ['Pentiment', 'Kentucky Route Zero', 'Night in the Woods'], ['authored', 'solo', 'flat', 'brain', 'grounded']),
    o('A sandbox with no plot', ['Minecraft', 'Garry’s Mod', 'Noita'], ['emergent', 'persistent', 'big', 'simulation'])),
  q('hardcore-cozy', DEFAULT_ASK,
    o('Hardcore: high stakes, real loss', ['Escape from Tarkov', 'Hunt: Showdown', 'EVE Online'], ['grim', 'versus', 'multi', 'grounded', 'realtime', 'long']),
    o('Cozy: nothing can hurt you', ['Stardew Valley', 'A Short Hike', 'Unpacking'], ['light', 'solo', 'persistent', 'small'])),
  q('medieval-nearfuture', 'Which era?',
    o('Medieval', ['Kingdom Come: Deliverance', 'Manor Lords', 'Crusader Kings III'], ['past', 'grounded', 'fantasy']),
    o('Near future', ['Cyberpunk 2077', 'Deus Ex', 'Watch Dogs'], ['present', 'scifi'])),
  q('tactics-shooter', 'When there’s a fight, how does it play?',
    o('Tactics on a grid', ['Into the Breach', 'XCOM 2', 'Fire Emblem'], ['turns', 'brain', 'tight', 'solo']),
    o('A shooter', ['Helldivers 2', 'Counter-Strike 2', 'DOOM'], ['realtime', 'reflex', 'multi', 'deep'])),
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

  // Reference games: every example on a side someone picked, counted per pick.
  const shelfCount = {};
  for (const p of done) for (const x of questions) {
    const pick = answersByEmail[p.email][x.id];
    for (const g of x[pick].examples) shelfCount[g] = (shelfCount[g] || 0) + 1;
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
