// node card-check/tests/look.test.mjs
// The visual language holds together: every resource, Issue and symbol has an
// icon and a tooltip, and every Small Win names the resources it moves.
import { suite, test, ok, eq, report } from '../../kit/test/harness.js';
import { ISSUES, newGame, setupFlips, startRound } from '../engine.js';
import { ICONS, RESOURCES, ISSUE_ICONS, ISSUE_EFFECTS, SYMBOLS, issueResources } from '../look.js';

suite('card check: look', () => {
  test('every resource has an icon, a colour and a tooltip', () => {
    for (const [k, r] of Object.entries(RESOURCES)) {
      ok(ICONS[r.icon], `${k} icon`);
      ok(/^--/.test(r.color), `${k} colour`);
      ok(r.tip.length > 20, `${k} tip`);
    }
  });
  test('every worker issue and board symbol has an icon and a tooltip', () => {
    for (const k of ['Crunch', 'Pay', 'Layoffs', 'Credit', 'Harassment']) { ok(ICONS[k], k); ok(ISSUE_ICONS[k], k); }
    for (const k of Object.keys(SYMBOLS)) ok(ICONS[k], k);
    ok(ICONS.any);
  });
  test('every Small Win names the resources it moves, its own rule first', () => {
    for (const i of ISSUES) {
      const fx = ISSUE_EFFECTS[i.id];
      ok(fx && fx.length, i.id);
      ok(fx.every((e) => RESOURCES[e.r] && e.t), i.id);
      eq(issueResources(i.id)[0], fx[0].r);
      ok(issueResources(i.id).includes('fear'), `${i.id} lowers Fear`);
    }
  });
});

suite('card check: management notes', () => {
  test('each card management plays keeps what it did, in order', () => {
    const g = newGame([{ k: 'senior' }], 5);
    setupFlips(g); startRound(g);
    const slot = g.row[0];
    eq(slot.notes.length, slot.cards.length);
    slot.notes.forEach((n, k) => { eq(n.c, slot.cards[k]); ok(Array.isArray(n.t)); });
    ok(!('_notes' in g));
  });
});

report();
