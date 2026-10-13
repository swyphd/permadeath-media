// Copies the kit into a game that lives in its own repo and bundles its own code
// (Hedy Plant, Guild Rising, Union Up), so its build never reaches across repos:
//
//   node ../permadeath-media/kit/sync.mjs src/kit
//
// Re-run it to take a newer kit; the copied files say which commit they came from.
// Pages in this repo (Card Check, Hexagons, the homepage) don't need it: they
// import straight from /kit/ with <script type="module">.
import { cpSync, mkdirSync, readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const kit = dirname(fileURLToPath(import.meta.url));
const dest = process.argv[2];
if (!dest) { console.error('usage: node kit/sync.mjs <destination dir>'); process.exit(1); }

const SKIP = new Set(['tests', 'sync.mjs', 'README.md']);
let commit = 'unknown';
try { commit = execSync('git rev-parse --short HEAD', { cwd: kit, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); } catch {}

const out = resolve(dest);
const copied = [];
function walk(from, to) {
  mkdirSync(to, { recursive: true });
  for (const name of readdirSync(from)) {
    if (from === kit && SKIP.has(name)) continue;
    const src = join(from, name);
    const dst = join(to, name);
    if (statSync(src).isDirectory()) { walk(src, dst); continue; }
    if (name.endsWith('.js')) {
      writeFileSync(dst, `// Copied from swyphd/permadeath-media kit/ at ${commit}. Edit it there, then re-run kit/sync.mjs.\n${readFileSync(src, 'utf8')}`);
    } else cpSync(src, dst);
    copied.push(dst);
  }
}
walk(kit, out);
console.log(`kit ${commit} -> ${out} (${copied.length} files)`);
