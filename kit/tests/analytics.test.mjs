import { suite, test, ok, eq, deepEq } from '../test/harness.js';
import { installStorage, fakeFetch } from './fakes.mjs';
import { createAnalytics, privacySignal, refFrom, signupRef, EVENTS_URL } from '../analytics.js';

const nav = (o = {}) => ({ doNotTrack: null, globalPrivacyControl: undefined, ...o });
const make = (o = {}) => {
  let now = 0;
  const fetch = fakeFetch(202);
  const beacons = [];
  const a = createAnalytics({
    game: 'hedy-plant', version: 'v1', fetch, navigator: nav(), clock: () => now, flushEvery: 0,
    beacon: (url, body) => { beacons.push({ url, body: JSON.parse(body) }); return true; }, ...o,
  });
  return { a, fetch, beacons, tick: (s) => { now += s * 1000; } };
};
const sent = (fetch) => fetch.calls.flatMap((c) => c.body.events);

suite('analytics', () => {
  test('a run sends start, milestones, choices and its end, with play time', async () => {
    installStorage();
    const { a, fetch, tick } = make();
    const run = a.runStart({ mode: 'normal' });
    tick(90); a.milestone('first_letter');
    tick(30); a.choice('federation_terms', 'accept');
    tick(60); a.runEnd('win', { ending: 'buyout' });
    await a.flush();
    const ev = sent(fetch);
    deepEq(ev.map((e) => e.name), ['run_start', 'milestone', 'choice', 'run_end']);
    eq(fetch.calls[0].url, EVENTS_URL);
    ok(ev.every((e) => e.game === 'hedy-plant' && e.game_version === 'v1' && e.run === run && e.player && e.session));
    deepEq(ev.map((e) => e.t), [0, 90, 120, 180]);
    deepEq(ev[1].props, { milestone: 'first_letter' });
    deepEq(ev[2].props, { choice: 'federation_terms', option: 'accept' });
    deepEq(ev[3].props, { outcome: 'win', ending: 'buyout' });
    eq(a.run, null);
  });
  test('the player id is random, kept on the device, and not personal', () => {
    const store = installStorage();
    const first = make().a.player;
    ok(/^[0-9a-f-]{36}$/.test(first));
    eq(make().a.player, first);
    eq(store.getItem('pm-player'), first);
  });
  test('each page load is a new session', () => {
    installStorage();
    ok(make().a.session !== make().a.session);
  });
  test('a resumed save keeps its run and reports run_resume', async () => {
    installStorage();
    const { a, fetch } = make();
    eq(a.runStart({ t: 600 }, { resume: 'run-123' }), 'run-123');
    await a.flush();
    eq(sent(fetch)[0].name, 'run_resume');
    eq(sent(fetch)[0].t, 600);
  });
  test('a shared game can name its new run up front', async () => {
    installStorage();
    const { a, fetch } = make();
    eq(a.runStart({}, { id: 'table-run' }), 'table-run');
    await a.flush();
    eq(sent(fetch)[0].name, 'run_start');
    eq(sent(fetch)[0].run, 'table-run');
  });
  test('batches: nothing goes out until a flush or a full batch', async () => {
    installStorage();
    const { a, fetch } = make({ batchSize: 3 });
    a.track('x'); a.track('y');
    eq(fetch.calls.length, 0);
    a.track('z');
    await Promise.resolve();
    eq(fetch.calls.length, 1);
    eq(a.pending(), 0);
  });
  test('closing the tab mid-run records where the run stood, by beacon', () => {
    installStorage();
    const { a, beacons, fetch } = make();
    a.runStart();
    a.progress(() => ({ t: 300, tier: 2 }));
    a.milestone('tier_2');
    a.leave();
    a.leave(); // a second hide before coming back adds nothing
    eq(fetch.calls.length, 0);
    const ev = beacons.flatMap((b) => b.body.events);
    deepEq(ev.map((e) => e.name), ['run_start', 'milestone', 'session_end']);
    deepEq(ev[2].props, { tier: 2, mid_run: true });
    eq(ev[2].t, 300);
  });
  test('falls back to fetch when the beacon is refused', () => {
    installStorage();
    const { a, fetch } = make({ beacon: () => false });
    a.track('x');
    a.leave();
    eq(fetch.calls.length, 1);
    eq(fetch.calls[0].init.headers['Content-Type'], 'text/plain');
  });
  test('Do Not Track or Global Privacy Control sends nothing and stores no id', async () => {
    for (const n of [nav({ doNotTrack: '1' }), nav({ globalPrivacyControl: true })]) {
      const store = installStorage();
      const { a, fetch, beacons } = make({ navigator: n });
      eq(a.enabled, false);
      a.runStart(); a.milestone('m'); a.runEnd('loss');
      await a.flush(); a.leave();
      eq(fetch.calls.length + beacons.length, 0);
      eq(store.getItem('pm-player'), null);
    }
    ok(privacySignal(nav({ doNotTrack: 'yes' })));
    ok(!privacySignal(nav()));
  });
  test('opting out stops it on this device and drops what was queued', async () => {
    installStorage();
    const { a, fetch } = make();
    a.track('x');
    a.optOut();
    a.track('y');
    await a.flush();
    eq(fetch.calls.length, 0);
    eq(make().a.enabled, false);
    a.optIn();
    eq(a.enabled, true);
  });
  test('a network failure never reaches the game', async () => {
    installStorage();
    const { a } = make({ fetch: async () => { throw new Error('offline'); } });
    a.track('x');
    eq(await a.flush(), false);
  });
  test('runEnd without a run is ignored', async () => {
    installStorage();
    const { a, fetch } = make();
    a.runEnd('win');
    await a.flush();
    eq(fetch.calls.length, 0);
  });
  test('a ?ref= tag rides along on run_start, and the first one sticks', async () => {
    installStorage();
    const first = make({ location: { search: '?ref=Galaxy-Click' } });
    eq(first.a.ref, 'galaxy-click');
    first.a.runStart({ mode: 'normal' });
    await first.a.flush();
    deepEq(sent(first.fetch)[0].props, { ref: 'galaxy-click', first_ref: 'galaxy-click', mode: 'normal' });

    const later = make({ location: { search: '?table=abc&ref=bluesky' } });
    later.a.runStart({}, { resume: 'r1' });
    await later.a.flush();
    deepEq(sent(later.fetch)[0].props, { ref: 'bluesky', first_ref: 'galaxy-click' });

    const bookmark = make({ location: { search: '' } });
    bookmark.a.runStart();
    bookmark.a.milestone('m');
    await bookmark.a.flush();
    const ev = sent(bookmark.fetch);
    deepEq(ev[0].props, { first_ref: 'galaxy-click' });
    deepEq(ev[1].props, { milestone: 'm' });
  });
  test('no tag, a bad tag, or tracking off records no ref', async () => {
    installStorage();
    const plain = make({ location: { search: '?ref=<script>' } });
    eq(plain.a.ref, null);
    plain.a.runStart();
    await plain.a.flush();
    deepEq(sent(plain.fetch)[0].props, {});
    const dnt = make({ location: { search: '?ref=itch-io' }, navigator: nav({ doNotTrack: '1' }) });
    eq(globalThis.localStorage.getItem('pm-ref'), null);
    eq(refFrom('?ref=itch-io'), 'itch-io');
    eq(refFrom('?ref='), null);
    eq(refFrom(undefined), null);
    eq(refFrom('?ref=' + 'a'.repeat(41)), null);
    dnt.a.dispose();
  });
  test('signupRef: the first tag, else this visit\'s, never under Do Not Track', () => {
    const store = installStorage();
    const nav = {};
    eq(signupRef({ location: { search: '?ref=reddit' }, navigator: nav }), 'reddit');
    eq(signupRef({ location: { search: '' }, navigator: nav }), null);
    store.setItem('pm-ref', 'itch-io');
    eq(signupRef({ location: { search: '?ref=reddit' }, navigator: nav }), 'itch-io');
    eq(signupRef({ location: { search: '' }, navigator: { doNotTrack: '1' } }), null);
    store.setItem('pm-analytics-off', '1');
    eq(signupRef({ location: { search: '' }, navigator: nav }), null);
  });
});
