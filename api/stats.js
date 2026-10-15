// The numbers behind the private stats dashboard at /stats/.
//
// GET /api/stats?days=30        (1-3650, or `all`)
//   Authorization: Bearer <Supabase access token from a Google sign-in>
//   -> 200 { ok: true, stats }   everything game_stats() returns (game-stats.sql),
//                                plus stats.signups: the mailing list (see readSignups)
//   -> 401 { ok: false, error }  no token, or Supabase doesn't recognise it
//   -> 403 { ok: false, error }  signed in, but not with Google as an allowed email
//   -> 503 { ok: false, error }  the environment variables aren't set
//   -> 502 { ok: false, error }  Supabase didn't answer
//
// The sign-in check is api/_admin.js, shared with /api/marketing: the token is
// sent to Supabase to learn who it belongs to, the email must be in
// STATS_ADMIN_EMAILS and the sign-in must be Google's, and only then is
// game_stats() called with the service-role key, which never leaves this
// function. game_events itself stays unreadable through the public key, and so
// does newsletter_signups: only counts leave this function, never an address.
//
// Environment (Vercel > Project > Settings > Environment Variables):
//   STATS_ADMIN_EMAILS         comma-separated emails allowed in
//   SUPABASE_SERVICE_ROLE_KEY  the project's service-role (secret) key

const { SUPABASE, send, fetchWithTimeout, admins, allowed, requireAdmin } = require('./_admin.js');

const MAX_DAYS = 3650;

// `days` query value -> the window's start, or null for all time.
function since(days, now = Date.now()) {
  if (days === 'all') return null;
  const n = Math.round(Number(days));
  const d = Number.isFinite(n) && n >= 1 ? Math.min(n, MAX_DAYS) : 30;
  return new Date(now - d * 86400000).toISOString();
}

async function readStats(from, key) {
  const res = await fetchWithTimeout(`${SUPABASE}/rest/v1/rpc/game_stats`, {
    method: 'POST',
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ since: from }),
  });
  if (!res.ok) throw new Error(`game_stats ${res.status}: ${await res.text()}`);
  return res.json();
}

// The mailing list, counted from the newsletter_signups backup table that
// api/subscribe.js writes next to Buttondown: one row per address (a second
// signup with the same address keeps the first row and its source). Only the
// source, ref tag and date are read, a page at a time, and only totals go back:
//   { total, in_range, sources: [{ source, total, in_range }], daily: [{ day, source, signups }],
//     refs: [{ ref, total, in_range }] }   ref '(none)' = no tag; refs is
//     left out until newsletter-signups.sql has added the ref column.
const SIGNUP_PAGE = 1000;

async function fetchSignupRows(key, columns = 'source,ref,created_at') {
  const rows = [];
  for (let from = 0; ; from += SIGNUP_PAGE) {
    const res = await fetchWithTimeout(`${SUPABASE}/rest/v1/newsletter_signups?select=${columns}&order=created_at.asc,id.asc`, {
      headers: { apikey: key, Authorization: `Bearer ${key}`, Range: `${from}-${from + SIGNUP_PAGE - 1}`, 'Range-Unit': 'items' },
    });
    // No ref column yet (newsletter-signups.sql not re-run): count without it.
    if (res.status === 400 && columns.includes('ref')) return fetchSignupRows(key, 'source,created_at');
    if (!res.ok) throw new Error(`newsletter_signups ${res.status}: ${await res.text()}`);
    const page = await res.json();
    rows.push(...page);
    if (page.length < SIGNUP_PAGE) return rows;
  }
}

function countSignups(rows, from) {
  const start = from ? Date.parse(from) : -Infinity;
  const sources = new Map();
  const daily = new Map();
  const refs = new Map();
  const hasRef = rows.some((r) => 'ref' in r);
  let inRange = 0;
  for (const r of rows) {
    if (hasRef) {
      const ref = r.ref || '(none)';
      const x = refs.get(ref) || { ref, total: 0, in_range: 0 };
      x.total += 1;
      if (Date.parse(r.created_at) >= start) x.in_range += 1;
      refs.set(ref, x);
    }
    const source = r.source || 'unknown';
    const s = sources.get(source) || { source, total: 0, in_range: 0 };
    s.total += 1;
    if (Date.parse(r.created_at) >= start) {
      s.in_range += 1;
      inRange += 1;
      const day = String(r.created_at).slice(0, 10);
      const k = `${day}|${source}`;
      const d = daily.get(k) || { day, source, signups: 0 };
      d.signups += 1;
      daily.set(k, d);
    }
    sources.set(source, s);
  }
  return {
    total: rows.length,
    in_range: inRange,
    sources: [...sources.values()].sort((a, b) => b.total - a.total || a.source.localeCompare(b.source)),
    daily: [...daily.values()].sort((a, b) => a.day.localeCompare(b.day) || a.source.localeCompare(b.source)),
    ...(hasRef || !rows.length ? { refs: [...refs.values()].sort((a, b) => b.total - a.total || a.ref.localeCompare(b.ref)) } : {}),
  };
}

async function readSignups(from, key) {
  return countSignups(await fetchSignupRows(key), from);
}

async function handler(req, res) {
  if (req.method !== 'GET') return send(res, 405, { ok: false, error: 'GET only' });

  const list = admins();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!list.size || !key) {
    return send(res, 503, { ok: false, error: 'The dashboard isn\'t set up yet: STATS_ADMIN_EMAILS and SUPABASE_SERVICE_ROLE_KEY must be set in Vercel.' });
  }

  const user = await requireAdmin(req, res, 'stats');
  if (!user) return;

  const query = req.query || Object.fromEntries(new URL(req.url || '/', 'http://x').searchParams);
  const from = since(query.days);
  // The list is read alongside the games; if it can't be, the games still show.
  const signups = readSignups(from, key).catch((err) => {
    console.error('stats: signups read failed', err && err.message);
    return { error: 'Could not count the mailing list.' };
  });
  try {
    const stats = await readStats(from, key);
    return send(res, 200, { ok: true, stats: { ...stats, signups: await signups } });
  } catch (err) {
    console.error('stats: read failed', err && err.message);
    return send(res, 502, { ok: false, error: 'Could not read the numbers. Has game-stats.sql been run?' });
  }
}

module.exports = handler;
module.exports.allowed = allowed;
module.exports.since = since;
module.exports.admins = admins;
module.exports.countSignups = countSignups;
