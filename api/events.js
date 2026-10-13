// Play analytics for the games under permadeathmedia.com.
//
// POST /api/events  { events: [{ game, game_version?, player, session, run?, name, props?, t? }, ...] }
//   -> 202 { ok: true, kept }     stored (events that don't fit the shape are dropped)
//   -> 400 { ok: false, error }   nothing usable in the body
//   -> 502 { ok: false, error }   Supabase didn't take them
//
// The kit's analytics (kit/analytics.js) batches events and sends them here, with
// navigator.sendBeacon when the tab closes, so a body may arrive as text/plain.
// Rows go to the game_events table (game-events.sql), which the public key can
// insert into but not read. Nothing here identifies a person: `player` is a
// random id the browser made up.

const SUPABASE_URL = 'https://kmxkuyloybrdtcdiiqwo.supabase.co/rest/v1/game_events';
const SUPABASE_KEY = 'sb_publishable_RI26gdJieUSoWA68DsfwwQ_qYte5CLj';
const GAMES = new Set(['hexagons', 'card-check', 'guild-rising', 'union-up', 'hedy-plant']);
const NAME_RE = /^[a-z][a-z0-9_]{0,39}$/;
const ID_RE = /^[A-Za-z0-9_-]{1,64}$/;
const MAX_EVENTS = 50;
const MAX_PROPS = 2048; // characters of JSON per event
const TIMEOUT_MS = 8000;

function cors(res) {
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

function readBody(req) {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) return req.body;
  const raw = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : req.body;
  if (typeof raw === 'string') { try { return JSON.parse(raw); } catch (e) { return {}; } }
  return {};
}

// One event in, one row out, or null when it doesn't fit.
function clean(e) {
  if (!e || typeof e !== 'object') return null;
  if (!GAMES.has(e.game) || !NAME_RE.test(String(e.name || ''))) return null;
  if (!ID_RE.test(String(e.player || '')) || !ID_RE.test(String(e.session || ''))) return null;
  if (e.run != null && !ID_RE.test(String(e.run))) return null;
  let props = e.props && typeof e.props === 'object' && !Array.isArray(e.props) ? e.props : {};
  if (JSON.stringify(props).length > MAX_PROPS) props = { truncated: true };
  const t = Number(e.t);
  return {
    game: e.game,
    game_version: e.game_version != null ? String(e.game_version).slice(0, 40) : null,
    player: String(e.player),
    session: String(e.session),
    run: e.run != null ? String(e.run) : null,
    name: e.name,
    props,
    t: Number.isFinite(t) ? t : null,
  };
}

async function insert(rows) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(SUPABASE_URL, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(rows),
      signal: ctl.signal,
    });
    if (!res.ok) throw new Error(`Supabase ${res.status}: ${await res.text()}`);
  } finally {
    clearTimeout(timer);
  }
}

async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') { res.statusCode = 204; return res.end(); }
  if (req.method !== 'POST') return send(res, 405, { ok: false, error: 'POST only' });

  const body = readBody(req);
  const list = Array.isArray(body.events) ? body.events.slice(0, MAX_EVENTS) : [];
  const rows = list.map(clean).filter(Boolean);
  if (!rows.length) return send(res, 400, { ok: false, error: 'No usable events.' });

  try {
    await insert(rows);
  } catch (err) {
    console.error('events: insert failed', err && err.message);
    return send(res, 502, { ok: false, error: 'Could not store events.' });
  }
  return send(res, 202, { ok: true, kept: rows.length });
}

module.exports = handler;
module.exports.clean = clean;
module.exports.GAMES = GAMES;
