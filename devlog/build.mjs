// node devlog/build.mjs
// The studio devlog: one feed for every game, so a Hedy Plant post also shows players the other games.
// Each post is a folder here holding post.md (frontmatter + a small Markdown subset) and its images. This writes
// the post's index.html next to them, devlog/index.html, devlog/feed.xml and the "From the devlog" block on the
// homepage (between the devlog markers in /index.html). Run it after adding or editing a post and commit the output.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.dirname(DIR);
const SITE = 'https://permadeathmedia.com';

// Every game a post can be about. `play` carries ?ref=devlog so the stats page counts players the devlog sends.
export const GAMES = {
  'hedy-plant': { name: 'Hedy Plant', play: '/hedy-plant/?ref=devlog', blurb: 'An idle factory game where every upgrade, the parent company pays you less. Organize.' },
  'card-check': { name: 'Card Check', play: '/card-check/?ref=devlog', blurb: 'A cooperative card game of a union drive. Get to a majority before the committee breaks.' },
  'union-up': { name: 'Union Up', play: '/union-up/?ref=devlog', blurb: 'A labor organizing strategy game set inside a game studio.' },
  'guild-rising': { name: 'Guild Rising', play: '/guild-rising/?ref=devlog', blurb: 'A commons-building idle strategy game.' },
  hexagons: { name: 'Hexagons', play: '/hexagons/?ref=devlog', blurb: 'A daily puzzle game. New puzzle every day.' },
  studio: { name: 'Studio', play: null, blurb: 'News from Permadeath Media.' },
};

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// ---------- Markdown (the subset the posts use) ----------
// # headings, paragraphs, - lists, a line that is only ![alt](src) becomes a figure with the alt as its caption,
// [links](url), **bold**, *italic*, `code`. Raw HTML is escaped, not passed through.
function inline(s) {
  return esc(s)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, '<img src="$2" alt="$1" loading="lazy">')
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\s][^*]*?)\*(?!\*)/g, '$1<em>$2</em>');
}

export function markdown(src) {
  const out = [];
  let para = [], list = null;
  const flush = () => {
    if (para.length) out.push(`<p>${inline(para.join(' '))}</p>`);
    para = [];
    if (list) out.push(`<ul>${list.map((li) => `<li>${inline(li)}</li>`).join('')}</ul>`);
    list = null;
  };
  for (const raw of src.split('\n')) {
    const line = raw.trimEnd();
    let m;
    if (!line.trim()) { flush(); continue; }
    if ((m = line.match(/^(#{1,4})\s+(.*)$/))) {
      flush();
      const level = Math.min(m[1].length + 1, 4); // the post title is the page's h1, so # in a post is an h2
      out.push(`<h${level}>${inline(m[2])}</h${level}>`);
    } else if ((m = line.match(/^!\[([^\]]*)\]\(([^)\s]+)\)$/))) {
      flush();
      out.push(`<figure><img src="${esc(m[2])}" alt="${esc(m[1])}" loading="lazy">${m[1] ? `<figcaption>${inline(m[1])}</figcaption>` : ''}</figure>`);
    } else if ((m = line.match(/^[-*]\s+(.*)$/))) {
      if (para.length) { out.push(`<p>${inline(para.join(' '))}</p>`); para = []; }
      (list ||= []).push(m[1]);
    } else if (list && /^\s+\S/.test(raw)) {
      list[list.length - 1] += ' ' + line.trim(); // a wrapped list item
    } else {
      if (list) flush();
      para.push(line.trim());
    }
  }
  flush();
  return out.join('\n');
}

export function parsePost(text, slug) {
  const m = text.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) throw new Error(`${slug}/post.md needs a --- frontmatter block`);
  const meta = {};
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^(\w+):\s*(.*)$/);
    if (kv) meta[kv[1]] = kv[2].trim();
  }
  for (const k of ['title', 'date', 'game', 'summary']) if (!meta[k]) throw new Error(`${slug}/post.md is missing ${k}`);
  if (!GAMES[meta.game]) throw new Error(`${slug}/post.md: unknown game "${meta.game}" (add it to GAMES)`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(meta.date)) throw new Error(`${slug}/post.md: date must be YYYY-MM-DD`);
  return { slug, ...meta, body: m[2] };
}

const fmtDate = (d) => new Date(d + 'T12:00:00Z').toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });

// ---------- page parts ----------
const FONTS = '<link rel="preconnect" href="https://fonts.googleapis.com">\n<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n<link href="https://fonts.googleapis.com/css2?family=Big+Shoulders+Stencil:wght@600;700;800&family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600&display=swap" rel="stylesheet">';

function head({ title, description, url, image }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta property="og:type" content="article">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${SITE}${url}">
${image ? `<meta property="og:image" content="${SITE}${image}">\n<meta name="twitter:card" content="summary_large_image">\n` : ''}<link rel="alternate" type="application/rss+xml" title="Permadeath Media devlog" href="/devlog/feed.xml">
${FONTS}
<link rel="stylesheet" href="/devlog/devlog.css">
</head>
<body>
<div class="hazard-rule"></div>
<div class="wrap">
<header class="top">
  <a class="brand stencil" href="/">PERMA<span class="hit">DEATH</span> MEDIA</a>
  <nav class="mono"><a href="/devlog/">Devlog</a><a href="/#operations">Games</a><a href="/press/">Press</a></nav>
</header>`;
}

const tag = (game) => `<a class="tag mono" href="/devlog/?game=${game}">${esc(GAMES[game].name)}</a>`;

function card(p) {
  const cover = p.cover ? `<img src="/devlog/${p.slug}/${esc(p.cover)}" alt="" loading="lazy">` : '';
  return `<article class="post-card" data-game="${p.game}">
  <a class="post-cover" href="/devlog/${p.slug}/" tabindex="-1" aria-hidden="true">${cover}</a>
  <div class="post-card-body">
    <div class="meta mono">${tag(p.game)}<time datetime="${p.date}">${fmtDate(p.date)}</time></div>
    <h2 class="post-card-title"><a href="/devlog/${p.slug}/">${esc(p.title)}</a></h2>
    <p class="mono">${esc(p.summary)}</p>
  </div>
</article>`;
}

const SIGNUP = `<section class="signup">
  <span class="section-label mono">Founding Playtesters</span>
  <p class="mono">New builds first, a vote on what we make next, and devlog posts like this one. Only when there's something to play or decide.</p>
  <form class="signup-form" id="signup-form" novalidate>
    <label class="sr-only" for="signup-email">Email address</label>
    <input id="signup-email" name="email" type="email" inputmode="email" autocomplete="email" placeholder="you@example.com" required>
    <input class="signup-hp" name="website" type="text" tabindex="-1" autocomplete="off" aria-hidden="true">
    <button class="signup-btn mono" type="submit">Become a playtester</button>
  </form>
  <p class="signup-msg mono" id="signup-msg" role="status" aria-live="polite"></p>
</section>`;

const FOOT = `<footer><p class="mono">© 2026 PERMADEATH MEDIA · <a href="/">HOME</a> · <a href="/devlog/feed.xml">RSS</a> · <a href="/press/">PRESS KIT</a></p></footer>
</div>
<script src="/devlog/devlog.js"></script>
</body>
</html>
`;

// The other games, for the shelf under every post: whatever this post isn't about.
function shelf(except) {
  const items = Object.entries(GAMES).filter(([id, g]) => g.play && id !== except).map(([id, g]) => `<a class="shelf-item" href="${g.play}">
    <span class="shelf-title stencil">${esc(g.name)}</span>
    <span class="shelf-desc mono">${esc(g.blurb)}</span>
    <span class="shelf-link mono">Play ${esc(g.name)}</span>
  </a>`);
  return `<section><span class="section-label mono">Also from the studio</span><div class="shelf">${items.join('\n')}</div></section>`;
}

function postPage(p, posts) {
  const g = GAMES[p.game];
  // More reading: other games' posts first (the cross-pollination), then this game's, newest first, three in all.
  const others = posts.filter((q) => q.slug !== p.slug);
  const more = [...others.filter((q) => q.game !== p.game), ...others.filter((q) => q.game === p.game)].slice(0, 3);
  const cta = g.play ? `<div class="cta"><a class="file-link mono" href="${g.play}">Play ${esc(g.name)}</a><span class="mono">Free in your browser, no account needed.</span></div>` : '';
  return `${head({ title: `${p.title} · ${g.name} devlog · Permadeath Media`, description: p.summary, url: `/devlog/${p.slug}/`, image: p.cover ? `/devlog/${p.slug}/${p.cover}` : null })}
<main class="post">
  <div class="meta mono">${tag(p.game)}<time datetime="${p.date}">${fmtDate(p.date)}</time></div>
  <h1 class="stencil">${esc(p.title)}</h1>
  <div class="prose">
${markdown(p.body)}
  </div>
  ${cta}
</main>
${more.length ? `<section><span class="section-label mono">More from the devlog</span><div class="post-list">${more.map(card).join('\n')}</div></section>` : ''}
${shelf(p.game)}
${SIGNUP}
${FOOT}`;
}

function indexPage(posts) {
  const used = [...new Set(posts.map((p) => p.game))];
  const chips = [`<button class="chip mono" data-game="" aria-pressed="true">All games</button>`, ...used.map((id) => `<button class="chip mono" data-game="${id}" aria-pressed="false">${esc(GAMES[id].name)}</button>`)];
  return `${head({ title: 'Devlog · Permadeath Media', description: 'What we changed in our games and why: balance numbers, playtest findings and new acts, from every Permadeath Media game.', url: '/devlog/', image: posts[0]?.cover ? `/devlog/${posts[0].slug}/${posts[0].cover}` : null })}
<main>
  <section class="intro">
    <h1 class="stencil">Dev<span class="hit">log</span></h1>
    <p class="mono">What we changed in our games and why: the numbers from playtests, what broke, and what's next. Every game posts here, so you'll see what the rest of the studio is building too.</p>
    <div class="chips" role="group" aria-label="Filter by game">${chips.join('')}</div>
  </section>
  <div class="post-list" id="posts">
${posts.map(card).join('\n')}
  </div>
  <p class="empty mono" id="empty" hidden>No posts for this game yet.</p>
</main>
${shelf(null)}
${SIGNUP}
${FOOT}`;
}

function feed(posts) {
  const items = posts.map((p) => `  <item>
    <title>${esc(p.title)}</title>
    <link>${SITE}/devlog/${p.slug}/</link>
    <guid>${SITE}/devlog/${p.slug}/</guid>
    <pubDate>${new Date(p.date + 'T12:00:00Z').toUTCString()}</pubDate>
    <category>${esc(GAMES[p.game].name)}</category>
    <description>${esc(p.summary)}</description>
  </item>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
  <title>Permadeath Media devlog</title>
  <link>${SITE}/devlog/</link>
  <description>What we changed in our games and why.</description>
${items}
</channel>
</rss>
`;
}

// The homepage's "From the devlog" block: the three newest posts.
function homeBlock(posts) {
  const items = posts.slice(0, 3).map((p) => `        <a class="shelf-item" href="/devlog/${p.slug}/">
          <span class="file-id mono">${esc(GAMES[p.game].name.toUpperCase())} · ${esc(fmtDate(p.date).toUpperCase())}</span>
          <span class="shelf-title">${esc(p.title)}</span>
          <span class="shelf-desc mono">${esc(p.summary)}</span>
          <span class="shelf-link mono">Read the post</span>
        </a>`);
  return `<!-- devlog:start (written by devlog/build.mjs) -->
    <section id="devlog">
      <span class="section-label mono">From the Devlog</span>

      <div class="shelf">
${items.join('\n')}
      </div>
      <p class="devlog-more mono"><a href="/devlog/">All devlog posts</a></p>
    </section>
    <!-- devlog:end -->`;
}

export function loadPosts() {
  return fs.readdirSync(DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() && fs.existsSync(path.join(DIR, d.name, 'post.md')))
    .map((d) => parsePost(fs.readFileSync(path.join(DIR, d.name, 'post.md'), 'utf8'), d.name))
    .sort((a, b) => b.date.localeCompare(a.date) || a.slug.localeCompare(b.slug));
}

// Everything the build writes, as { file: contents }.
export function build(posts = loadPosts()) {
  const files = {};
  for (const p of posts) files[path.join(DIR, p.slug, 'index.html')] = postPage(p, posts);
  files[path.join(DIR, 'index.html')] = indexPage(posts);
  files[path.join(DIR, 'feed.xml')] = feed(posts);
  const homeFile = path.join(ROOT, 'index.html');
  const home = fs.readFileSync(homeFile, 'utf8');
  const re = /<!-- devlog:start[\s\S]*?<!-- devlog:end -->/;
  if (!re.test(home)) throw new Error('index.html has no <!-- devlog:start --> ... <!-- devlog:end --> markers');
  files[homeFile] = home.replace(re, homeBlock(posts));
  return files;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const files = build();
  for (const [f, s] of Object.entries(files)) fs.writeFileSync(f, s);
  console.log(`devlog: ${Object.keys(files).length} files written`);
}
