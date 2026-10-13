// Stand-ins for the browser and Supabase, so the kit's tests run on plain node.
export function fakeStorage() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => { m.set(k, String(v)); },
    removeItem: (k) => { m.delete(k); },
    clear: () => m.clear(),
    get size() { return m.size; },
  };
}

export function installStorage() {
  const s = fakeStorage();
  globalThis.localStorage = s;
  return s;
}

// Records requests and answers with `status`.
export function fakeFetch(status = 200) {
  const calls = [];
  const f = async (url, init) => { calls.push({ url, init, body: JSON.parse(init.body) }); return { ok: status < 400, status }; };
  f.calls = calls;
  return f;
}

// Just enough of a Supabase client for the cloud save: auth with one session, and a
// game_saves table held in memory.
export function fakeSupabase({ user = null, row = null } = {}) {
  const table = row ? [{ ...row }] : [];
  const listeners = [];
  const calls = { upserts: 0, otp: [] };
  let session = user ? { user } : null;
  const sb = {
    table, calls,
    auth: {
      getSession: async () => ({ data: { session } }),
      onAuthStateChange: (f) => { listeners.push(f); return { data: { subscription: { unsubscribe() {} } } }; },
      signInWithOtp: async ({ email, options }) => { calls.otp.push({ email, options }); return { error: null }; },
      signOut: async () => { session = null; listeners.forEach((f) => f('SIGNED_OUT', null)); return { error: null }; },
    },
    from(name) {
      if (name !== 'game_saves') throw new Error(`unexpected table ${name}`);
      let filter = null;
      const q = {
        select() { return q; },
        eq(col, v) { filter = [col, v]; return q; },
        async maybeSingle() {
          const r = table.find((x) => x[filter[0]] === filter[1] && (!session || x.user_id === session.user.id));
          return { data: r ? { data: r.data, updated_at: r.updated_at } : null, error: null };
        },
        async upsert(rowIn) {
          calls.upserts++;
          const i = table.findIndex((x) => x.user_id === rowIn.user_id && x.game === rowIn.game);
          if (i >= 0) table[i] = rowIn; else table.push(rowIn);
          return { error: null };
        },
      };
      return q;
    },
  };
  return sb;
}
