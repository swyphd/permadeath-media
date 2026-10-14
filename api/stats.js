// The numbers behind the private stats dashboard at /stats/.
//
// GET /api/stats?days=30        (1-3650, or `all`)
//   Authorization: Bearer <Supabase access token from a Google sign-in>
//   -> 200 { ok: true, stats }   everything game_stats() returns (game-stats.sql)
//   -> 401 { ok: false, error }  no token, or Supabase doesn't recognise it
//   -> 403 { ok: false, error }  signed in, but not with Google as an allowed email
//   -> 503 { ok: false, error }  the environment variables aren't set
//   -> 502 { ok: false, error }  Supabase didn't answer
//
// The sign-in check is api/_admin.js, shared with /api/marketing: the token is
// sent to Supabase to learn who it belongs to, the email must be in
// STATS_ADMIN_EMAILS and the sign-in must be Google's, and only then is
// game_stats() called with the service-role key, which never leaves this
// function. game_events itself stays unreadable through the public key.
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
  try {
    const stats = await readStats(since(query.days), key);
    return send(res, 200, { ok: true, stats });
  } catch (err) {
    console.error('stats: read failed', err && err.message);
    return send(res, 502, { ok: false, error: 'Could not read the numbers. Has game-stats.sql been run?' });
  }
}

module.exports = handler;
module.exports.allowed = allowed;
module.exports.since = since;
module.exports.admins = admins;
