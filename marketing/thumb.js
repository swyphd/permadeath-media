// Social thumbnails for the /marketing/ post builder: a game screenshot, cropped
// to a platform's size, with the studio's title treatment on top. Pure canvas
// 2D, so the page can download or copy the result as a PNG.
//
//   drawThumb(ctx, { w, h, img, logo, layout, zoom, fx, fy, title, status, headline, footer })
//
// `fx` / `fy` (0-1) say which part of the screenshot stays in frame when it's
// cropped; `zoom` (1+) crops in further.

export const FORMATS = [
  { id: 'landscape', name: 'Bluesky / X (16:9)', w: 1200, h: 675 },
  { id: 'card', name: 'Reddit / link card', w: 1200, h: 630 },
  { id: 'square', name: 'Instagram square', w: 1080, h: 1080 },
  { id: 'portrait', name: 'Instagram portrait (4:5)', w: 1080, h: 1350 },
  { id: 'story', name: 'Story / reel cover (9:16)', w: 1080, h: 1920 },
];

export const LAYOUTS = [
  { id: 'band', name: 'Title band' },
  { id: 'split', name: 'Split' },
  { id: 'tag', name: 'Screenshot + tag' },
];

const C = { soot: '#1A1A18', soot2: '#232320', yellow: '#F1C40F', oxide: '#C0392B', paper: '#E9E4D8', dim: '#B8B2A2' };
const STENCIL = '"Big Shoulders Stencil", "Arial Narrow", sans-serif';
const SANS = '"IBM Plex Sans", system-ui, sans-serif';
const MONO = '"IBM Plex Mono", ui-monospace, monospace';

// The screenshot fills (x, y, w, h), cropped around (fx, fy).
export function cover(ctx, img, x, y, w, h, { zoom = 1, fx = 0.5, fy = 0.5 } = {}) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  if (!iw || !ih) return;
  const scale = Math.max(w / iw, h / ih) * Math.max(1, zoom);
  const sw = w / scale;
  const sh = h / scale;
  const sx = (iw - sw) * clamp01(fx);
  const sy = (ih - sh) * clamp01(fy);
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

const clamp01 = (n) => Math.min(1, Math.max(0, Number(n) || 0));

// The site's yellow-and-soot hazard stripe.
function hazard(ctx, x, y, w, h) {
  ctx.save();
  ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  ctx.fillStyle = C.soot; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = C.yellow;
  const p = h * 2.4;
  for (let i = x - h; i < x + w + h; i += p * 2) {
    ctx.beginPath();
    ctx.moveTo(i, y + h); ctx.lineTo(i + h, y); ctx.lineTo(i + h + p, y); ctx.lineTo(i + p, y + h);
    ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}

// Word-wrapped lines that fit maxW, at most maxLines (the last one ellipsized).
export function wrap(ctx, text, maxW, maxLines) {
  const words = String(text || '').trim().split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  for (let i = 0; i < words.length; i++) {
    const next = line ? `${line} ${words[i]}` : words[i];
    if (ctx.measureText(next).width <= maxW || !line) { line = next; continue; }
    lines.push(line);
    line = words[i];
    if (lines.length === maxLines) { line = ''; break; }
  }
  if (line) lines.push(line);
  if (lines.length > maxLines) lines.length = maxLines;
  const used = lines.join(' ').split(/\s+/).length;
  if (used < words.length && lines.length) {
    let last = lines[lines.length - 1];
    while (last && ctx.measureText(`${last}…`).width > maxW) last = last.replace(/\s*\S+$/, '');
    lines[lines.length - 1] = `${last}…`;
  }
  return lines;
}

// The largest size (down to min) at which one line of text fits maxW.
function fitSize(ctx, text, font, size, maxW, min = 12) {
  let s = size;
  for (; s > min; s -= 2) {
    ctx.font = font(s);
    if (ctx.measureText(text).width <= maxW) break;
  }
  ctx.font = font(s);
  return s;
}

const stencil = (s) => `800 ${s}px ${STENCIL}`;
const sans = (s) => `600 ${s}px ${SANS}`;
const mono = (s) => `500 ${s}px ${MONO}`;

// A filled chip with mono caps, from its top-left corner. Returns its height.
function chip(ctx, text, x, y, u, { bg = C.yellow, fg = C.soot } = {}) {
  if (!text) return 0;
  const s = Math.round(u * 1.55);
  ctx.font = mono(s);
  const label = text.toUpperCase();
  const padX = u * 0.9;
  const hgt = s + u * 1.0;
  ctx.fillStyle = bg;
  ctx.fillRect(x, y, ctx.measureText(label).width + padX * 2, hgt);
  ctx.fillStyle = fg;
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x + padX, y + hgt / 2 + 1);
  ctx.textBaseline = 'alphabetic';
  return hgt;
}

// Title, headline and footer stacked upward from `bottom`, left-aligned at x.
function textBlock(ctx, { x, bottom, maxW, u, title, headline, footer, titleSize, headLines = 3 }) {
  let y = bottom;
  if (footer) {
    ctx.font = mono(Math.round(u * 1.5));
    ctx.fillStyle = C.dim;
    ctx.fillText(footer.toUpperCase(), x, y);
    y -= u * 3.2;
  }
  if (headline) {
    const hs = Math.round(u * 2.7);
    ctx.font = sans(hs);
    const lines = wrap(ctx, headline, maxW, headLines);
    ctx.fillStyle = C.paper;
    for (let i = lines.length - 1; i >= 0; i--) { ctx.fillText(lines[i], x, y); y -= hs * 1.25; }
    y -= u * 1.2;
  }
  const ts = fitSize(ctx, title.toUpperCase(), stencil, Math.round(titleSize), maxW);
  ctx.fillStyle = C.yellow;
  ctx.fillText(title.toUpperCase(), x, y);
  return y - ts * 0.85;
}

function drawLogo(ctx, logo, right, top, height) {
  if (!logo || !(logo.naturalWidth || logo.width)) return;
  const iw = logo.naturalWidth || logo.width;
  const ih = logo.naturalHeight || logo.height;
  const w = (iw / ih) * height;
  ctx.drawImage(logo, right - w, top, w, height);
}

export function drawThumb(ctx, o) {
  const { w, h, img, logo, layout = 'band', title = '', status = '', headline = '', footer = '' } = o;
  const crop = { zoom: o.zoom, fx: o.fx, fy: o.fy };
  const u = Math.min(w, h) / 60;
  const pad = u * 4;
  const stripe = Math.round(u * 1.1);
  ctx.save();
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = C.soot;
  ctx.fillRect(0, 0, w, h);
  ctx.textBaseline = 'alphabetic';

  if (layout === 'split') {
    const wide = w > h * 1.2;
    if (wide) {
      const pw = Math.round(w * 0.42);
      if (img) cover(ctx, img, pw, 0, w - pw, h, crop);
      ctx.fillStyle = C.yellow; ctx.fillRect(pw - u * 0.5, 0, u * 0.5, h);
      hazard(ctx, 0, 0, pw - u * 0.5, stripe);
      chip(ctx, status, pad, stripe + pad * 0.8, u);
      drawLogo(ctx, logo, pw - pad, h - pad - u * 3.4, u * 3.4);
      textBlock(ctx, { x: pad, bottom: h - pad - u * 5.5, maxW: pw - pad * 2, u, title, headline, footer, titleSize: u * 7.5, headLines: 4 });
    } else {
      const ih = Math.round(h * (h > w * 1.4 ? 0.62 : 0.56));
      if (img) cover(ctx, img, 0, 0, w, ih, crop);
      ctx.fillStyle = C.yellow; ctx.fillRect(0, ih, w, u * 0.5);
      hazard(ctx, 0, 0, w, stripe);
      chip(ctx, status, pad, stripe + pad * 0.6, u, { bg: C.soot, fg: C.yellow });
      drawLogo(ctx, logo, w - pad, h - pad - u * 3.4, u * 3.4);
      textBlock(ctx, { x: pad, bottom: h - pad, maxW: w - pad * 2 - (logo ? u * 9 : 0), u, title, headline, footer, titleSize: u * 7.5, headLines: 4 });
    }
  } else if (layout === 'tag') {
    if (img) cover(ctx, img, 0, 0, w, h, crop);
    const ts = u * 5.2;
    ctx.font = stencil(ts);
    const tw = Math.min(ctx.measureText(title.toUpperCase()).width, w - pad * 4);
    ctx.font = mono(Math.round(u * 1.5));
    const fw = footer ? ctx.measureText(footer.toUpperCase()).width : 0;
    const bw = Math.max(tw, fw) + pad * 1.4;
    const bh = ts * 0.9 + (footer ? u * 3.6 : 0) + pad * 1.1;
    const bx = pad;
    const by = h - pad - bh;
    ctx.fillStyle = C.soot; ctx.fillRect(bx, by, bw, bh);
    hazard(ctx, bx, by - stripe, bw, stripe);
    ctx.fillStyle = C.yellow;
    fitSize(ctx, title.toUpperCase(), stencil, Math.round(ts), bw - pad * 1.4);
    ctx.fillText(title.toUpperCase(), bx + pad * 0.7, by + pad * 0.55 + ts * 0.82);
    if (footer) {
      ctx.font = mono(Math.round(u * 1.5)); ctx.fillStyle = C.dim;
      ctx.fillText(footer.toUpperCase(), bx + pad * 0.7, by + bh - pad * 0.55);
    }
    if (status) chip(ctx, status, pad, pad, u);
  } else {
    // band: full-bleed screenshot, darkened toward the bottom for the type.
    if (img) cover(ctx, img, 0, 0, w, h, crop);
    const g = ctx.createLinearGradient(0, h * 0.22, 0, h);
    g.addColorStop(0, 'rgba(26,26,24,0)');
    g.addColorStop(0.35, 'rgba(26,26,24,0.82)');
    g.addColorStop(0.6, 'rgba(26,26,24,0.94)');
    g.addColorStop(1, 'rgba(26,26,24,0.97)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    hazard(ctx, 0, 0, w, stripe);
    chip(ctx, status, pad, stripe + pad * 0.7, u);
    drawLogo(ctx, logo, w - pad, h - pad - u * 3.4, u * 3.4);
    textBlock(ctx, { x: pad, bottom: h - pad, maxW: w - pad * 2 - (logo ? u * 9 : 0), u, title, headline, footer, titleSize: u * 8, headLines: w > h ? 2 : 4 });
  }
  ctx.restore();
}
