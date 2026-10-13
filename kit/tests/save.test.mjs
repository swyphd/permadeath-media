import { suite, test, ok, eq, deepEq, rejects } from '../test/harness.js';
import { installStorage, fakeSupabase } from './fakes.mjs';
import { createLocalSave, createCloudSave } from '../save.js';

suite('save: local', () => {
  test('writes and loads a state', () => {
    installStorage();
    const save = createLocalSave({ key: 'g-save' });
    eq(save.load(), null);
    eq(save.savedAt, null);
    ok(save.write({ cars: 3 }));
    deepEq(save.load(), { cars: 3 });
    ok(save.lastWrite() > 0);
  });
  test('savedAt is the save that was there at page load', () => {
    const store = installStorage();
    store.setItem('g-save', JSON.stringify({ v: 1, at: 1234, data: {} }));
    const save = createLocalSave({ key: 'g-save' });
    eq(save.savedAt, 1234);
    save.write({});
    eq(save.savedAt, 1234);
  });
  test('an old version goes through migrate, or starts over without one', () => {
    const store = installStorage();
    store.setItem('g-save', JSON.stringify({ v: 1, at: 1, data: { n: 2 } }));
    eq(createLocalSave({ key: 'g-save', version: 2 }).load(), null);
    const save = createLocalSave({ key: 'g-save', version: 2, migrate: (d, from) => ({ ...d, from }) });
    deepEq(save.load(), { n: 2, from: 1 });
  });
  test('a bare pre-kit save reaches migrate as version 0', () => {
    const store = installStorage();
    store.setItem('hedy-plant-save-v2', JSON.stringify({ t: 600, cars: 40 }));
    const save = createLocalSave({ key: 'hedy-plant-save-v2', migrate: (d, from) => (from === 0 ? d : null) });
    deepEq(save.load(), { t: 600, cars: 40 });
  });
  test('garbage and a full or blocked storage fail quietly', () => {
    const store = installStorage();
    store.setItem('g-save', '{not json');
    const save = createLocalSave({ key: 'g-save' });
    eq(save.load(), null);
    store.setItem = () => { throw new Error('QuotaExceededError'); };
    eq(save.write({ a: 1 }), false);
    save.clear();
    eq(save.load(), null);
  });
});

const user = { id: 'u1', email: 'p@x.io' };

suite('save: cloud', () => {
  test('without Supabase it is unavailable and harmless', async () => {
    const cloud = createCloudSave({ game: 'g', getState: () => ({}), setState() {} });
    eq(cloud.available, false);
    await cloud.push();
    await rejects(cloud.sendLink('a@b.co'), /unavailable/);
  });
  test('signed out: offers a link and uploads nothing', async () => {
    const sb = fakeSupabase();
    const cloud = createCloudSave({ game: 'g', supabase: sb, getState: () => ({ t: 1 }), setState() {}, pushEvery: 0, redirectTo: 'https://permadeathmedia.com/g/' });
    await cloud.ready;
    eq(cloud.email, null);
    eq(await cloud.push(), false);
    await cloud.sendLink('p@x.io');
    eq(sb.calls.otp[0].options.emailRedirectTo, 'https://permadeathmedia.com/g/');
    cloud.dispose();
  });
  test('signed in with nothing in the cloud: uploads the local run', async () => {
    const sb = fakeSupabase({ user });
    const cloud = createCloudSave({ game: 'guild-rising', supabase: sb, getState: () => ({ t: 50 }), setState() {}, pushEvery: 0 });
    await cloud.ready;
    eq(cloud.email, 'p@x.io');
    eq(sb.table.length, 1);
    eq(sb.table[0].game, 'guild-rising');
    deepEq(sb.table[0].data, { t: 50 });
    ok(cloud.lastPush > 0);
    cloud.dispose();
  });
  test('ordinary load: a newer cloud save wins over an older local one', async () => {
    const sb = fakeSupabase({ user, row: { user_id: 'u1', game: 'g', data: { t: 10 }, updated_at: new Date(2000).toISOString() } });
    let got = null;
    const cloud = createCloudSave({ game: 'g', supabase: sb, savedAt: 1000, getState: () => ({ t: 99 }), setState: (d) => { got = d; }, pushEvery: 0 });
    await cloud.ready;
    deepEq(got, { t: 10 });
    ok(cloud.note.includes('cloud'));
    cloud.dispose();
  });
  test('ordinary load: a newer local save wins and is uploaded', async () => {
    const sb = fakeSupabase({ user, row: { user_id: 'u1', game: 'g', data: { t: 10 }, updated_at: new Date(1000).toISOString() } });
    let got = null;
    const cloud = createCloudSave({ game: 'g', supabase: sb, savedAt: 5000, getState: () => ({ t: 5 }), setState: (d) => { got = d; }, pushEvery: 0 });
    await cloud.ready;
    eq(got, null);
    deepEq(sb.table[0].data, { t: 5 });
    cloud.dispose();
  });
  test('right after a login link, the run with more progress wins', async () => {
    globalThis.window = { location: { hash: '#access_token=abc', search: '', origin: 'https://x', pathname: '/' } };
    try {
      const row = { user_id: 'u1', game: 'g', data: { t: 900 }, updated_at: new Date(1).toISOString() };
      let got = null;
      const cloud = createCloudSave({ game: 'g', supabase: fakeSupabase({ user, row }), savedAt: Date.now(), progress: (s) => s.t, getState: () => ({ t: 30 }), setState: (d) => { got = d; }, pushEvery: 0 });
      await cloud.ready;
      deepEq(got, { t: 900 }, 'the older but longer cloud run should win');
      cloud.dispose();
    } finally { delete globalThis.window; }
  });
  test('sign out uploads first, then forgets the player', async () => {
    const sb = fakeSupabase({ user });
    let state = { t: 1 };
    const cloud = createCloudSave({ game: 'g', supabase: sb, getState: () => state, setState() {}, pushEvery: 0 });
    await cloud.ready;
    state = { t: 2 };
    let heard = 0;
    cloud.on(() => heard++);
    await cloud.signOut();
    deepEq(sb.table[0].data, { t: 2 });
    eq(cloud.email, null);
    ok(heard > 0);
    cloud.dispose();
  });
});
