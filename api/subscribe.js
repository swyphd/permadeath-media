// Mailing list signup for permadeathmedia.com and the games under it.
//
// POST /api/subscribe  { email, source, website }
//   -> 200 { ok: true }            subscribed (or already was)
//   -> 400 { ok: false, error }    not a usable address
//   -> 502 { ok: false, error }    neither Buttondown nor the backup accepted it
//
// The address goes to Buttondown, which sends the welcome email and owns
// unsubscribes, and is also written to the newsletter_signups table in
// Supabase as a backup record. The Buttondown key lives in the
// BUTTONDOWN_API_KEY environment variable; without it the function still
// keeps the backup record and answers ok, so a missing key never breaks the
// forms. The Supabase key below is the public one every page already carries.

const BUTTONDOWN_URL = 'https://api.buttondown.com/v1/subscribers';
const SUPABASE_URL = 'https://kmxkuyloybrdtcdiiqwo.supabase.co/rest/v1/newsletter_signups';
const SUPABASE_KEY = 'sb_publishable_RI26gdJieUSoWA68DsfwwQ_qYte5CLj';
const SOURCES = new Set(['site', 'hexagons', 'card-check', 'guild-rising', 'union-up']);
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const TIMEOUT_MS = 8000;

function cors(res) {
  // The forms are on permadeathmedia.com itself; the open origin keeps the
  // games' preview deployments working too.
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Max-Age', '86400');
}

function send(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

async function fetchWithTimeout(url, init) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: ctl.signal });
  } finally {
    clearTimeout(t);
  }
}

// Returns 'subscribed', 'exists', 'blocked' (Buttondown's spam firewall said
// no), 'skipped' (no key) or throws.
async function addToButtondown(email, source, apiKey) {
  if (!apiKey) return 'skipped';
  const res = await fetchWithTimeout(BUTTONDOWN_URL, {
    method: 'POST',
    headers: { Authorization: `Token ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email_address: email, tags: [source], metadata: { source } }),
  });
  if (res.ok) return 'subscribed';
  let detail = null;
  try { detail = await res.json(); } catch (e) { /* non-JSON error body */ }
  const code = detail && (detail.code || detail.detail || '');
  if (res.status === 400 && /already_exists|already subscribed/i.test(String(code))) return 'exists';
  if (res.status === 400 && /subscriber_blocked|blocked/i.test(String(code))) return 'blocked';
  throw new Error(`Buttondown ${res.status}: ${JSON.stringify(detail)}`);
}

// Returns 'saved', 'exists' or throws. The table rejects malformed rows itself.
async function addToSupabase(email, source) {
  const res = await fetchWithTimeout(SUPABASE_URL, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({ email, source }),
  });
  if (res.ok) return 'saved';
  if (res.status === 409) return 'exists';
  throw new Error(`Supabase ${res.status}: ${await res.text()}`);
}

function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') { try { return JSON.parse(req.body); } catch (e) { return {}; } }
  return {};
}

module.exports = async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') { res.statusCode = 204; return res.end(); }
  if (req.method !== 'POST') return send(res, 405, { ok: false, error: 'POST only' });

  const body = readBody(req);
  const email = String(body.email || '').trim().toLowerCase();
  const source = SOURCES.has(body.source) ? body.source : 'unknown';

  // Honeypot: bots fill the hidden field, people cannot. Say yes, do nothing.
  if (body.website) return send(res, 200, { ok: true });
  if (!EMAIL_RE.test(email) || email.length > 254) {
    return send(res, 400, { ok: false, error: 'That doesn\'t look like an email address.' });
  }

  const [mailer, backup] = await Promise.allSettled([
    addToButtondown(email, source, process.env.BUTTONDOWN_API_KEY),
    addToSupabase(email, source),
  ]);
  const mailerOk = mailer.status === 'fulfilled';
  const backupOk = backup.status === 'fulfilled';
  if (!mailerOk) console.error('newsletter: Buttondown failed', mailer.reason && mailer.reason.message);
  if (!backupOk) console.error('newsletter: Supabase backup failed', backup.reason && backup.reason.message);

  if (mailerOk && mailer.value === 'skipped') console.warn('newsletter: BUTTONDOWN_API_KEY is not set; kept the backup record only');
  if (mailerOk && mailer.value === 'blocked') console.warn(`newsletter: Buttondown's firewall blocked ${email}; kept the backup record only`);
  if (mailerOk || backupOk) {
    return send(res, 200, { ok: true, mailer: mailerOk ? mailer.value : 'failed', backup: backupOk ? backup.value : 'failed' });
  }
  return send(res, 502, { ok: false, error: 'Something went wrong. Try again in a minute.' });
};
