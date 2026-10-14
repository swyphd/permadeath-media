// The site's /api/marketing function, with Supabase stubbed out.
import { createRequire } from 'node:module';
import { suite, test, ok, eq } from '../test/harness.js';

const require = createRequire(import.meta.url);
const handler = require('../../api/marketing.js');

const jeff = {
  email: 'Owner@Example.com', email_confirmed_at: '2026-10-01T00:00:00Z',
  app_metadata: { provider: 'google', providers: ['google'] },
};

async function call({ method = 'GET', token = 'tok', user = jeff, env = { STATS_ADMIN_EMAILS: 'owner@example.com' } } = {}) {
  const calls = [];
  const realFetch = globalThis.fetch;
  const realEnv = { ...process.env };
  delete process.env.STATS_ADMIN_EMAILS; delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  Object.assign(process.env, env);
  globalThis.fetch = async (url, init = {}) => {
    calls.push({ url, init });
    return user ? { ok: true, status: 200, json: async () => user } : { ok: false, status: 401, json: async () => ({}) };
  };
  const realError = console.error; console.error = () => {};
  const res = { headers: {}, statusCode: 0, setHeader(k, v) { this.headers[k] = v; }, end(b) { this.body = b ? JSON.parse(b) : null; } };
  try {
    await handler({ method, headers: token ? { authorization: `Bearer ${token}` } : {} }, res);
  } finally {
    globalThis.fetch = realFetch; console.error = realError;
    for (const k of Object.keys(process.env)) if (!(k in realEnv)) delete process.env[k];
    Object.assign(process.env, realEnv);
  }
  return { res, calls };
}

suite('api/marketing', () => {
  test('an allowed Google sign-in gets the games, channels and platforms, without the service key', async () => {
    const { res } = await call();
    eq(res.statusCode, 200);
    eq(res.headers['Cache-Control'], 'no-store');
    eq(res.body.games.length, 5);
    ok(res.body.channels.some((c) => c.ref === 'galaxy-click') && res.body.channels.some((c) => c.ref === 'itch-io'));
    eq(res.body.platforms.map((p) => p.id).join(','), 'bluesky,x,reddit,instagram');
  });
  test('every game is one the events endpoint accepts', () => {
    const { GAMES } = require('../../api/events.js');
    ok(handler.GAMES.every((g) => GAMES.has(g.id)));
  });
  test('every channel tag is one the kit records', async () => {
    const { refFrom } = await import('../analytics.js');
    ok(handler.CHANNELS.every((c) => refFrom(`?ref=${c.ref}`) === c.ref));
  });
  test('no token, an expired one, a stranger, or a magic link stays out', async () => {
    eq((await call({ token: null })).res.statusCode, 401);
    eq((await call({ user: null })).res.statusCode, 401);
    eq((await call({ user: { ...jeff, email: 'stranger@example.com' } })).res.statusCode, 403);
    eq((await call({ user: { ...jeff, app_metadata: { provider: 'email' }, identities: [{ provider: 'email' }] } })).res.statusCode, 403);
  });
  test('without STATS_ADMIN_EMAILS nobody gets in', async () => {
    const { res, calls } = await call({ env: {} });
    eq(res.statusCode, 503);
    eq(calls.length, 0);
  });
  test('GET only', async () => {
    eq((await call({ method: 'POST' })).res.statusCode, 405);
  });
});
