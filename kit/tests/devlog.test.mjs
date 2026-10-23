import fs from 'node:fs';
import { suite, test, ok, eq } from '../test/harness.js';
import { markdown, parsePost, build, GAMES } from '../../devlog/build.mjs';

suite('devlog', () => {
  test('markdown: headings start at h2, figures take their alt as the caption, lists and inline marks', () => {
    const html = markdown('# Big\n\nA **b** and *i* and [link](/x).\n\n![A caption](a.png)\n\n- one\n- two');
    ok(html.includes('<h2>Big</h2>'));
    ok(html.includes('<strong>b</strong>') && html.includes('<em>i</em>') && html.includes('<a href="/x">link</a>'));
    ok(html.includes('<figure><img src="a.png" alt="A caption" loading="lazy"><figcaption>A caption</figcaption></figure>'));
    ok(html.includes('<ul><li>one</li><li>two</li></ul>'));
  });
  test('post images are written absolute with their size, so they load without the trailing slash', () => {
    const html = markdown('![Cap](act3-congress.png)\n\nInline ![x](act3-congress.png) and ![y](https://e.com/a.png)', '/devlog/hedy-plant-act-3/');
    ok(html.includes('<img src="/devlog/hedy-plant-act-3/act3-congress.png" alt="Cap" width="1280" height="1400" loading="lazy">'));
    ok(html.includes('src="https://e.com/a.png"'));
    let threw = false;
    try { markdown('![x](missing.png)', '/devlog/hedy-plant-act-3/'); } catch { threw = true; }
    ok(threw);
  });
  test('numbered lists, Windows line endings, and stars inside words', () => {
    const html = markdown('1. one\r\n2. two\r\n\r\n- a\n- b\n\n2*3*4 is not italic');
    ok(html.includes('<ol><li>one</li><li>two</li></ol>') && html.includes('<ul><li>a</li><li>b</li></ul>'));
    ok(!html.includes('<em>'));
  });
  test('markdown escapes raw HTML', () => {
    ok(markdown('<script>x</script>').includes('&lt;script&gt;'));
  });
  test('a post needs a known game and a date', () => {
    let threw = false;
    try { parsePost('---\ntitle: T\ndate: 2026-10-19\ngame: nope\nsummary: S\n---\nbody', 'x'); } catch { threw = true; }
    ok(threw);
    eq(parsePost('---\ntitle: T\ndate: 2026-10-19\ngame: hedy-plant\nsummary: S\n---\nbody', 'x').game, 'hedy-plant');
    ok(GAMES['card-check'].play.includes('ref=devlog'));
  });
  test('the committed pages match post.md (run node devlog/build.mjs)', () => {
    for (const [file, html] of Object.entries(build())) eq(fs.readFileSync(file, 'utf8') === html, true, file);
  });
});
