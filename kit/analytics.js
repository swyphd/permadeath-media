// Play analytics: what happens in runs, so the studio can say how games actually
// play (win rates, where people quit, which choices they make) instead of only
// describing the design.
//
//   const stats = createAnalytics({ game: 'hedy-plant', version: '2026-10-13' });
//   stats.runStart();                                   a new playthrough
//   stats.milestone('first_letter', { t: s.t });        progress points, in order
//   stats.choice('federation_terms', 'accept', { t });   a decision and what was picked
//   stats.runEnd('win', { t, ending: 'buyout' });       'win' | 'loss' | 'quit' (gave up from a menu)
//   stats.progress(() => ({ t: s.t, tier: s.tier }));   read when the tab closes mid-run
//   stats.runStart(props, { id });                     a new run with an id chosen up front
//
// Where a player came from: a link like /hedy-plant/?ref=galaxy-click tags the
// visit, and run_start / run_resume carry it as props.ref. The first tag this
// browser ever arrived with stays as props.first_ref, so a player who found the
// game on itch.io and came back from a bookmark still counts for itch.io.
// The /marketing/ page builds these links.
//
// A run that starts and never ends is a player who left; the last milestone
// before that is where they quit (see the read-outs in game-events.sql).
//
// Events are batched and posted to the site's /api/events (game_events table).
// No emails, names or IPs: a player is a random id the browser makes up. A
// browser with Do Not Track or Global Privacy Control sends nothing, and
// `optOut()` stops it for good on this device. Analytics never throws into the
// game and never blocks play.
import { SITE_ORIGIN } from './config.js';

export const EVENTS_URL = `${SITE_ORIGIN}/api/events`;
const PLAYER_KEY = 'pm-player';
const OPTOUT_KEY = 'pm-analytics-off';
const REF_KEY = 'pm-ref';
const REF_RE = /^[a-z0-9][a-z0-9_-]{0,39}$/;
const MAX_BATCH = 50;

const storage = () => { try { return globalThis.localStorage || null; } catch { return null; } };
const get = (k) => { try { return storage()?.getItem(k) ?? null; } catch { return null; } };
const set = (k, v) => { try { storage()?.setItem(k, v); } catch {} };

export function newId() {
  const c = globalThis.crypto;
  if (c?.randomUUID) return c.randomUUID();
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 12);
}

// The browser asked not to be tracked.
export function privacySignal(nav = globalThis.navigator) {
  if (!nav) return false;
  return nav.globalPrivacyControl === true || nav.doNotTrack === '1' || nav.doNotTrack === 'yes';
}

// The ?ref= tag in a query string, or null when there's none or it isn't a tag.
export function refFrom(search) {
  try {
    const r = new URLSearchParams(search || '').get('ref');
    const tag = r == null ? '' : r.trim().toLowerCase();
    return REF_RE.test(tag) ? tag : null;
  } catch { return null; }
}

// The tag to credit this browser's signups to: the first one it ever arrived
// with, else this visit's. Null when the browser asked not to be tracked or
// opted out, the same as the events themselves.
export function signupRef({ location: loc = globalThis.location, navigator: nav = globalThis.navigator } = {}) {
  if (get(OPTOUT_KEY) || privacySignal(nav)) return null;
  const first = get(REF_KEY);
  return first && REF_RE.test(first) ? first : refFrom(loc?.search);
}

export function createAnalytics({
  game, version = null, url = EVENTS_URL, flushEvery = 10000, batchSize = 20,
  fetch: fetchImpl = null, beacon = null, navigator: nav = globalThis.navigator,
  clock = () => Date.now(), enabled = true, location: loc = globalThis.location,
} = {}) {
  if (!game) throw new Error('createAnalytics needs a game');
  const doFetch = fetchImpl || ((...a) => globalThis.fetch(...a));
  const doBeacon = beacon || ((u, body) => (nav?.sendBeacon ? nav.sendBeacon(u, body) : false));

  let player = get(PLAYER_KEY);
  const on = () => enabled && !get(OPTOUT_KEY) && !privacySignal(nav);
  if (!player && on()) { player = newId(); set(PLAYER_KEY, player); }
  const ref = refFrom(loc?.search);
  if (ref && on() && !get(REF_KEY)) set(REF_KEY, ref);
  const refProps = () => {
    const first = get(REF_KEY);
    return { ...(ref ? { ref } : {}), ...(first ? { first_ref: first } : {}) };
  };
  const session = newId();
  let run = null;
  let runStartedAt = null;
  let queue = [];
  let timer = null;
  let readProgress = null;

  const base = () => ({ game, game_version: version, player, session, run });

  function track(name, props = {}) {
    if (!on()) return;
    try {
      if (!player) { player = newId(); set(PLAYER_KEY, player); }
      const t = props.t ?? (runStartedAt != null ? (clock() - runStartedAt) / 1000 : null);
      const { t: _drop, ...rest } = props;
      queue.push({ ...base(), name, props: rest, t });
      if (queue.length >= batchSize) flush();
      else if (!timer && flushEvery) timer = setTimeout(flush, flushEvery);
    } catch {}
  }

  async function flush() {
    if (timer) { clearTimeout(timer); timer = null; }
    if (!queue.length) return true;
    const events = queue.splice(0, MAX_BATCH);
    try {
      const res = await doFetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events }),
        keepalive: true,
      });
      if (queue.length) return flush();
      return !!res?.ok;
    } catch {
      return false; // dropped: analytics is best-effort and never retries forever
    }
  }

  // The tab is going away: record where the run stood and send by beacon, which
  // survives the page closing. text/plain keeps it a simple cross-origin request.
  // Fires on every hide (a tab switch too, since mobile browsers may never send
  // pagehide); session_end is recorded once per hide, and play after coming back
  // carries on in the same session.
  let ended = false;
  function leave() {
    if (!on()) return;
    if (!ended) {
      ended = true;
      track('session_end', run ? { ...(safeProgress() || {}), mid_run: true } : {});
    }
    if (timer) { clearTimeout(timer); timer = null; }
    while (queue.length) {
      const events = queue.splice(0, MAX_BATCH);
      const body = JSON.stringify({ events });
      let sent = false;
      try { sent = doBeacon(url, body); } catch {}
      if (!sent) { try { doFetch(url, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body, keepalive: true }).catch(() => {}); } catch {} }
    }
  }
  function safeProgress() { try { return readProgress ? readProgress() : null; } catch { return null; } }

  const win = typeof window !== 'undefined' ? window : null;
  const onHide = () => { if (win.document?.visibilityState === 'hidden') leave(); else ended = false; };
  win?.addEventListener?.('pagehide', leave);
  win?.document?.addEventListener?.('visibilitychange', onHide);

  const api = {
    game,
    get player() { return player; },
    session,
    get run() { return run; },
    ref,
    get enabled() { return on(); },
    track,
    // A resumed save keeps its run id: pass it back as `resume` (store stats.run in the save).
    // A shared game (an online table) can name a new run's id up front with `id`, so
    // every device that later resumes it reports into the same run.
    runStart(props = {}, { resume = null, id = null } = {}) {
      run = resume || id || newId();
      runStartedAt = clock() - (props.t ?? 0) * 1000;
      track(resume ? 'run_resume' : 'run_start', { ...refProps(), ...props });
      return run;
    },
    runEnd(outcome, props = {}) {
      if (!run) return;
      track('run_end', { outcome, ...props });
      run = null;
      runStartedAt = null;
      flush();
    },
    milestone(name, props = {}) { track('milestone', { milestone: name, ...props }); },
    choice(id, option, props = {}) { track('choice', { choice: id, option: String(option), ...props }); },
    progress(fn) { readProgress = fn; },
    flush,
    leave,
    optOut() { set(OPTOUT_KEY, '1'); queue = []; },
    optIn() { try { storage()?.removeItem(OPTOUT_KEY); } catch {} },
    pending: () => queue.length,
    dispose() {
      if (timer) clearTimeout(timer);
      win?.removeEventListener?.('pagehide', leave);
      win?.document?.removeEventListener?.('visibilitychange', onHide);
    },
  };
  return api;
}
