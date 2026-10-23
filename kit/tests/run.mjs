// node kit/tests/run.mjs  (or `npm test` in kit/)
import { report } from '../test/harness.js';

await import('./rng.test.mjs');
await import('./newsletter.test.mjs');
await import('./save.test.mjs');
await import('./tutorial.test.mjs');
await import('./sim.test.mjs');
await import('./analytics.test.mjs');
await import('./events-api.test.mjs');
await import('./stats-api.test.mjs');
await import('./subscribe-api.test.mjs');
await import('./marketing-api.test.mjs');
await import('./devlog.test.mjs');
await report();
