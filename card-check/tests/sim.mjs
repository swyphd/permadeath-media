// node card-check/tests/sim.mjs [games]     SEED=7 replays a batch.
// The organizer bot plays full games through the real engine at each table size
// and tallies how they end: a pacing check, not a measure of a good player.
import { runMany, seedFromEnv } from '../../kit/test/sim.js';
import { createRng } from '../../kit/rng.js';
import { voteCount } from '../engine.js';
import { deal, playOut, organizerBot } from './bots.mjs';

const n = Number(process.argv[2]) || 200;
const rng = seedFromEnv(createRng(1));
for (const orgs of [['senior'], ['senior', 'tester'], ['senior', 'tester', 'animator'], ['senior', 'tester', 'animator', 'cm']]) {
  let game = 0;
  const signed = [];
  const { counts } = runMany(n, {
    rng, seed: process.env.SEED ?? null,
    init: () => deal(rng.int(1e9) + game++, orgs),
    step: () => {}, duration: 1,
    outcome: ({ state }) => {
      const g = playOut(state, organizerBot, rng);
      signed.push(voteCount(g));
      return g.result === 'win' ? 'win' : /^Fear/.test(g.why) ? 'loss: fear' : /burned out/.test(g.why) ? 'loss: burnout' : 'loss: vote';
    },
  });
  const avg = signed.reduce((a, b) => a + b, 0) / signed.length;
  console.log(`${orgs.length} organizer${orgs.length > 1 ? 's' : ''}:`, counts, `average signed at the end ${avg.toFixed(1)}`);
}
