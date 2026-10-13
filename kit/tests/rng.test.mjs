import { suite, test, ok, eq, deepEq } from '../test/harness.js';
import { createRng, mulberry32, hashSeed, clamp } from '../rng.js';

suite('rng', () => {
  test('a seeded run matches Union Up\'s engine/rng.js number for number', () => {
    // seedRng(7) and seedRng(123456789) in union-up, first draws
    const a = createRng(7);
    deepEq([a.random(), a.random(), a.random()], [0.011704753153026104, 0.06195825757458806, 0.97690763277933]);
    const b = createRng(123456789);
    deepEq([b.random(), b.random()], [0.2577907438389957, 0.9707721115555614]);
  });
  test('agrees with the bare mulberry32', () => {
    const f = mulberry32(42), r = createRng(42);
    for (let i = 0; i < 100; i++) eq(r.random(), f());
  });
  test('same seed, same sequence; reseeding starts over', () => {
    const r = createRng('daily-2026-10-13');
    const first = Array.from({ length: 20 }, () => r.int(1000));
    r.seed('daily-2026-10-13');
    deepEq(Array.from({ length: 20 }, () => r.int(1000)), first);
  });
  test('string seeds hash stably and differ from each other', () => {
    eq(hashSeed('ABCDE'), hashSeed('ABCDE'));
    ok(hashSeed('ABCDE') !== hashSeed('ABCDF'));
    eq(hashSeed(7), 7);
  });
  test('unseeded is Math.random', () => {
    const r = createRng();
    eq(r.seeded(), false);
    const saved = Math.random;
    Math.random = () => 0.5;
    try { eq(r.random(), 0.5); } finally { Math.random = saved; }
  });
  test('state and restore carry a run mid-sequence (for saves)', () => {
    const r = createRng(9);
    r.random(); r.random();
    const s = r.state();
    const next = [r.random(), r.random()];
    const r2 = createRng().restore(s);
    deepEq([r2.random(), r2.random()], next);
  });
  test('helpers stay in range and shuffle keeps every item', () => {
    const r = createRng(3);
    for (let i = 0; i < 500; i++) {
      const n = r.int(6); ok(n >= 0 && n < 6 && Number.isInteger(n));
      const m = r.range(2, 4); ok(m >= 2 && m <= 4);
    }
    const list = [1, 2, 3, 4, 5, 6, 7, 8];
    const sh = r.shuffle(list);
    deepEq([...sh].sort((x, y) => x - y), list);
    deepEq(list, [1, 2, 3, 4, 5, 6, 7, 8]);
    ok(list.includes(r.pick(list)));
  });
  test('weighted picks follow the weights', () => {
    const r = createRng(11);
    let a = 0;
    for (let i = 0; i < 4000; i++) if (r.weighted([['a', 3], ['b', 1]]) === 'a') a++;
    ok(a > 2800 && a < 3200, `a picked ${a} of 4000`);
  });
  test('clamp', () => { eq(clamp(120), 100); eq(clamp(-3), 0); eq(clamp(5, 0, 3), 3); });
});
