// The devlog's game filter (index page) and the playtester signup (every page).
(function () {
  // ---------- filter: ?game=hedy-plant shows that game's posts; the chips set it ----------
  const chips = document.querySelectorAll('.chip');
  if (chips.length) {
    const cards = document.querySelectorAll('#posts .post-card');
    const empty = document.getElementById('empty');
    const show = (game) => {
      let shown = 0;
      cards.forEach((c) => { const on = !game || c.dataset.game === game; c.hidden = !on; shown += on; });
      chips.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.game === game)));
      if (empty) empty.hidden = shown > 0;
    };
    chips.forEach((b) => b.addEventListener('click', () => {
      const game = b.dataset.game;
      const url = new URL(location.href);
      if (game) url.searchParams.set('game', game); else url.searchParams.delete('game');
      history.replaceState(null, '', url);
      show(game);
    }));
    show(new URLSearchParams(location.search).get('game') || '');
  }

  // ---------- signup: same call as the homepage, tagged ref=devlog unless the visitor came in with their own ----------
  const form = document.getElementById('signup-form');
  if (!form) return;
  const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
  const input = document.getElementById('signup-email');
  const button = form.querySelector('button');
  const msg = document.getElementById('signup-msg');

  function ref() {
    try {
      if (navigator.globalPrivacyControl === true || navigator.doNotTrack === '1' || localStorage.getItem('pm-analytics-off')) return undefined;
      const tag = (localStorage.getItem('pm-ref') || new URLSearchParams(location.search).get('ref') || 'devlog').trim().toLowerCase();
      return /^[a-z0-9][a-z0-9_-]{0,39}$/.test(tag) ? tag : undefined;
    } catch (e) { return undefined; }
  }
  function say(text, cls) {
    msg.textContent = text;
    msg.className = 'signup-msg mono' + (cls ? ' ' + cls : '');
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = input.value.trim().toLowerCase();
    if (!EMAIL_RE.test(email)) { say('That doesn\'t look like an email address.', 'err'); input.focus(); return; }
    if (form.elements.website.value) { say('You\'re on the list.', 'ok'); return; } // honeypot
    button.disabled = true;
    say('Filing…');
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source: 'site', tag: 'founding', ref: ref() }),
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      say('You\'re a founding playtester. Check ' + email + ' for a note from us; if it asks you to confirm, one click finishes it.', 'ok');
      form.reset();
    } catch (err) {
      say('Something went wrong. Try again in a minute.', 'err');
    } finally {
      button.disabled = false;
    }
  });
})();
