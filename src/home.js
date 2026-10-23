// Home: a living hive. Shared by the User and Developer levels.
// On opening, an atmospheric preloader: fog gathers into one drop of palm oil while a count runs to 100, then it bursts
// open into the page. A swarm of glowing particles then fills the whole screen behind Home (fog, honeycomb, depth) and
// flows together into the story of Malaysia's biodiesel mandate: oil palm fruit, palm oil, biodiesel at the pump, B5, B7,
// B10, B20, B30 and MPOB × UKM. Every form is drawn in code on a small offscreen canvas and sampled for points and colours.
// One requestAnimationFrame loop; it rests when the tab is hidden, stops when Home is left, and becomes a still picture
// under Reduce motion. Pause is always available; the preloader shows once per browser session and any input skips it.

const HOME = (() => {
  const M = () => (typeof MOTION === 'undefined' ? null : MOTION);
  const esc = s => String(s).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
  const FW = 560, FH = 440; // form canvas (logical px)
  const FONT = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI Variable Display", "Segoe UI", Roboto, Arial, sans-serif';

  // The journey. Years are when each blend was introduced; roll-out was phased by region and sector.
  const FORMS = [
    { id: 'fruit', label: 'Oil palm fruit', note: 'Where it starts' },
    { id: 'drop', label: 'Palm oil', note: 'Crude palm oil becomes palm methyl ester (PME)' },
    { id: 'pump', label: 'Biodiesel at the pump', note: 'PME blended into diesel' },
    { id: 'B5', label: 'B5', note: '2011', badge: true },
    { id: 'B7', label: 'B7', note: '2014', badge: true },
    { id: 'B10', label: 'B10', note: '2019', badge: true },
    { id: 'B20', label: 'B20', note: 'From 2020, phased', badge: true },
    { id: 'B30', label: 'B30', note: 'The next step this studio tests', badge: true, next: true },
    { id: 'partners', label: 'MPOB × UKM', note: 'Malaysian Palm Oil Board and Universiti Kebangsaan Malaysia' },
  ];
  const HOLD = 2.9, MOVE = 1.25; // seconds holding a form, seconds of swarming between forms

  /* ── Drawing the forms (original artwork, drawn in code) ── */
  function lin(ctx, x0, y0, x1, y1, stops) { const g = ctx.createLinearGradient(x0, y0, x1, y1); stops.forEach(([o, c]) => g.addColorStop(o, c)); return g; }
  function swoosh(ctx, cx, cy, w) {
    ctx.save(); ctx.translate(cx, cy);
    ctx.beginPath(); ctx.moveTo(-w / 2, 8); ctx.bezierCurveTo(-w / 4, 44, w / 4, 40, w / 2, -22); ctx.bezierCurveTo(w / 4, 18, -w / 5, 26, -w / 2, 8); ctx.closePath();
    ctx.fillStyle = lin(ctx, -w / 2, 0, w / 2, 0, [[0, '#2f9e44'], [1, '#9be15d']]); ctx.fill(); ctx.restore();
  }
  function leaf(ctx, x, y, len, ang, col) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(len * 0.5, -len * 0.32, len, 0); ctx.quadraticCurveTo(len * 0.5, len * 0.32, 0, 0);
    ctx.fillStyle = col; ctx.fill(); ctx.restore();
  }
  function drawForm(ctx, id) {
    ctx.clearRect(0, 0, FW, FH);
    const cx = FW / 2, cy = FH / 2;
    if (id === 'fruit') {
      // A fruit bunch: ovals packed in a rounded cone, deep red at the core to orange at the rim, with frond spikes.
      for (let i = 0; i < 8; i++) leaf(ctx, cx, cy - 40, 150 + (i % 3) * 20, -Math.PI / 2 + (i - 3.5) * 0.36, i % 2 ? '#3f8f3a' : '#5fae45');
      const pts = [];
      for (let r = 0; r < 9; r++) for (let k = 0; k < 6 + r; k++) {
        const a = (k / (6 + r)) * Math.PI * 2 + r * 0.4, rad = 14 + r * 13;
        pts.push([cx + Math.cos(a) * rad * 1.05, cy + 30 + Math.sin(a) * rad * 0.92, r]);
      }
      pts.sort((p, q) => q[2] - p[2]).forEach(([x, y, r]) => {
        ctx.beginPath(); ctx.ellipse(x, y, 15, 19, Math.atan2(y - cy - 30, x - cx) + Math.PI / 2, 0, Math.PI * 2);
        ctx.fillStyle = lin(ctx, x, y - 19, x, y + 19, [[0, r > 6 ? '#ffb347' : '#f06a2a'], [1, r > 6 ? '#e0531f' : '#7a1a12']]); ctx.fill();
      });
    } else if (id === 'drop') {
      ctx.beginPath(); ctx.moveTo(cx, cy - 170);
      ctx.bezierCurveTo(cx + 40, cy - 90, cx + 130, cy - 10, cx + 130, cy + 70);
      ctx.arc(cx, cy + 70, 130, 0, Math.PI);
      ctx.bezierCurveTo(cx - 130, cy - 10, cx - 40, cy - 90, cx, cy - 170); ctx.closePath();
      ctx.fillStyle = lin(ctx, cx - 130, cy - 170, cx + 130, cy + 200, [[0, '#ffe27a'], [0.55, '#f5b81c'], [1, '#d98a0b']]); ctx.fill();
      ctx.beginPath(); ctx.ellipse(cx - 55, cy + 40, 22, 52, 0.35, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.fill();
    } else if (id === 'pump') {
      for (let i = 0; i < 16; i++) leaf(ctx, cx + Math.cos(i * 1.7) * 120, cy + 30 + Math.sin(i * 1.3) * 150, 70 + (i % 4) * 14, i * 0.9, i % 3 ? '#4fae4a' : '#8fd36a');
      ctx.fillStyle = lin(ctx, cx - 70, 0, cx + 70, 0, [[0, '#a8e07e'], [0.5, '#5dbb52'], [1, '#2e8b3e']]);
      ctx.beginPath(); ctx.roundRect(cx - 70, cy - 150, 140, 320, 26); ctx.fill();
      ctx.fillStyle = '#1d3b2a'; ctx.beginPath(); ctx.roundRect(cx - 44, cy - 108, 88, 70, 10); ctx.fill();
      ctx.fillStyle = '#e8f6d8'; ctx.beginPath(); ctx.roundRect(cx - 34, cy - 98, 68, 26, 6); ctx.fill();
      ctx.strokeStyle = '#1d3b2a'; ctx.lineWidth = 12; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(cx + 70, cy - 40); ctx.bezierCurveTo(cx + 170, cy - 30, cx + 150, cy + 120, cx + 110, cy + 150); ctx.stroke();
      ctx.fillStyle = '#d63b2f'; ctx.beginPath(); ctx.roundRect(cx + 80, cy - 70, 26, 46, 8); ctx.fill();
    } else if (id === 'partners') {
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = `800 132px ${FONT}`; ctx.fillStyle = lin(ctx, 0, cy - 150, 0, cy - 30, [[0, '#7bd35a'], [1, '#1f8a3c']]); ctx.fillText('MPOB', cx, cy - 92);
      ctx.font = `800 132px ${FONT}`; ctx.fillStyle = lin(ctx, 0, cy + 30, 0, cy + 150, [[0, '#6fb7ff'], [1, '#1f5fb8']]); ctx.fillText('UKM', cx + 40, cy + 96);
      ctx.font = `700 96px ${FONT}`; ctx.fillStyle = '#f5b81c'; ctx.fillText('×', cx - 150, cy + 92);
    } else {
      // B5 … B30: a green B, gold digits for the earlier blends, green digits with a leaf swoosh from B20.
      const digits = id.slice(1), modern = Number(digits) >= 20;
      ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
      const size = digits.length > 1 ? 210 : 240;
      ctx.font = `900 ${size}px ${FONT}`;
      const wb = ctx.measureText('B').width, wd = ctx.measureText(digits).width, x0 = cx - (wb + wd) / 2, base = cy + size * 0.33 - (modern ? 26 : 0);
      ctx.fillStyle = lin(ctx, 0, base - size * 0.75, 0, base, [[0, '#6cc04a'], [1, '#14713a']]); ctx.fillText('B', x0, base);
      ctx.fillStyle = modern ? lin(ctx, 0, base - size * 0.75, 0, base, [[0, '#9be15d'], [1, '#2f9e44']]) : lin(ctx, 0, base - size * 0.75, 0, base, [[0, '#ffe066'], [1, '#e89a0c']]);
      ctx.fillText(digits, x0 + wb - 6, base);
      if (id === 'B10') { ctx.beginPath(); ctx.arc(x0 + wb + wd * 0.55, base - size * 0.86, 22, 0, Math.PI * 2); ctx.fillStyle = '#f5b81c'; ctx.fill(); }
      if (modern) {
        swoosh(ctx, cx + 30, base + 22, wb + wd + 40);
        ctx.font = `800 40px ${FONT}`; ctx.textAlign = 'center'; ctx.fillStyle = '#1f8a3c'; ctx.fillText('BIODIESEL', cx, base + 92);
      }
    }
  }
  // Sample a form into points with colours. The gap keeps the count near the swarm size.
  const cache = new Map();
  function sample(id, want) {
    const key = `${id}:${want}`;
    if (cache.has(key)) return cache.get(key);
    const c = document.createElement('canvas'); c.width = FW; c.height = FH;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    drawForm(ctx, id);
    const data = ctx.getImageData(0, 0, FW, FH).data;
    let filled = 0; for (let i = 3; i < data.length; i += 16) if (data[i] > 140) filled++;
    const gap = Math.max(3, Math.sqrt(filled * 4 / want));
    const pts = [];
    for (let y = gap / 2; y < FH; y += gap) for (let x = gap / 2; x < FW; x += gap) {
      const jx = Math.min(FW - 1, Math.round(x + (Math.random() - 0.5) * gap * 0.6)), jy = Math.min(FH - 1, Math.round(y + (Math.random() - 0.5) * gap * 0.6));
      const i = (jy * FW + jx) * 4;
      if (data[i + 3] > 140) pts.push([jx, jy, data[i], data[i + 1], data[i + 2]]);
    }
    for (let i = pts.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pts[i], pts[j]] = [pts[j], pts[i]]; }
    cache.set(key, pts);
    return pts;
  }

  /* ── Page ── */
  const ring = (k, next) => `<svg class="jb-ring" viewBox="0 0 120 120" aria-hidden="true">
      <circle class="r1" cx="60" cy="60" r="55"/><circle class="r2" cx="60" cy="60" r="51"/><circle class="r3" cx="60" cy="60" r="47"/>${next ? '<circle class="r4" cx="60" cy="60" r="57"/>' : ''}</svg>`;
  function badge(f, i) {
    const d = f.id.slice(1), modern = Number(d) >= 20;
    return `<li><button type="button" class="jb ${modern ? 'is-modern' : ''} ${f.next ? 'is-next' : ''}" data-form="${i}" aria-label="${f.label}, ${f.note}">
      ${ring(i, f.next)}<span class="jb-face"><span class="jb-mark"><b>B</b><em>${d}</em></span>${modern ? '<small>BIODIESEL</small>' : ''}${f.id === 'B10' ? '<i class="jb-drop"></i>' : ''}</span>
      <span class="jb-year">${f.note}</span></button></li>`;
  }
  // Sponsor marks, kept small: the build embeds brand/mpob.* and brand/ukm.* when present; otherwise quiet wordmarks.
  function sponsors() {
    let logos = {};
    try { logos = JSON.parse(document.getElementById('brand-logos')?.textContent || '{}'); } catch {}
    const mark = (key, short, name) => logos[key]
      ? `<img src="${logos[key]}" alt="${name}" class="sp-${key}">`
      : `<span class="sp-word" title="${name}"><b>${short}</b><small>${name}</small></span>`;
    return `<div class="hive-sponsors"><span class="sp-k">Supported by</span><span class="sp-marks">${mark('mpob', 'MPOB', 'Malaysian Palm Oil Board')}<i aria-hidden="true"></i>${mark('ukm', 'UKM', 'Universiti Kebangsaan Malaysia')}</span></div>`;
  }
  function html(cfg) {
    const words = cfg.title.split(' ').map((w, i) => `<span class="hw" style="--w:${i}">${esc(w)}</span>`).join(' ');
    return `<section class="hive" data-home-hive>
        <div class="hive-anchor" data-hive-anchor aria-hidden="true"></div>
        <div class="hive-copy">
          <div class="hero-kicker">${esc(cfg.kicker)}</div>
          <h1 class="home-title" aria-label="${esc(cfg.title)}"><span aria-hidden="true">${words}</span></h1>
          <p class="home-lead">${cfg.lead}</p>
          <div class="home-cta">${cfg.cta}</div>
          ${sponsors()}
        </div>
        <div class="hive-hud"><span class="hive-label"><b data-hive-label></b><small data-hive-note></small></span>
          <button type="button" class="home-pause" data-home-pause aria-pressed="false"><svg viewBox="0 0 24 24" aria-hidden="true"><path class="i-pause" d="M8 5v14M16 5v14"/><path class="i-play" d="M7 5l12 7-12 7z"/></svg><span>Pause</span></button></div>
        <p class="sr-only">An animated swarm of particles forms, in turn, an oil palm fruit, a palm oil droplet, a biodiesel pump, the blends B5, B7, B10, B20 and B30, and the names MPOB and UKM.</p>
      </section>
      <section class="journey" aria-labelledby="journey-h">
        <div class="journey-head"><h2 id="journey-h">Malaysia’s biodiesel journey</h2><p>From B5 in 2011 to B20 today. This studio tests when B30 is affordable. Tap a blend to see it form.</p></div>
        <ol class="journey-row">${FORMS.map((f, i) => f.badge ? badge(f, i) : '').join('')}</ol>
        <p class="journey-note">Years are when each blend was introduced; the roll-out was phased by region and sector.</p>
      </section>
      <nav class="home-cards" aria-label="Objectives">${cfg.cards.map((t, i) => `<button type="button" class="home-card c${i + 1}" data-tab="${t.tab}" style="--i:${i}">
          <span class="home-card-ico" aria-hidden="true">${t.icon}</span><span class="home-card-k">${esc(t.label)}</span><strong>${esc(t.title)}</strong><small>${esc(t.meta)}</small>
          <span class="home-card-go" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg></span></button>`).join('')}</nav>`;
  }

  /* ── Atmosphere: fog, honeycomb and the swarm on one full-screen layer behind the Home page ── */
  const ATM = {
    light: { base: [238, 247, 240], fog: [[155, 225, 93, 0.34], [30, 174, 191, 0.2], [108, 192, 74, 0.3], [245, 184, 28, 0.16], [143, 216, 192, 0.3]], hex: [20, 113, 58], roam: [46, 158, 68] },
    dark: { base: [4, 17, 10], fog: [[47, 158, 68, 0.42], [30, 174, 191, 0.26], [245, 184, 28, 0.16], [20, 113, 58, 0.5], [143, 216, 192, 0.16]], hex: [160, 230, 180], roam: [255, 214, 90] },
  };
  const INTRO = 2.3, REVEAL = 0.9;
  let introShown = false;
  try { introShown = sessionStorage.getItem('mpob-hive-intro') === '1'; } catch {}
  function layerEl() {
    let l = document.getElementById('hive-layer');
    if (!l) { l = document.createElement('div'); l.id = 'hive-layer'; l.className = 'hive-layer'; l.setAttribute('aria-hidden', 'true'); l.innerHTML = '<canvas></canvas>'; document.body.prepend(l); }
    return l;
  }
  const mix = (a, b, t) => a + (b - a) * t;

  let current = null;
  function start(root) {
    current?.stop();
    const hive = root.querySelector('[data-home-hive]'), anchor = root.querySelector('[data-hive-anchor]');
    if (!hive || !anchor) return null;
    const html = document.documentElement;
    const layer = layerEl(), canvas = layer.querySelector('canvas'), ctx = canvas.getContext('2d');
    const labelEl = hive.querySelector('[data-hive-label]'), noteEl = hive.querySelector('[data-hive-note]');
    const badges = [...root.querySelectorAll('.jb[data-form]')];
    let W = 0, H = 0, dpr = 1, N = 0, parts = [], wide = true, place = { x: 0, y: 0, s: 1 }, hexLayer = { light: null, dark: null }, hexes = [];
    let form = 1, phase = 'hold', clock = 0, time = 0, frames = 0, raf = 0, last = 0, paused = false, roam = false;
    let atm = 0, atmTo = 0; // 0 = light atmosphere, 1 = dark
    let mode = 'run', modeClock = 0, count = -1; // 'intro' → 'reveal' → 'run'
    const pointer = { x: -9999, y: -9999, on: false, nx: 0, ny: 0 };
    const still = () => Boolean(M()?.reduce) || paused;
    let cur = [];

    function readTheme() { atmTo = /dark/.test(getComputedStyle(html).colorScheme || '') ? 1 : 0; if (mode === 'run' && (still() || !frames)) atm = atmTo; }
    function layout() {
      W = Math.max(1, html.clientWidth); H = Math.max(1, html.clientHeight); // the fixed layer, without scrollbars dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      wide = W >= 860;
      const want = Math.round(Math.min(2400, Math.max(800, W * H / 560)));
      if (want !== N) {
        N = want;
        parts = Array.from({ length: N }, () => {
          const z = 0.45 + Math.random() * 1.0;
          return { x: Math.random() * W, y: Math.random() * H, vx: 0, vy: 0, px: 0, py: 0, t: -1, z,
            r: 90, g: 190, b: 120, k: 0.6 + Math.random() * 0.8, seed: Math.random() * 100, size: 0.7 + Math.random() * 1.1,
            hx: Math.random(), hy: Math.random(), ang: Math.random() * 6.283, orb: 14 + Math.random() * 70, w: (Math.random() < 0.5 ? -1 : 1) * (0.25 + Math.random() * 0.6) };
        });
        parts.forEach(p => { p.px = p.x; p.py = p.y; });
        assign(form, false);
      }
      // Honeycomb drawn once per size and look, then blitted every frame.
      const hs = wide ? 36 : 26, hw = hs * Math.sqrt(3);
      hexes = [];
      for (let row = -1, y = 0; y < H + hs * 2; row++, y = row * hs * 1.5) for (let col = -1, x = 0; x < W + hw; col++, x = col * hw + (row % 2 ? hw / 2 : 0)) hexes.push([x, y, hs]);
      for (const key of ['light', 'dark']) {
        const c = document.createElement('canvas'); c.width = canvas.width; c.height = canvas.height;
        const g = c.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.lineWidth = 1;
        const [r, gg, b] = ATM[key].hex; g.strokeStyle = `rgba(${r},${gg},${b},${key === 'dark' ? 0.07 : 0.08})`;
        for (const [x, y, s] of hexes) { hexPath(g, x, y, s); g.stroke(); }
        hexLayer[key] = c;
      }
    }
    function hexPath(g, x, y, s) { g.beginPath(); for (let k = 0; k < 6; k++) { const a = Math.PI / 3 * k + Math.PI / 6; const hx = x + Math.cos(a) * s * 0.96, hy = y + Math.sin(a) * s * 0.96; k ? g.lineTo(hx, hy) : g.moveTo(hx, hy); } g.closePath(); }
    function placeForm() {
      if (mode === 'intro') { const s = Math.min(W * 0.42 / FW, H * 0.5 / FH); place = { x: W / 2 - FW * s / 2, y: H * 0.46 - FH * s / 2, s }; roam = false; return; }
      const r = anchor.getBoundingClientRect();
      const s = Math.min(r.width / FW, r.height / FH);
      place = { x: r.left + (r.width - FW * s) / 2, y: r.top + (r.height - FH * s) / 2, s };
      // Scrolled past the hero: the whole swarm breaks up and drifts over the rest of the page.
      roam = r.bottom < H * 0.28 || r.top > H * 0.92;
    }
    // Hand most particles a point of the form; the rest drift as atmosphere across the whole screen.
    function assign(i, snap = false) {
      const pts = sample(FORMS[i].id, Math.round(N * 0.7));
      const order = parts.map((p, j) => j).sort(() => Math.random() - 0.5);
      order.forEach((j, n) => { parts[j].t = n < pts.length ? n : -1; });
      cur = pts;
      if (snap) settlePoints();
    }
    function settlePoints() { placeForm(); parts.forEach(p => { if (p.t >= 0 && cur[p.t] && !roam) { const q = cur[p.t]; p.x = p.px = place.x + q[0] * place.s; p.y = p.py = place.y + q[1] * place.s; p.r = q[2]; p.g = q[3]; p.b = q[4]; } }); }
    function setLabel(i) {
      const f = FORMS[i];
      labelEl.textContent = f.label; noteEl.textContent = f.note;
      if (!still() && mode === 'run') labelEl.parentElement.animate?.([{ transform: 'translateY(8px)', opacity: 0, filter: 'blur(4px)' }, { transform: 'none', opacity: 1, filter: 'none' }], { duration: 420, easing: 'cubic-bezier(.23,1,.32,1)' });
      badges.forEach(b => { const on = Number(b.dataset.form) === i; b.classList.toggle('is-on', on); if (on) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current'); });
    }
    const burst = (cx, cy, power, radius = Infinity) => parts.forEach(p => {
      const dx = p.x - cx, dy = p.y - cy, d = Math.hypot(dx, dy) || 1;
      if (d > radius) return;
      const f = power * (radius === Infinity ? (0.4 + Math.random()) : (1 - d / radius));
      p.vx += dx / d * f; p.vy += dy / d * f;
    });
    function go(i, { scatter = true } = {}) {
      form = (i + FORMS.length) % FORMS.length; phase = 'hold'; clock = 0;
      if (scatter && !still()) parts.forEach(p => { const a = Math.random() * 6.283, s = 120 + Math.random() * 360; p.vx += Math.cos(a) * s; p.vy += Math.sin(a) * s; });
      assign(form, still());
      setLabel(form);
      if (still()) draw();
    }

    // Intro: the fog gathers into one drop of palm oil while the count runs, then it bursts open into the page.
    const ui = { el: null, num: null };
    function beginIntro() {
      mode = 'intro'; modeClock = 0; atm = 1;
      html.classList.add('hive-intro');
      ui.el = document.createElement('div'); ui.el.className = 'hive-intro-ui'; ui.el.setAttribute('aria-hidden', 'true');
      ui.el.innerHTML = `<div class="hi-top"><span>MPOB <i>×</i> UKM</span><span>Biodiesel mandate studio</span></div>
        <div class="hi-mid"><span>Palm oil</span><span>B5</span><span>B7</span><span>B10</span><span>B20</span><span>B30</span></div>
        <div class="hi-bottom"><b class="hi-num">0</b><button type="button" class="hi-skip" tabindex="-1">Skip</button></div>`;
      document.body.appendChild(ui.el); ui.num = ui.el.querySelector('.hi-num');
      const fi = FORMS.findIndex(f => f.id === 'drop'); form = fi; assign(fi, false); setLabel(fi);
      ['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach(t => addEventListener(t, skipIntro, { once: true, passive: true }));
    }
    function skipIntro() { if (mode === 'intro') reveal(); }
    function reveal() {
      mode = 'reveal'; modeClock = 0;
      try { sessionStorage.setItem('mpob-hive-intro', '1'); } catch {}
      introShown = true;
      ['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach(t => removeEventListener(t, skipIntro));
      if (ui.num) ui.num.textContent = '100';
      burst(W / 2, H * 0.46, 900);
      M()?.haptic?.(12);
      ui.el?.classList.add('is-out'); setTimeout(() => { ui.el?.remove(); ui.el = null; }, 700);
      html.classList.remove('hive-intro');
      const page = document.getElementById('page');
      page?.animate?.([{ clipPath: 'circle(0% at 50% 46%)', opacity: 0.2 }, { clipPath: 'circle(150% at 50% 46%)', opacity: 1 }], { duration: 1100, easing: 'cubic-bezier(.23,1,.32,1)' });
      setTimeout(() => { if (current === api) { go(0, { scatter: false }); } }, 650);
    }

    function step(dt) {
      time += dt; clock += dt; modeClock += dt;
      if (mode === 'intro') {
        const pr = Math.min(1, modeClock / INTRO), c = Math.round(100 * (1 - (1 - pr) ** 2.2));
        if (c !== count) { count = c; if (ui.num) ui.num.textContent = String(c); }
        if (pr >= 1) reveal();
      } else if (mode === 'reveal') {
        atm = mix(atm, atmTo, Math.min(1, dt * 2.4));
        if (modeClock > REVEAL + 0.6) { mode = 'run'; }
      } else {
        atm = mix(atm, atmTo, Math.min(1, dt * 3));
        if (phase === 'hold' && clock > HOLD && !roam) { phase = 'move'; clock = 0; parts.forEach(p => { const a = Math.random() * 6.283, s = 60 + Math.random() * 240; p.vx += Math.cos(a) * s; p.vy += Math.sin(a) * s; }); }
        if (phase === 'move' && clock > MOVE * 0.35) { go(form + 1, { scatter: false }); clock = -MOVE * 0.65; }
      }
      placeForm();
      const gather = mode === 'intro' ? 0.35 + 0.85 * Math.min(1, modeClock / (INTRO * 0.5)) : 1;
      const swirl = mode === 'intro' ? 0.6 : clock < 0 ? 1 : Math.max(0, 1 - clock / 0.9);
      const sy = scrollY, roamCol = ATM.dark.roam.map((v, i) => mix(ATM.light.roam[i], v, atm));
      for (const p of parts) {
        p.px = p.x; p.py = p.y;
        let tx, ty, k;
        const formed = p.t >= 0 && cur[p.t] && !roam;
        if (formed) {
          const q = cur[p.t]; tx = place.x + q[0] * place.s; ty = place.y + q[1] * place.s; k = 7 * p.k * gather;
          const e = Math.min(1, dt * 3); p.r += (q[2] - p.r) * e; p.g += (q[3] - p.g) * e; p.b += (q[4] - p.b) * e;
        } else {
          // Atmosphere: every drifting particle has its own home on the screen, with depth parallax as the page scrolls.
          p.ang += p.w * dt;
          const hy = ((p.hy * H - sy * 0.18 * p.z) % H + H) % H;
          tx = p.hx * W + Math.cos(p.ang) * p.orb + pointer.nx * 18 * p.z; ty = hy + Math.sin(p.ang * 1.3) * p.orb * 0.7 + pointer.ny * 12 * p.z;
          if (Math.abs(ty - p.y) > H * 0.5) { p.y = p.py = ty; p.x = p.px = tx; }
          k = 1.2 * p.k;
          const e = Math.min(1, dt * 1.2); p.r += (roamCol[0] - p.r) * e; p.g += (roamCol[1] - p.g) * e; p.b += (roamCol[2] - p.b) * e;
        }
        let ax = (tx - p.x) * k * k * 0.5, ay = (ty - p.y) * k * k * 0.5;
        // Bee-like turbulence: strongest while the swarm travels, a soft shimmer once it holds a form.
        const n = 150 * (0.07 + swirl) + (formed ? 0 : 110);
        ax += n * Math.sin(p.y * 0.012 + time * 1.7 + p.seed); ay += n * Math.cos(p.x * 0.011 - time * 1.4 + p.seed);
        if (pointer.on) {
          const dx = p.x - pointer.x, dy = p.y - pointer.y, d2 = dx * dx + dy * dy, R = wide ? 120 : 84;
          if (d2 < R * R) { const d = Math.sqrt(d2) || 1, f = (1 - d / R) * 5600; ax += dx / d * f; ay += dy / d * f; }
          else if (!formed && d2 < 260 * 260) { ax -= dx * 0.6; ay -= dy * 0.6; } // curious bees circle the pointer
        }
        const damp = Math.exp(-dt * (formed ? 4.2 * p.k : 1.7));
        p.vx = (p.vx + ax * dt) * damp; p.vy = (p.vy + ay * dt) * damp;
        p.x += p.vx * dt; p.y += p.vy * dt;
      }
    }
    function draw() {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const L = ATM.light, D = ATM.dark;
      ctx.fillStyle = `rgb(${L.base.map((v, i) => Math.round(mix(v, D.base[i], atm))).join(',')})`;
      ctx.fillRect(0, 0, W, H);
      // Fog: large soft glows drifting slowly, the light and dark palettes cross-faded by the atmosphere.
      const fogs = 5;
      for (let i = 0; i < fogs; i++) {
        const fx = W * (0.5 + 0.42 * Math.sin(time * (0.05 + i * 0.013) + i * 1.9)), fy = H * (0.5 + 0.38 * Math.cos(time * (0.04 + i * 0.011) + i * 2.7));
        const rad = Math.max(W, H) * (0.38 + 0.08 * Math.sin(time * 0.2 + i));
        for (const [pal, wgt] of [[L, 1 - atm], [D, atm]]) {
          if (wgt < 0.02) continue;
          const [r, g, b, a] = pal.fog[i]; const gr = ctx.createRadialGradient(fx, fy, 0, fx, fy, rad);
          gr.addColorStop(0, `rgba(${r},${g},${b},${(a * wgt).toFixed(3)})`); gr.addColorStop(1, `rgba(${r},${g},${b},0)`);
          ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
        }
      }
      // Honeycomb, lit where the swarm gathers and where the pointer is.
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      if (hexLayer.light && 1 - atm > 0.02) { ctx.globalAlpha = 1 - atm; ctx.drawImage(hexLayer.light, 0, 0); }
      if (hexLayer.dark && atm > 0.02) { ctx.globalAlpha = atm; ctx.drawImage(hexLayer.dark, 0, 0); }
      ctx.globalAlpha = 1; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const cx = place.x + FW * place.s / 2, cy = place.y + FH * place.s / 2, reach = (wide ? 460 : 280) * (roam ? 0 : 1);
      const hc = ATM.dark.hex.map((v, i) => Math.round(mix(ATM.light.hex[i], v, atm)));
      for (const [x, y, s] of hexes) {
        const d = Math.hypot(x - cx, y - cy), dp = pointer.on ? Math.hypot(x - pointer.x, y - pointer.y) : 1e9;
        const glow = (reach ? Math.max(0, 1 - d / reach) * (0.5 + 0.5 * Math.sin(time * 1.6 - d * 0.02)) : 0) + Math.max(0, 1 - dp / 170);
        if (glow < 0.08) continue;
        hexPath(ctx, x, y, s);
        ctx.strokeStyle = `rgba(${hc.join(',')},${(glow * (0.14 + atm * 0.08)).toFixed(3)})`; ctx.lineWidth = 1; ctx.stroke();
        if (glow > 0.6) { ctx.fillStyle = atm > 0.5 ? `rgba(255,214,90,${((glow - 0.6) * 0.12).toFixed(3)})` : `rgba(108,192,74,${((glow - 0.6) * 0.14).toFixed(3)})`; ctx.fill(); }
      }
      // The swarm. Near particles (larger z) are bigger and brighter: depth without 3D.
      ctx.globalCompositeOperation = atm > 0.5 ? 'lighter' : 'source-over';
      ctx.lineCap = 'round';
      for (const p of parts) {
        const col = `rgb(${p.r | 0},${p.g | 0},${p.b | 0})`, size = p.size * p.z;
        const formed = p.t >= 0 && !roam;
        const sp = Math.abs(p.x - p.px) + Math.abs(p.y - p.py);
        ctx.globalAlpha = (formed ? 0.9 : 0.4) * (0.55 + 0.45 * p.z / 1.45);
        if (sp > 1.2) { ctx.strokeStyle = col; ctx.lineWidth = size * 1.6; ctx.beginPath(); ctx.moveTo(p.px, p.py); ctx.lineTo(p.x, p.y); ctx.stroke(); }
        else { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(p.x, p.y, size * 1.2, 0, 6.283); ctx.fill(); }
      }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      frames++;
    }
    function frame(now) {
      raf = 0;
      if (!hive.isConnected || hive.closest('.is-leaving')) return stop();
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60; last = now;
      if (!document.hidden && !still()) { step(dt); draw(); }
      if (!still()) raf = requestAnimationFrame(frame);
    }
    const kick = () => { if (!raf && !still()) { last = 0; raf = requestAnimationFrame(frame); } };
    function settle() { atm = atmTo; settlePoints(); draw(); }

    // Touch the hive: the pointer parts the swarm and the drifting bees circle it; a tap sends a ripple.
    const onMove = e => {
      if (e.target.closest?.('.hive-copy, .hive-hud, .home-card, .jb, .topbar')) { pointer.on = false; } else { pointer.x = e.clientX; pointer.y = e.clientY; pointer.on = true; }
      pointer.nx = e.clientX / W - 0.5; pointer.ny = e.clientY / H - 0.5;
    };
    const onLeave = () => { pointer.on = false; };
    const onDown = e => {
      if (mode !== 'run' || still() || e.target.closest?.('button, a, input, .topbar')) return;
      burst(e.clientX, e.clientY, 950, 280); M()?.haptic?.(6);
    };
    addEventListener('pointermove', onMove, { passive: true }); document.addEventListener('pointerleave', onLeave); root.addEventListener('pointerdown', onDown);
    badges.forEach(b => b.addEventListener('click', () => { go(Number(b.dataset.form)); hive.scrollIntoView?.({ behavior: still() ? 'auto' : 'smooth', block: 'start' }); }));

    const pauseBtn = hive.querySelector('[data-home-pause]');
    const setPaused = v => {
      paused = v; pauseBtn.setAttribute('aria-pressed', String(v)); pauseBtn.querySelector('span').textContent = v ? 'Play' : 'Pause';
      if (v) settle(); else kick();
    };
    pauseBtn.addEventListener('click', () => setPaused(!paused));

    // Objective cards lean toward a precise pointer (CSS springs the tilt back when it leaves).
    root.querySelectorAll('.home-card').forEach(card => {
      card.addEventListener('pointermove', e => {
        if (e.pointerType !== 'mouse' || M()?.reduce) return;
        const r = card.getBoundingClientRect();
        card.style.setProperty('--tx', `${((e.clientX - r.left) / r.width - 0.5) * 10}deg`);
        card.style.setProperty('--ty', `${(0.5 - (e.clientY - r.top) / r.height) * 8}deg`);
      });
      card.addEventListener('pointerleave', () => { card.style.removeProperty('--tx'); card.style.removeProperty('--ty'); });
    });

    let rt = 0;
    const onResize = () => { clearTimeout(rt); rt = setTimeout(() => { layout(); if (still()) settle(); }, 100); };
    addEventListener('resize', onResize);
    const onScroll = () => { if (still()) settle(); };
    addEventListener('scroll', onScroll, { passive: true });
    const mo = new MutationObserver(() => { readTheme(); if (still()) settle(); });
    mo.observe(html, { attributes: true, attributeFilter: ['data-theme', 'style'] });
    const onVis = () => { if (!document.hidden) kick(); };
    document.addEventListener('visibilitychange', onVis);
    M()?.watch?.(() => { if (current === api) { if (still()) settle(); else kick(); } });

    function stop() {
      if (raf) cancelAnimationFrame(raf); raf = 0;
      removeEventListener('pointermove', onMove); document.removeEventListener('pointerleave', onLeave);
      removeEventListener('resize', onResize); removeEventListener('scroll', onScroll);
      mo.disconnect(); document.removeEventListener('visibilitychange', onVis);
      ['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach(t => removeEventListener(t, skipIntro));
      if (mode === 'intro') { html.classList.remove('hive-intro'); ui.el?.remove(); }
      layer.classList.remove('is-on'); html.classList.remove('home-on');
      if (current === api) current = null;
    }

    readTheme(); layout();
    layer.classList.add('is-on'); html.classList.add('home-on');
    if (!introShown && !still()) beginIntro();
    else { go(0, { scatter: false }); if (!still()) parts.forEach(p => { p.x = p.px = Math.random() * W; p.y = p.py = Math.random() * H; }); }
    if (still()) settle(); else kick();
    const api = { stop, go: id => go(typeof id === 'number' ? id : FORMS.findIndex(f => f.id === id)), pause: setPaused, skipIntro,
      get form() { return FORMS[form].id; }, get frames() { return frames; }, get particles() { return N; }, get mode() { return mode; }, get roaming() { return roam; } };
    current = api;
    return api;
  }
  return { html, start, forms: FORMS.map(f => f.id), get scene() { return current; } };
})();
