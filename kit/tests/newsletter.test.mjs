import { suite, test, ok, eq, rejects } from '../test/harness.js';
import { installStorage, fakeFetch } from './fakes.mjs';
import { createNewsletter, mountSignupForm, validEmail, normalizeEmail } from '../newsletter.js';
import { SIGNUP_URL } from '../config.js';

suite('newsletter', () => {
  test('email checks match the endpoint', () => {
    ok(validEmail(' Jo@Example.com '));
    ok(!validEmail('jo@example'));
    ok(!validEmail('jo example.com'));
    eq(normalizeEmail(' Jo@Example.COM '), 'jo@example.com');
  });
  test('posts source and tag to /api/subscribe and remembers the address', async () => {
    const store = installStorage();
    const fetch = fakeFetch(200);
    const list = createNewsletter({ source: 'guild-rising', fetch });
    eq(list.listed(), false);
    eq(await list.subscribe(' Jo@Example.com ', { tag: 'founding' }), 'jo@example.com');
    eq(fetch.calls[0].url, SIGNUP_URL);
    eq(fetch.calls[0].init.method, 'POST');
    eq(JSON.stringify(fetch.calls[0].body), JSON.stringify({ email: 'jo@example.com', source: 'guild-rising', tag: 'founding' }));
    eq(store.getItem('guild-rising-newsletter'), 'jo@example.com');
    eq(list.listed(), true);
  });
  test('leaves the tag out when there is none', async () => {
    installStorage();
    const fetch = fakeFetch(200);
    await createNewsletter({ source: 'site', fetch }).subscribe('a@b.co');
    eq('tag' in fetch.calls[0].body, false);
  });
  test('keeps a game\'s existing done key', async () => {
    const store = installStorage();
    await createNewsletter({ source: 'card-check', doneKey: 'cc-newsletter', fetch: fakeFetch() }).subscribe('a@b.co');
    eq(store.getItem('cc-newsletter'), 'a@b.co');
  });
  test('a bad address never reaches the network', async () => {
    installStorage();
    const fetch = fakeFetch();
    await rejects(createNewsletter({ source: 'site', fetch }).subscribe('nope'), /doesn’t look like/);
    eq(fetch.calls.length, 0);
  });
  test('the honeypot says yes and sends nothing', async () => {
    const store = installStorage();
    const fetch = fakeFetch();
    await createNewsletter({ source: 'site', fetch }).subscribe('bot@spam.io', { website: 'http://x' });
    eq(fetch.calls.length, 0);
    eq(store.size, 0);
  });
  test('a server error rejects with a readable message and remembers nothing', async () => {
    const store = installStorage();
    await rejects(createNewsletter({ source: 'site', fetch: fakeFetch(502) }).subscribe('a@b.co'), /Try again/);
    await rejects(createNewsletter({ source: 'site', fetch: async () => { throw new Error('offline'); } }).subscribe('a@b.co'), /Try again/);
    eq(store.size, 0);
  });
  test('needs a source', () => {
    let threw = false;
    try { createNewsletter({}); } catch { threw = true; }
    ok(threw);
  });
});

// Enough of a <form> for mountSignupForm.
function fakeForm() {
  const handlers = {};
  const input = { value: '', disabled: false, focus() {} };
  const btn = { disabled: false };
  const msg = { textContent: '', className: 'msg' };
  const website = { value: '' };
  const form = {
    elements: { website },
    querySelector: (sel) => (sel.includes('email') ? input : sel.includes('button') ? btn : msg),
    addEventListener: (t, f) => { handlers[t] = f; },
    removeEventListener: (t) => { delete handlers[t]; },
    submit: () => handlers.submit({ preventDefault() {} }),
    handlers,
  };
  return { form, input, btn, msg, website };
}

suite('newsletter: mountSignupForm', () => {
  test('a good address subscribes and locks the form', async () => {
    installStorage();
    const { form, input, btn, msg } = fakeForm();
    const fetch = fakeFetch();
    mountSignupForm(form, { newsletter: createNewsletter({ source: 'hexagons', fetch }), tag: 'hexagons-account' });
    input.value = 'Me@Here.org';
    await form.submit();
    eq(fetch.calls[0].body.tag, 'hexagons-account');
    eq(msg.className, 'msg ok');
    ok(msg.textContent.includes('me@here.org'));
    ok(input.disabled && btn.disabled);
  });
  test('a bad address shows an error and sends nothing', async () => {
    installStorage();
    const { form, input, msg } = fakeForm();
    const fetch = fakeFetch();
    mountSignupForm(form, { newsletter: createNewsletter({ source: 'site', fetch }) });
    input.value = 'nope';
    await form.submit();
    eq(msg.className, 'msg err');
    eq(fetch.calls.length, 0);
  });
  test('a failure leaves the button usable', async () => {
    installStorage();
    const { form, input, btn, msg } = fakeForm();
    mountSignupForm(form, { newsletter: createNewsletter({ source: 'site', fetch: fakeFetch(500) }) });
    input.value = 'a@b.co';
    await form.submit();
    eq(msg.className, 'msg err');
    eq(btn.disabled, false);
  });
  test('a browser already on the list shows as done', () => {
    const store = installStorage();
    store.setItem('site-newsletter', 'old@x.io');
    const { form, input, msg } = fakeForm();
    mountSignupForm(form, { source: 'site' });
    eq(input.value, 'old@x.io');
    eq(input.disabled, true);
    eq(msg.className, 'msg ok');
  });
  test('detaching removes the handler', () => {
    installStorage();
    const { form } = fakeForm();
    const off = mountSignupForm(form, { source: 'site' });
    off();
    eq(form.handlers.submit, undefined);
  });
});
