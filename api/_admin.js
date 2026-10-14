// Who may open the studio's private pages (/stats/, /marketing/).
//
// The check lives on the server, not in the page: the page sends its Supabase
// access token, it goes to Supabase to learn who it belongs to, and the email
// must be in STATS_ADMIN_EMAILS with the sign-in coming from Google. The leading
// underscore keeps Vercel from serving this file as an endpoint of its own.
//
// Environment (Vercel > Project > Settings > Environment Variables):
//   STATS_ADMIN_EMAILS   comma-separated emails allowed in

const SUPABASE = 'https://kmxkuyloybrdtcdiiqwo.supabase.co';
const PUBLIC_KEY = 'sb_publishable_RI26gdJieUSoWA68DsfwwQ_qYte5CLj';
const TIMEOUT_MS = 15000;

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

// The whole gate. Answers the request itself and returns null when the caller
// isn't let in; otherwise returns the Supabase user.
//   401 no token, or Supabase doesn't recognise it
//   403 signed in, but not with Google as an allowed email
//   502 Supabase didn't answer
async function requireAdmin(req, res, label = 'admin') {
  const token = tokenOf(req);
  if (!token) { send(res, 401, { ok: false, error: 'Sign in first.' }); return null; }
  let user;
  try {
    user = await whoIs(token);
  } catch (err) {
    console.error(`${label}: auth check failed`, err && err.message);
    send(res, 502, { ok: false, error: 'Could not check the sign-in.' });
    return null;
  }
  if (!user) { send(res, 401, { ok: false, error: 'That sign-in has expired. Sign in again.' }); return null; }
  if (!allowed(user, admins())) { send(res, 403, { ok: false, error: 'This page is private.' }); return null; }
  return user;
}

module.exports = { SUPABASE, PUBLIC_KEY, send, fetchWithTimeout, admins, allowed, tokenOf, whoIs, requireAdmin };
