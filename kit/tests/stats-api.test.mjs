// The site's /api/stats function, with Supabase stubbed out.
import { createRequire } from 'node:module';
import { suite, test, ok, eq } from '../test/harness.js';

const require = createRequire(import.meta.url);
const handler = require('../../api/stats.js');

const jeff = {
  email: 'Owner@Example.com', email_confirmed_at: '2026-10-01T00:00:00Z',
  app_metadata: { provider: 'google', providers: ['google'] },
};
const ENV = { STATS_ADMIN_EMAILS: 'someone@else.com, owner@example.com', SUPABASE_SERVICE_ROLE_KEY: 'service-key' };

// user: what /auth/v1/user answers (null = 401); env: process.env overrides.
// signups: the newsletter_signups rows Supabase holds; signupsStatus: its answer.
async function call({ method = 'GET', token = 'tok', user = jeff, env = ENV, query = { days: '30' }, statsStatus = 200, signups = [], signupsStatus = 200 } = {}) {
  const calls = [];
  const realFetch = globalThis.fetch;
  const realEnv = { ...process.env };
  delete process.env.STATS_ADMIN_EMAILS; delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  Object.assign(process.env, env);
  globalThis.fetch = async (url, init = {}) => {
    calls.push({ url, init });
    if (url.endsWith('/auth/v1/user')) {
      return user ? { ok: true, status: 200, json: async () => user } : { ok: false, status: 401, json: async () => ({}) };
    }
    if (url.includes('/rest/v1/newsletter_signups')) {
      const [from, to] = init.headers.Range.split('-').map(Number);
      return { ok: signupsStatus < 300, status: signupsStatus, json: async () => signups.slice(from, to + 1), text: async () => 'err' };
    }
    return { ok: statsStatus < 300, status: statsStatus, json: async () => ({ totals: { players: 3 } }), text: async () => 'err' };
  };
  const realError = console.error; console.error = () => {};
  const res = { headers: {}, statusCode: 0, setHeader(k, v) { this.headers[k] = v; }, end(b) { this.body = b ? JSON.parse(b) : null; } };
  try {
    await handler({ method, query, headers: token ? { authorization: `Bearer ${token}` } : {} }, res);
  } finally {
    globalThis.fetch = realFetch; console.error = realError;
    for (const k of Object.keys(process.env)) if (!(k in realEnv)) delete process.env[k];
    Object.assign(process.env, realEnv);
  }
  return { res, calls, rpc: calls.find((c) => c.url.endsWith('/rest/v1/rpc/game_stats')) };
}
const daysAgo = (d) => new Date(Date.now() - d * 86400000).toISOString();

suite('api/stats', () => {
  test('an allowed Google sign-in gets the numbers', async () => {
    const { res, calls, rpc } = await call();
    eq(res.statusCode, 200);
    eq(res.body.stats.totals.players, 3);
    eq(res.headers['Cache-Control'], 'no-store');
    eq(calls[0].init.headers.Authorization, 'Bearer tok');
    eq(rpc.init.headers.apikey, 'service-key');
    const since = JSON.parse(rpc.init.body).since;
    ok(Math.abs(Date.now() - 30 * 86400000 - Date.parse(since)) < 60000);
  });
  test('days=all reads everything', async () => {
    const { rpc } = await call({ query: { days: 'all' } });
    eq(JSON.parse(rpc.init.body).since, null);
  });
  test('no token is a 401 and never reads stats', async () => {
    const { res, calls } = await call({ token: null });
    eq(res.statusCode, 401);
    eq(calls.length, 0);
  });
  test('a token Supabase rejects is a 401', async () => {
    const { res, calls } = await call({ user: null });
    eq(res.statusCode, 401);
    eq(calls.length, 1);
  });
  test('someone not on the list is a 403', async () => {
    const { res, calls } = await call({ user: { ...jeff, email: 'stranger@example.com' } });
    eq(res.statusCode, 403);
    eq(calls.length, 1);
  });
  test('the right email without Google (a magic link) is a 403', async () => {
    const { res } = await call({ user: { ...jeff, app_metadata: { provider: 'email', providers: ['email'] }, identities: [{ provider: 'email' }] } });
    eq(res.statusCode, 403);
  });
  test('an unconfirmed address is a 403', async () => {
    const { res } = await call({ user: { ...jeff, email_confirmed_at: null } });
    eq(res.statusCode, 403);
  });
  test('without the environment variables nobody gets in', async () => {
    eq((await call({ env: { SUPABASE_SERVICE_ROLE_KEY: 'k' } })).res.statusCode, 503);
    eq((await call({ env: { STATS_ADMIN_EMAILS: 'owner@example.com' } })).res.statusCode, 503);
  });
  test('a failed read is a 502', async () => {
    eq((await call({ statsStatus: 404 })).res.statusCode, 502);
  });
  test('the mailing list comes back as counts, never addresses', async () => {
    const signups = [
      { source: 'site', created_at: daysAgo(60) },
      { source: 'hedy-plant', created_at: daysAgo(3) },
      { source: 'hedy-plant', created_at: daysAgo(3) },
      { source: null, created_at: daysAgo(1) },
    ];
    const { res, calls } = await call({ signups });
    const read = calls.find((c) => c.url.includes('/rest/v1/newsletter_signups'));
    ok(!read.url.includes('email'));
    eq(read.init.headers.apikey, 'service-key');
    const s = res.body.stats.signups;
    eq(s.total, 4);
    eq(s.in_range, 3);
    eq(JSON.stringify(s.sources.map((x) => [x.source, x.total, x.in_range])), JSON.stringify([['hedy-plant', 2, 2], ['site', 1, 0], ['unknown', 1, 1]]));
    eq(JSON.stringify(s.daily.map((d) => [d.source, d.signups])), JSON.stringify([['hedy-plant', 2], ['unknown', 1]]));
    ok(!JSON.stringify(s).includes('@'));
  });
  test('a long list is read a page at a time', async () => {
    const signups = Array.from({ length: 2500 }, (_, i) => ({ source: 'site', created_at: daysAgo(i % 90) }));
    const { res, calls } = await call({ signups, query: { days: 'all' } });
    eq(calls.filter((c) => c.url.includes('newsletter_signups')).length, 3);
    eq(res.body.stats.signups.total, 2500);
    eq(res.body.stats.signups.in_range, 2500);
  });
  test('if the list can\'t be read, the games still show', async () => {
    const { res } = await call({ signupsStatus: 401 });
    eq(res.statusCode, 200);
    eq(res.body.stats.totals.players, 3);
    ok(res.body.stats.signups.error);
  });
  test('GET only', async () => {
    eq((await call({ method: 'POST' })).res.statusCode, 405);
  });
  test('days is clamped', () => {
    const now = Date.parse('2026-10-14T00:00:00Z');
    eq(handler.since('7', now), '2026-10-07T00:00:00.000Z');
    eq(handler.since('nonsense', now), '2026-09-14T00:00:00.000Z');
    eq(handler.since('0', now), '2026-09-14T00:00:00.000Z');
    ok(Date.parse(handler.since('99999', now)) === now - 3650 * 86400000);
  });
});
