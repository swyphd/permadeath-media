// What the private marketing page at /marketing/ works from: the live games,
// the channels that get their own ?ref= tag, and the post platforms.
//
// GET /api/marketing
//   Authorization: Bearer <Supabase access token from a Google sign-in>
//   -> 200 { ok: true, email, site, games, channels, platforms }
//   -> 401 / 403 / 502          see api/_admin.js
//   -> 503 { ok: false, error } STATS_ADMIN_EMAILS isn't set
//
// Same gate as /stats/ (api/_admin.js), and only STATS_ADMIN_EMAILS is needed.
// A ref tag lands in run_start's props as `ref` (kit/analytics.js), so it shows
// up next to every run in game_events.

const { send, admins, requireAdmin } = require('./_admin.js');

const SITE = 'https://permadeathmedia.com';

// Live games, in the homepage's order. `path` is where the game is played.
// `recordsRef` is whether the build that's live reads ?ref= yet: games that
// import /kit/ from this site do; games that carry their own copy of the kit
// (Union Up, Guild Rising) do once that copy is re-synced.
const GAMES = [
  {
    id: 'hedy-plant', recordsRef: true, name: 'Hedy Plant', path: '/hedy-plant/', status: 'Playtest',
    pitch: 'An idle factory game. You run an electric car plant that sells every car to its parent company, and every time the plant gets better, the company rewrites the deal. Build the line, meet the other plants, and organize your way out.',
    short: 'An idle factory game where every upgrade gets your plant a worse deal, until you organize your way out.',
    tags: ['idlegame', 'indiegame', 'browsergame', 'labor'],
  },
  {
    id: 'card-check', recordsRef: true, name: 'Card Check', path: '/card-check/', status: 'Playtest',
    pitch: 'A cooperative card game of a union drive. Map the shop floor, hold one-on-ones, win small fights, and get to a majority before management\'s countermoves and your own burnout break the committee. Play online with friends, pass-and-play on one screen, or solo.',
    short: 'A co-op card game about winning a union drive before burnout breaks the committee.',
    tags: ['cardgame', 'coopgame', 'indiegame', 'union'],
  },
  {
    id: 'union-up', recordsRef: false, name: 'Union Up', path: '/union-up/', status: 'Live',
    pitch: 'A labor organizing strategy game set inside a game studio. Build solidarity, navigate management\'s countermoves, and turn a shop floor into a union.',
    short: 'A strategy game about organizing the game studio you work at.',
    tags: ['strategygame', 'indiegame', 'gamedev', 'union'],
  },
  {
    id: 'guild-rising', recordsRef: false, name: 'Guild Rising', path: '/guild-rising/', status: 'Live',
    pitch: 'A commons-building idle strategy game. Seasons turn, an assembly votes, crises hit, and the build tree grows around what you decide together.',
    short: 'An idle strategy game where an assembly votes on how the commons grows.',
    tags: ['idlegame', 'strategygame', 'indiegame', 'browsergame'],
  },
  {
    id: 'hexagons', recordsRef: true, name: 'Hexagons', path: '/hexagons/', status: 'Live',
    pitch: 'A daily puzzle game. One board, one system, one chance to see how it fits together. New puzzle every day.',
    short: 'A daily puzzle: one board, one system, a new one every day.',
    tags: ['puzzle', 'dailypuzzle', 'indiegame', 'browsergame'],
  },
];

// Where a link gets posted. `ref` is the tag; keep it lowercase with dashes.
const CHANNELS = [
  { ref: 'galaxy-click', name: 'Galaxy.click', kind: 'listing' },
  { ref: 'itch-io', name: 'itch.io', kind: 'listing' },
  { ref: 'bluesky', name: 'Bluesky', kind: 'social' },
  { ref: 'x', name: 'X', kind: 'social' },
  { ref: 'reddit', name: 'Reddit', kind: 'social' },
  { ref: 'instagram', name: 'Instagram', kind: 'social' },
];

// Post limits, in characters as each platform counts them.
//   Bluesky: 300 graphemes. X: 280, any link counts as 23. Reddit: title 300,
//   text post body 40,000. Instagram: caption 2,200, at most 30 hashtags, and
//   links in a caption aren't clickable (the link goes in the bio).
const PLATFORMS = [
  { id: 'bluesky', name: 'Bluesky', ref: 'bluesky', limit: 300, count: 'graphemes' },
  { id: 'x', name: 'X', ref: 'x', limit: 280, count: 'x', linkLength: 23 },
  { id: 'reddit', name: 'Reddit', ref: 'reddit', titleLimit: 300, limit: 40000, count: 'chars' },
  { id: 'instagram', name: 'Instagram', ref: 'instagram', limit: 2200, count: 'chars', maxHashtags: 30, linkInBio: true },
];

async function handler(req, res) {
  if (req.method !== 'GET') return send(res, 405, { ok: false, error: 'GET only' });
  if (!admins().size) {
    return send(res, 503, { ok: false, error: 'This page isn\'t set up yet: STATS_ADMIN_EMAILS must be set in Vercel.' });
  }
  const user = await requireAdmin(req, res, 'marketing');
  if (!user) return;
  return send(res, 200, { ok: true, email: user.email, site: SITE, games: GAMES, channels: CHANNELS, platforms: PLATFORMS });
}

module.exports = handler;
module.exports.GAMES = GAMES;
module.exports.CHANNELS = CHANNELS;
module.exports.PLATFORMS = PLATFORMS;
