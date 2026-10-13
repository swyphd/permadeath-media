// Tooltips for anything with a data-tip attribute: on mouse hover, on keyboard
// focus, and on a tap for touch screens (a tap shows the tip and still does
// whatever the tap does; the tip goes away on the next tap or after a few seconds).
// One floating element serves the whole page, so a re-render can't strand a tip.

export function mountTooltips(doc = document) {
  const tip = doc.createElement('div');
  tip.className = 'tip';
  tip.setAttribute('role', 'tooltip');
  tip.id = 'tip';
  doc.body.appendChild(tip);
  let cur = null;
  let timer = null;

  function place(el) {
    const r = el.getBoundingClientRect();
    const vw = doc.documentElement.clientWidth;
    const vh = doc.documentElement.clientHeight;
    tip.style.left = '0px';
    tip.style.top = '0px';
    const t = tip.getBoundingClientRect();
    let x = r.left + r.width / 2 - t.width / 2;
    x = Math.max(8, Math.min(x, vw - t.width - 8));
    let y = r.top - t.height - 8;
    if (y < 8) y = Math.min(r.bottom + 8, vh - t.height - 8);
    tip.style.left = Math.round(x + window.scrollX) + 'px';
    tip.style.top = Math.round(y + window.scrollY) + 'px';
  }
  function show(el) {
    const text = el.getAttribute('data-tip');
    if (!text) return;
    cur = el;
    tip.textContent = text;
    tip.classList.add('show');
    el.setAttribute('aria-describedby', 'tip');
    place(el);
  }
  function hide() {
    clearTimeout(timer);
    if (cur) cur.removeAttribute('aria-describedby');
    cur = null;
    tip.classList.remove('show');
  }
  const target = (e) => (e.target && e.target.closest ? e.target.closest('[data-tip]') : null);

  doc.addEventListener('pointerover', (e) => {
    if (e.pointerType !== 'mouse') return;
    const el = target(e);
    if (el && el !== cur) show(el);
  });
  doc.addEventListener('pointerout', (e) => {
    if (e.pointerType !== 'mouse' || !cur) return;
    const to = e.relatedTarget && e.relatedTarget.closest ? e.relatedTarget.closest('[data-tip]') : null;
    if (to !== cur) hide();
  });
  doc.addEventListener('pointerup', (e) => {
    if (e.pointerType === 'mouse') return;
    const el = target(e);
    if (!el || el === cur) { hide(); return; }
    show(el);
    clearTimeout(timer);
    timer = setTimeout(hide, 4000);
  });
  doc.addEventListener('focusin', (e) => { const el = target(e); if (el && el.matches(':focus-visible')) show(el); });
  doc.addEventListener('focusout', () => hide());
  doc.addEventListener('keydown', (e) => { if (e.key === 'Escape') hide(); });
  window.addEventListener('scroll', () => { if (cur) hide(); }, { passive: true });
  // The page redraws often; a tip whose element is gone goes with it.
  return { hide, refresh() { if (cur && !cur.isConnected) hide(); } };
}
