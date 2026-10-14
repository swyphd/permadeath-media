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
// The check is here, on the server, not in the page: the token is sent to
// Supabase to learn who it belongs to, the email must be in STATS_ADMIN_EMAILS
// and the sign-in must be Google's, and only then is game_stats() called with
// the service-role key, which never leaves this function. game_events itself
// stays unreadable through the public key.
//
// Environment (Vercel > Project > Settings > Environment Variables):
//   STATS_ADMIN_EMAILS         comma-separated emails allowed in
//   SUPABASE_SERVICE_ROLE_KEY  the project's service-role (secret) key

const SUPABASE = 'https://kmxkuyloybrdtcdiiqwo.supabase.co';
const PUBLIC_KEY = 'sb_publishable_RI26gdJieUSoWA68DsfwwQ_qYte5CLj';
const TIMEOUT_MS = 15000;
const MAX_DAYS = 3650;

function send(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

async function fetchWithTimeout(url, init) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: ctl.signal });
  } finally {
    clearTimeout(timer);
  }
}

function admins(env = process.env) {
  return new Set(String(env.STATS_ADMIN_EMAILS || '')
    .split(',').map((e) => e.trim().toLowerCase()).filter(Boolean));
}

// `days` query value -> the window's start, or null for all time.
function since(days, now = Date.now()) {
  if (days === 'all') return null;
  const n = Math.round(Number(days));
  const d = Number.isFinite(n) && n >= 1 ? Math.min(n, MAX_DAYS) : 30;
  return new Date(now - d * 86400000).toISOString();
}

function tokenOf(req) {
  const h = (req.headers && (req.headers.authorization || req.headers.Authorization)) || '';
  const m = /^Bearer\s+(\S+)$/i.exec(h);
  return m ? m[1] : null;
}

// Signed in with Google, as a confirmed address on the list.
function allowed(user, list) {
  if (!user || !user.email || !list.has(String(user.email).toLowerCase())) return false;
  if (!user.email_confirmed_at && !user.confirmed_at) return false;
  const app = user.app_metadata || {};
  const providers = [app.provider, ...(app.providers || []), ...((user.identities || []).map((i) => i && i.provider))];
  return providers.includes('google');
}

async function whoIs(token) {
  const res = await fetchWithTimeout(`${SUPABASE}/auth/v1/user`, {
    headers: { apikey: PUBLIC_KEY, Authorization: `Bearer ${token}` },
  });
  if (res.status === 401 || res.status === 403) return null;
  if (!res.ok) throw new Error(`auth ${res.status}`);
  return res.json();
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

  const token = tokenOf(req);
  if (!token) return send(res, 401, { ok: false, error: 'Sign in first.' });

  let user;
  try {
    user = await whoIs(token);
  } catch (err) {
    console.error('stats: auth check failed', err && err.message);
    return send(res, 502, { ok: false, error: 'Could not check the sign-in.' });
  }
  if (!user) return send(res, 401, { ok: false, error: 'That sign-in has expired. Sign in again.' });
  if (!allowed(user, list)) return send(res, 403, { ok: false, error: 'This dashboard is private.' });

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
