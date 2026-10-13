// The tutorial engine, from Guild Rising's Tutorial.jsx and Card Check's TUT /
// CALLOUTS, with the rendering left to the game (each game draws its guide card
// in its own look). This module only decides which step shows, when the game
// should pause, and remembers what the player has seen.
//
// A step:
//   { id, title, body,           what the guide card says (any extra fields pass through:
//                                target, spot, allow, pos ... are the game's to use)
//     when?(game),               it may show only while this holds (default: always)
//     done?(game),               an ACTION step: it waits for the player to do the thing
//                                and the game keeps running. Without `done` it is a READ
//                                step: the game pauses until "Got it" (next()).
//     next?: true }              forces a read step even with `done` (Card Check's style)
//
// Two modes:
//   'contextual' (Guild Rising, Card Check's callouts): the first unseen step whose
//       `when` holds is shown, so each mechanic is introduced the first time it matters.
//   'scripted' (Card Check's guided game): steps run in order; an action step advances
//       on its own as soon as `done` holds.
//
// Status: 'new' (the welcome is up: start() or skip()), 'active', 'skipped', 'done'.
// `autoStart: true` skips the welcome (callouts). Progress is kept in localStorage
// under `key`; pass `persist: false` to keep it in memory and store snapshot() in
// the game's own save instead (a scripted tutorial game, like Card Check's).
//
// Typical loop: every render or tick call `tutorial.observe(game)`, which returns the
// step to show (or null), and skip the game's tick while `tutorial.paused(game)`.

const storage = () => { try { return globalThis.localStorage || null; } catch { return null; } };

export const isActionStep = (s) => typeof s?.done === 'function' && !s.next;

export function createTutorial({
  key = null, version = 1, steps, mode = 'contextual', autoStart = false,
  persist = true, parts = null, hidden = () => false, initial = null,
} = {}) {
  if (!Array.isArray(steps) || !steps.length) throw new Error('createTutorial needs steps');
  if (mode !== 'contextual' && mode !== 'scripted') throw new Error(`unknown tutorial mode ${mode}`);
  const save = persist && key;
  const fresh = () => ({ v: version, status: autoStart ? 'active' : 'new', seen: [], index: 0 });

  function load() {
    if (initial) return { ...fresh(), ...initial, v: version };
    if (!save) return fresh();
    try {
      const raw = JSON.parse(storage()?.getItem(key) || 'null');
      if (raw && raw.v === version && Array.isArray(raw.seen)) return { ...fresh(), ...raw };
    } catch {}
    return fresh();
  }

  let state = load();
  let shown = null; // id of the step showing at the last observe()
  const listeners = new Set();
  const commit = (next) => {
    state = next;
    if (save) { try { storage()?.setItem(key, JSON.stringify(state)); } catch {} }
    listeners.forEach((f) => f(state));
  };
  const when = (s, g) => !s.when || !!s.when(g);
  const finish = () => commit({ ...state, status: 'done' });

  function markSeen(id) {
    if (state.seen.includes(id)) return;
    const seen = [...state.seen, id];
    commit({ ...state, seen, ...(mode === 'contextual' && steps.every((s) => seen.includes(s.id)) ? { status: 'done' } : {}) });
  }

  // The step that should show now, without changing anything.
  function current(game) {
    if (state.status !== 'active') return null;
    if (mode === 'scripted') return steps[state.index] || null;
    return steps.find((s) => !state.seen.includes(s.id) && when(s, game)) || null;
  }

  // Moves the tutorial along with the game and returns the step to show.
  function observe(game) {
    if (state.status !== 'active') { shown = null; return null; }
    if (mode === 'scripted') {
      // action steps the game has already satisfied fall through (a chain of them can)
      let guard = 0;
      while (guard++ < steps.length && state.index < steps.length) {
        const s = steps[state.index];
        if (!isActionStep(s) || !s.done(game)) break;
        commit({ ...state, index: state.index + 1, seen: [...state.seen, s.id] });
      }
      if (state.index >= steps.length) { finish(); shown = null; return null; }
      shown = steps[state.index].id;
      return steps[state.index];
    }
    // contextual: an action step that was showing is finished once the player did it,
    // or retired once it stops applying (the vote closed without them) so it never
    // comes back stale; a read step hidden by a modal waits and comes back.
    if (shown) {
      const prev = steps.find((s) => s.id === shown);
      if (prev && isActionStep(prev) && !state.seen.includes(prev.id)
        && (prev.done(game) || (!when(prev, game) && !hidden(game)))) markSeen(prev.id);
    }
    let step = current(game);
    while (step && isActionStep(step) && step.done(game)) { markSeen(step.id); step = current(game); }
    shown = step?.id || null;
    return step;
  }

  const api = {
    get status() { return state.status; },
    get seen() { return [...state.seen]; },
    get index() { return state.index; },
    steps,
    current,
    observe,
    // The game should not tick: the welcome is up, or a read step is showing.
    paused(game) {
      if (state.status === 'new') return true;
      const s = current(game);
      return !!s && !isActionStep(s);
    },
    start() { commit({ ...state, status: 'active' }); },
    skip() { commit({ ...state, status: 'skipped' }); },
    replay() { shown = null; commit({ ...fresh(), status: 'active' }); },
    // "Got it" on a read step, or "dismiss" on an action step.
    next(game) {
      const s = current(game);
      if (!s) return;
      if (mode === 'scripted') {
        const index = state.index + 1;
        commit({ ...state, index, seen: [...state.seen, s.id] });
        if (index >= steps.length) finish();
      } else markSeen(s.id);
    },
    markSeen,
    // Card Check's progress bar: which part this step is in, and where in that part.
    // parts: [{ name, from }] with `from` the index of the part's first step.
    progress() {
      if (!parts || mode !== 'scripted') return null;
      let i = 0;
      parts.forEach((p, k) => { if (state.index >= p.from) i = k; });
      const from = parts[i].from;
      const to = i + 1 < parts.length ? parts[i + 1].from : steps.length;
      return { part: i, parts: parts.length, name: parts[i].name, step: state.index - from + 1, of: to - from };
    },
    snapshot: () => ({ ...state, seen: [...state.seen] }),
    subscribe(f) { listeners.add(f); return () => listeners.delete(f); },
  };
  return api;
}
