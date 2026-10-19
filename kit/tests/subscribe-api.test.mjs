// The site's /api/subscribe function, with Buttondown and Supabase stubbed out.
import { createRequire } from 'node:module';
import { suite, test, eq, deepEq } from '../test/harness.js';

const require = createRequire(import.meta.url);
const handler = require('../../api/subscribe.js');

// supabase(row): the status the backup table answers for that row.
async function call(body, { supabase = () => 201 } = {}) {
  const sent = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    const row = JSON.parse(init.body);
    sent.push({ url, row });
    const status = supabase(row);
    return { ok: status < 300, status, text: async () => 'err' };
  };
  const realErr = console.error, realWarn = console.warn;
  console.error = () => {}; console.warn = () => {};
  const res = { headers: {}, statusCode: 0, setHeader(k, v) { this.headers[k] = v; }, end(b) { this.body = b ? JSON.parse(b) : null; } };
  try { await handler({ method: 'POST', body }, res); } finally { globalThis.fetch = realFetch; console.error = realErr; console.warn = realWarn; }
  return { res, rows: sent.filter((s) => s.url.includes('newsletter_signups')).map((s) => s.row) };
}

suite('api/subscribe', () => {
  test('keeps the ref tag on the backup row', async () => {
    const { res, rows } = await call({ email: 'a@b.co', source: 'hedy-plant', ref: 'itch-io' });
    eq(res.statusCode, 200);
    deepEq(rows, [{ email: 'a@b.co', source: 'hedy-plant', ref: 'itch-io' }]);
  });
  test('drops a ref that isn\'t a tag', async () => {
    const { rows } = await call({ email: 'a@b.co', source: 'site', ref: 'Not A Tag!' });
    deepEq(rows, [{ email: 'a@b.co', source: 'site' }]);
  });
  test('a table without the ref column still gets the address', async () => {
    const { res, rows } = await call({ email: 'a@b.co', source: 'site', ref: 'reddit' }, { supabase: (row) => ('ref' in row ? 400 : 201) });
    eq(res.statusCode, 200);
    eq(res.body.backup, 'saved');
    deepEq(rows, [{ email: 'a@b.co', source: 'site', ref: 'reddit' }, { email: 'a@b.co', source: 'site' }]);
  });
});
