// The site's /api/events function, with Supabase stubbed out.
import { createRequire } from 'node:module';
import { suite, test, ok, eq, deepEq } from '../test/harness.js';

const require = createRequire(import.meta.url);
const handler = require('../../api/events.js');

function call(method, body, supabaseStatus = 201) {
  const inserted = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => { inserted.push({ url, rows: JSON.parse(init.body), headers: init.headers }); return { ok: supabaseStatus < 300, status: supabaseStatus, text: async () => 'err' }; };
  const res = { headers: {}, statusCode: 0, setHeader(k, v) { this.headers[k] = v; }, end(b) { this.body = b ? JSON.parse(b) : null; } };
  return handler({ method, body }, res).then(() => { globalThis.fetch = realFetch; return { res, inserted }; });
}
const good = { game: 'hedy-plant', player: 'p-1', session: 's-1', run: 'r-1', name: 'milestone', props: { milestone: 'tier_2' }, t: 300 };

suite('api/events', () => {
  test('stores good events in game_events', async () => {
    const { res, inserted } = await call('POST', { events: [good, { ...good, name: 'run_end', props: { outcome: 'win' } }] });
    eq(res.statusCode, 202);
    eq(res.body.kept, 2);
    ok(inserted[0].url.endsWith('/rest/v1/game_events'));
    deepEq(inserted[0].rows[0], { game: 'hedy-plant', game_version: null, player: 'p-1', session: 's-1', run: 'r-1', name: 'milestone', props: { milestone: 'tier_2' }, t: 300 });
  });
  test('takes a text/plain beacon body', async () => {
    const { res } = await call('POST', JSON.stringify({ events: [good] }));
    eq(res.statusCode, 202);
  });
  test('drops events that don\'t fit: unknown game, bad name or ids', async () => {
    const { res, inserted } = await call('POST', { events: [good, { ...good, game: 'nope' }, { ...good, name: 'Bad Name' }, { ...good, player: 'x'.repeat(65) }, { ...good, run: 'a b' }, null] });
    eq(res.body.kept, 1);
    eq(inserted[0].rows.length, 1);
  });
  test('oversized props are replaced, not stored', async () => {
    const { inserted } = await call('POST', { events: [{ ...good, props: { blob: 'x'.repeat(5000) } }] });
    deepEq(inserted[0].rows[0].props, { truncated: true });
  });
  test('at most 50 events per request', async () => {
    const { inserted } = await call('POST', { events: Array.from({ length: 80 }, () => good) });
    eq(inserted[0].rows.length, 50);
  });
  test('nothing usable is a 400 and never reaches Supabase', async () => {
    const { res, inserted } = await call('POST', { events: [{ game: 'nope' }] });
    eq(res.statusCode, 400);
    eq(inserted.length, 0);
  });
  test('a Supabase failure is a 502', async () => {
    const realError = console.error; console.error = () => {};
    const { res } = await call('POST', { events: [good] }, 500);
    console.error = realError;
    eq(res.statusCode, 502);
  });
  test('answers CORS preflight and refuses GET', async () => {
    eq((await call('OPTIONS')).res.statusCode, 204);
    eq((await call('GET')).res.statusCode, 405);
    eq((await call('OPTIONS')).res.headers['Access-Control-Allow-Origin'], '*');
  });
});
