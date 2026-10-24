// Home: a living hive. Shared by the User and Developer levels.
// On opening, an atmospheric preloader: fog gathers into one drop of palm oil while a count runs to 100, then it bursts
// open into the page. A swarm of glowing particles then fills the whole screen behind Home (fog, honeycomb, depth) and
// flows together into the story of Malaysia's biodiesel mandate: oil palm fruit, palm oil, biodiesel at the pump, B5, B7,
// B10, B20, B30 and MPOB × UKM. Below it, a sunlit scene pours palm oil into diesel to a B20 or B30 blend. Every form is drawn in code on a small offscreen canvas and sampled for points and colours.
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
  /* ── From palm to pump: a sunlit scene drawn in code. Palm oil drips into diesel and the blend fills to B20 or B30. ── */
  // Each index item opens the step that works it out (the same steps in both levels).
  const RULE = [
    ['01', 'Palm oil', 'CPO sets the biodiesel cost', 'obj1', 1],
    ['02', 'Price gap', 'Is biodiesel cheaper than diesel?', 'obj4', 0],
    ['03', 'Fund', 'Is the fund above its safety limit?', 'obj4', 1],
    ['04', 'Approval', 'Has the government approved B30?', 'obj4', 2],
    ['05', 'Blend', 'B30 only when all three pass', 'decision', 3],
  ];
  function pourHtml(cfg) {
    return `<section class="pour" data-pour aria-labelledby="pour-h">
        <canvas class="pour-canvas" aria-hidden="true"></canvas>
        <div class="pour-lines" aria-hidden="true"><i></i><i></i><i></i></div>
        <div class="pour-top"><span>How the studio decides</span><span class="pour-tag">Illustration<span class="pt-more"> · MPOB · UKM</span></span></div>
        <div class="pour-copy">
          <h2 id="pour-h" class="pour-title"><span data-pour-blend>B20</span>.</h2>
          <p class="pour-sub">From palm to pump.</p>
          <p class="pour-share" data-pour-share>20% palm biodiesel · 80% diesel</p>
          <div class="pour-seg" role="group" aria-label="Blend">
            <button type="button" data-pour-pick="20" aria-pressed="true"><b>B20</b><small>today</small></button>
            <button type="button" data-pour-pick="30" aria-pressed="false"><b>B30</b><small>next</small></button>
          </div>
          <p class="pour-body">Choose a blend to pour it. Each step below opens the part of the studio that works it out.</p>
        </div>
        <button type="button" class="pour-card" data-tab="decision" data-step="3">
          <span class="pc-k">Decision now</span><strong>${esc(cfg.blend ?? 'B20')}</strong><small>${esc(cfg.blendNote ?? 'Reviewed snapshot')}</small><span class="pc-go" aria-hidden="true">Open →</span></button>
        <ol class="pour-index">${RULE.map(([n, t, q, tab, step]) => `<li><button type="button" data-tab="${tab}" data-step="${step}">
          <span class="pi-n">${n}</span><b>${t}</b><small>${q}</small><span class="pi-go" aria-hidden="true">→</span></button></li>`).join('')}</ol>
      </section>`;
  }
  function pourField(section) {
    const cv = section.querySelector('canvas'), g = cv.getContext('2d');
    const blendEl = section.querySelector('[data-pour-blend]'), shareEl = section.querySelector('[data-pour-share]');
    const picks = [...section.querySelectorAll('[data-pour-pick]')];
    let W = 0, H = 0, dpr = 1, bg = null, bokeh = null, raf = 0, last = 0, visible = false, time = 0, frames = 0, wide = true;
    let v = { x: 0, top: 0, bottom: 0, w: 100 }, bunch = { x: 0, y: 0, r: 40 }, fruits = [];
    let drops = [], splashes = [], rings = [], motes = [], wisps = [];
    let target = 0.2, share = 0.2, shareV = 0, slosh = 0, sloshV = 0, dropClock = 0, auto = true, autoClock = 0;
    const wind = { x: -1, y: -1, vx: 0, vy: 0, at: 0 };
    const still = () => Boolean(M()?.reduce);
    const FILL = 0.8; // the vessel is 80% full; the blend share is of that liquid

    function paintBackground() {
      const c = document.createElement('canvas'); c.width = Math.round(W * dpr); c.height = Math.round(H * dpr);
      const b = c.getContext('2d'); b.setTransform(dpr, 0, 0, dpr, 0, 0);
      const lg = b.createLinearGradient(0, 0, 0, H); lg.addColorStop(0, '#2c2915'); lg.addColorStop(0.55, '#1c2010'); lg.addColorStop(1, '#0c100a');
      b.fillStyle = lg; b.fillRect(0, 0, W, H);
      const glow = (x, y, r, stops) => { const s = b.createRadialGradient(x, y, 0, x, y, r); stops.forEach(([o, col]) => s.addColorStop(o, col)); b.fillStyle = s; b.fillRect(0, 0, W, H); };
      glow(W * 0.8, H * 0.14, Math.max(W, H) * 0.78, [[0, 'rgba(255,250,226,.95)'], [0.12, 'rgba(250,222,146,.72)'], [0.36, 'rgba(196,146,58,.3)'], [1, 'rgba(0,0,0,0)']]);
      glow(W * 0.1, H, Math.max(W, H) * 0.6, [[0, 'rgba(120,164,70,.4)'], [1, 'rgba(0,0,0,0)']]);
      // Palm fronds hanging into the frame: a curved midrib with leaflets, far ones soft.
      const canBlur = 'filter' in b;
      const frond = (x0, y0, len, ang, bend, col, blur) => {
        if (canBlur) b.filter = `blur(${blur}px)`;
        b.strokeStyle = col; b.fillStyle = col; b.lineCap = 'round';
        const pts = [];
        for (let i = 0; i <= 24; i++) { const t = i / 24, a = ang + bend * t; pts.push([x0 + Math.cos(a) * len * t, y0 + Math.sin(a) * len * t, a]); }
        b.lineWidth = 3; b.beginPath(); pts.forEach(([x, y], i) => i ? b.lineTo(x, y) : b.moveTo(x, y)); b.stroke();
        pts.forEach(([x, y, a], i) => { if (i < 2) return; const l = len * 0.2 * Math.sin(Math.PI * i / 24) + 6;
          for (const side of [-1, 1]) { const la = a + side * 1.05 + 0.35; b.beginPath(); b.moveTo(x, y); b.quadraticCurveTo(x + Math.cos(la - side * 0.3) * l * 0.5, y + Math.sin(la - side * 0.3) * l * 0.5, x + Math.cos(la) * l, y + Math.sin(la) * l + l * 0.25); b.lineWidth = 2.4; b.stroke(); } });
      };
      frond(-20, H * 0.08, W * 0.42, 0.15, 0.5, 'rgba(70,92,40,.55)', 6);
      frond(W + 20, H * 0.02, W * 0.4, Math.PI - 0.1, -0.55, 'rgba(60,82,34,.5)', 7);
      frond(W * 0.98, H * 0.55, W * 0.32, Math.PI + 0.25, -0.35, 'rgba(36,50,22,.75)', 2);
      frond(W * 0.02, H * 0.7, W * 0.3, -0.3, 0.4, 'rgba(36,50,22,.8)', 2);
      if (canBlur) b.filter = 'none';
      return c;
    }
    function paintBokeh() {
      const c = document.createElement('canvas'), s = 64; c.width = c.height = s;
      const b = c.getContext('2d'), gr = b.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
      gr.addColorStop(0, 'rgba(255,240,196,.55)'); gr.addColorStop(0.65, 'rgba(255,226,150,.2)'); gr.addColorStop(1, 'rgba(255,226,150,0)');
      b.fillStyle = gr; b.fillRect(0, 0, s, s); return c;
    }
    function layout() {
      const r = cv.getBoundingClientRect();
      W = Math.max(1, r.width); H = Math.max(1, r.height); dpr = Math.min(2, window.devicePixelRatio || 1);
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      wide = W >= 760;
      // On a phone the scene is its own strip above the words, so the vessel fills more of it.
      const vw = wide ? Math.min(W * 0.15, 190) : Math.min(W * 0.26, 120), vh = wide ? H * 0.5 : H * 0.52;
      v = { x: wide ? W * 0.62 : W * 0.5, bottom: wide ? H * 0.8 : H * 0.92, w: vw }; v.top = v.bottom - vh;
      bunch = { x: v.x - vw * 0.05, y: wide ? H * 0.14 : H * 0.14, r: vw * 0.42 };
      // The fruit bunch: ovals packed in a rounded cone, deep red inside, orange at the rim.
      fruits = [];
      for (let ring = 0; ring < 6; ring++) for (let k = 0; k < 5 + ring * 2; k++) {
        const a = k / (5 + ring * 2) * 6.283 + ring * 0.5, rad = bunch.r * (0.08 + ring * 0.17);
        fruits.push({ x: Math.cos(a) * rad, y: Math.sin(a) * rad * 0.8 + ring * bunch.r * 0.04, ring });
      }
      fruits.sort((p, q) => p.ring - q.ring).reverse();
      bg = paintBackground(); bokeh ??= paintBokeh();
      motes = Array.from({ length: wide ? 70 : 40 }, () => ({ x: Math.random() * W, y: Math.random() * H, vx: 0, vy: 0, r: 0.8 + Math.random() * 1.8, a: 0.3 + Math.random() * 0.6, seed: Math.random() * 100 }));
      wisps = Array.from({ length: 7 }, (_, i) => ({ x: (i + 0.5) / 7, ph: Math.random() * 6.283, sp: 0.4 + Math.random() * 0.5 }));
    }
    const liquidTop = () => v.bottom - (v.bottom - v.top) * FILL;
    function pick(pct, { user = true } = {}) {
      target = pct / 100;
      if (user) auto = false;
      blendEl.textContent = `B${pct}`; shareEl.textContent = `${pct}% palm biodiesel · ${100 - pct}% diesel`;
      picks.forEach(b => b.setAttribute('aria-pressed', String(Number(b.dataset.pourPick) === pct)));
      if (!still()) { blendEl.animate?.([{ transform: 'translateY(.18em)', opacity: 0, filter: 'blur(6px)' }, { transform: 'none', opacity: 1, filter: 'none' }], { duration: 520, easing: 'cubic-bezier(.23,1,.32,1)' }); sloshV += 40; }
      if (still()) { share = target; draw(); }
    }
    function step(dt) {
      time += dt;
      if (auto) { autoClock += dt; if (autoClock > 6) { autoClock = 0; pick(target > 0.25 ? 20 : 30, { user: false }); } }
      // The share rises on a spring as more palm oil is poured in.
      const k = 18, c = 2 * Math.sqrt(k) * 0.9;
      shareV += (-(share - target) * k - shareV * c) * dt; share += shareV * dt;
      // Drops fall faster while the share is climbing toward B30.
      const climbing = target - share > 0.004;
      dropClock += dt * (climbing ? 9 : 2.2);
      const bx = bunch.x + bunch.r * 0.05, by = bunch.y + bunch.r * 0.95;
      while (dropClock >= 1) { dropClock--; drops.push({ x: bx + (Math.random() - 0.5) * 6, y: by, vy: 40 + Math.random() * 30, r: 3 + Math.random() * 2.4 }); }
      const surf = liquidTop();
      for (let i = drops.length - 1; i >= 0; i--) {
        const d = drops[i]; d.vy += 900 * dt; d.y += d.vy * dt;
        if (d.y >= surf + slosh * 0.2) {
          rings.push({ x: d.x, y: surf, r: 2, a: 0.6 });
          for (let s = 0; s < 4; s++) splashes.push({ x: d.x, y: surf, vx: (Math.random() - 0.5) * 120, vy: -80 - Math.random() * 120, life: 0.5 });
          sloshV += (Math.random() - 0.5) * 18; drops.splice(i, 1);
        }
      }
      for (let i = splashes.length - 1; i >= 0; i--) { const s = splashes[i]; s.vy += 700 * dt; s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt; if (s.life <= 0 || s.y > surf + 4) splashes.splice(i, 1); }
      for (let i = rings.length - 1; i >= 0; i--) { const r = rings[i]; r.r += 60 * dt; r.a -= dt * 1.2; if (r.a <= 0) rings.splice(i, 1); }
      // The pointer's wind sloshes the liquid and stirs the golden motes in the light.
      const gust = Math.max(0, 1 - (performance.now() - wind.at) / 600);
      if (gust > 0 && Math.abs(wind.x - v.x) < v.w * 1.5) sloshV += wind.vx * 0.02 * gust;
      sloshV += (-slosh * 60 - sloshV * 4) * dt; slosh += sloshV * dt; slosh = Math.max(-14, Math.min(14, slosh));
      for (const m of motes) {
        let ax = 10 + 16 * Math.sin(m.y * 0.012 + time * 0.6 + m.seed), ay = -6 + 14 * Math.cos(m.x * 0.01 - time * 0.5 + m.seed);
        if (gust > 0) { const d = Math.hypot(m.x - wind.x, m.y - wind.y); if (d < 200) { const f = (1 - d / 200) * gust; ax += wind.vx * f * 2; ay += wind.vy * f * 2; } }
        const damp = Math.exp(-dt * 1.3); m.vx = (m.vx + ax * dt) * damp; m.vy = (m.vy + ay * dt) * damp; m.x += m.vx * dt; m.y += m.vy * dt;
        if (m.x > W + 10) m.x = -10; if (m.x < -10) m.x = W + 10; if (m.y < -10) m.y = H + 10; if (m.y > H + 10) m.y = -10;
      }
    }
    function vesselPath(inset = 0) {
      const x0 = v.x - v.w / 2 + inset, x1 = v.x + v.w / 2 - inset, t = v.top + inset, b = v.bottom - inset, r = Math.min(26, v.w * 0.18);
      g.beginPath(); g.moveTo(x0, t); g.lineTo(x0, b - r); g.quadraticCurveTo(x0, b, x0 + r, b); g.lineTo(x1 - r, b); g.quadraticCurveTo(x1, b, x1, b - r); g.lineTo(x1, t);
    }
    function draw() {
      g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(bg, 0, 0); g.setTransform(dpr, 0, 0, dpr, 0, 0);
      // Bokeh and motes in the light.
      g.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 16; i++) { const x = (i * 97 + time * (6 + i % 5)) % (W + 120) - 60, y = (i * 61) % H, r = 14 + (i * 13) % 40; g.globalAlpha = 0.35 + 0.2 * Math.sin(time * 0.7 + i); g.drawImage(bokeh, x - r, y - r, r * 2, r * 2); }
      g.globalAlpha = 1; g.fillStyle = 'rgba(255,226,140,.85)';
      for (const m of motes) { g.globalAlpha = m.a; g.beginPath(); g.arc(m.x, m.y, m.r, 0, 6.283); g.fill(); }
      g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
      // The fruit bunch, backlit, with a short stalk.
      g.strokeStyle = 'rgba(96,110,52,.95)'; g.lineWidth = 5; g.lineCap = 'round';
      g.beginPath(); g.moveTo(bunch.x, bunch.y - bunch.r * 1.9); g.quadraticCurveTo(bunch.x + 8, bunch.y - bunch.r, bunch.x, bunch.y - bunch.r * 0.6); g.stroke();
      for (const f of fruits) {
        const x = bunch.x + f.x, y = bunch.y + f.y, rr = bunch.r * 0.17;
        const fg = g.createLinearGradient(x, y - rr, x, y + rr); fg.addColorStop(0, f.ring > 3 ? '#ffb347' : '#f06a2a'); fg.addColorStop(1, f.ring > 3 ? '#d8521f' : '#6e1a10');
        g.fillStyle = fg; g.beginPath(); g.ellipse(x, y, rr * 0.82, rr, Math.atan2(f.y, f.x) + Math.PI / 2, 0, 6.283); g.fill();
      }
      const halo = g.createRadialGradient(bunch.x, bunch.y, 0, bunch.x, bunch.y, bunch.r * 1.6); halo.addColorStop(0, 'rgba(255,190,90,.25)'); halo.addColorStop(1, 'rgba(255,190,90,0)');
      g.fillStyle = halo; g.fillRect(bunch.x - bunch.r * 2, bunch.y - bunch.r * 2, bunch.r * 4, bunch.r * 4);
      // Drops of palm oil, glowing as they fall.
      g.globalCompositeOperation = 'lighter';
      for (const d of drops) { const dg = g.createRadialGradient(d.x, d.y, 0, d.x, d.y, d.r * 2.4); dg.addColorStop(0, 'rgba(255,236,150,.95)'); dg.addColorStop(0.45, 'rgba(245,184,28,.8)'); dg.addColorStop(1, 'rgba(245,184,28,0)');
        g.fillStyle = dg; g.beginPath(); g.ellipse(d.x, d.y, d.r * 2.4, d.r * 2.4 * (1 + Math.min(0.8, d.vy / 900)), 0, 0, 6.283); g.fill(); }
      g.fillStyle = 'rgba(255,224,130,.9)'; for (const s of splashes) { g.beginPath(); g.arc(s.x, s.y, 1.6, 0, 6.283); g.fill(); }
      g.globalCompositeOperation = 'source-over';
      // The liquid: diesel below, the golden palm biodiesel share above, mixing through drifting wisps.
      const x0 = v.x - v.w / 2 + 3, x1 = v.x + v.w / 2 - 3, surf = liquidTop(), depth = v.bottom - 3 - surf, band = depth * share;
      g.save(); vesselPath(3); g.closePath(); g.clip();
      const wave = x => surf + Math.sin(x * 0.05 + time * 2.2) * 2 + slosh * ((x - v.x) / v.w);
      const surfacePath = () => { g.beginPath(); g.moveTo(x0, v.bottom); for (let x = x0; x <= x1; x += 4) g.lineTo(x, wave(x)); g.lineTo(x1, v.bottom); g.closePath(); };
      surfacePath(); const dz = g.createLinearGradient(0, surf, 0, v.bottom); dz.addColorStop(0, '#7a4e12'); dz.addColorStop(1, '#2a1a07'); g.fillStyle = dz; g.fill();
      const bandBottom = surf + band;
      g.beginPath(); g.moveTo(x0, bandBottom + 10); for (let x = x0; x <= x1; x += 4) g.lineTo(x, wave(x)); for (let x = x1; x >= x0; x -= 4) g.lineTo(x, bandBottom + Math.sin(x * 0.07 - time * 1.3) * 4); g.closePath();
      const bz = g.createLinearGradient(0, surf, 0, bandBottom + 10); bz.addColorStop(0, 'rgba(255,226,110,.98)'); bz.addColorStop(0.7, 'rgba(232,170,30,.92)'); bz.addColorStop(1, 'rgba(176,112,20,.0)');
      g.fillStyle = bz; g.fill();
      g.globalCompositeOperation = 'lighter'; g.strokeStyle = 'rgba(255,214,90,.35)'; g.lineWidth = 2;
      for (const w of wisps) { const wx = x0 + (x1 - x0) * w.x; g.beginPath(); for (let t = 0; t <= 1; t += 0.05) { const yy = bandBottom - 6 + t * depth * 0.45, xx = wx + Math.sin(t * 6 + time * w.sp + w.ph) * v.w * 0.08; t ? g.lineTo(xx, yy) : g.moveTo(xx, yy); } g.stroke(); }
      for (const r of rings) { g.strokeStyle = `rgba(255,236,170,${r.a.toFixed(2)})`; g.lineWidth = 1.2; g.beginPath(); g.ellipse(r.x, r.y, r.r, r.r * 0.25, 0, 0, 6.283); g.stroke(); }
      g.globalCompositeOperation = 'source-over'; g.restore();
      // Glass: outline, highlights, and a scale marking the B20 and B30 shares.
      vesselPath(0); g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 2; g.stroke();
      g.fillStyle = 'rgba(255,255,255,.08)'; g.fillRect(v.x - v.w / 2 + 8, v.top + 10, 6, v.bottom - v.top - 30);
      g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(v.x + v.w / 2 - 14, v.top + 20, 2, (v.bottom - v.top) * 0.5);
      g.font = `600 ${wide ? 12 : 11}px ${FONT}`; g.textBaseline = 'middle';
      for (let p = 0; p <= 50; p += 10) {
        const y = surf + depth * p / 100, key = p === 20 || p === 30, on = Math.round(target * 100) === p;
        g.strokeStyle = key ? (on ? 'rgba(255,236,150,1)' : 'rgba(255,255,255,.6)') : 'rgba(255,255,255,.3)'; g.lineWidth = key ? 1.6 : 1;
        g.beginPath(); g.moveTo(v.x + v.w / 2, y); g.lineTo(v.x + v.w / 2 + (key ? 16 : 8), y); g.stroke();
        if (key) { g.fillStyle = on ? '#ffe38a' : 'rgba(255,255,255,.7)'; g.fillText(`B${p} · ${p}%`, v.x + v.w / 2 + 22, y); }
      }
      frames++;
    }
    function frame(now) {
      raf = 0;
      if (!section.isConnected || section.closest('.is-leaving')) return;
      const dt = last ? Math.min(0.1, (now - last) / 1000) : 1 / 60; last = now; // real time, even on a slow device
      if (visible && !document.hidden && !still()) { step(dt); draw(); raf = requestAnimationFrame(frame); }
    }
    const kick = () => { if (!raf && visible && !still()) { last = 0; raf = requestAnimationFrame(frame); } };
    const local = e => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    let lx = null, ly = null, lt = 0;
    section.addEventListener('pointermove', e => {
      const [x, y] = local(e), t = e.timeStamp;
      if (lx !== null && t > lt) { const kk = 1000 / Math.max(8, t - lt); wind.vx = wind.vx * 0.5 + (x - lx) * kk * 0.5; wind.vy = wind.vy * 0.5 + (y - ly) * kk * 0.5; }
      wind.x = x; wind.y = y; wind.at = performance.now(); lx = x; ly = y; lt = t;
    });
    section.addEventListener('pointerleave', () => { lx = null; });
    picks.forEach(b => b.addEventListener('click', () => { pick(Number(b.dataset.pourPick)); M()?.haptic?.(8); }));
    const io = 'IntersectionObserver' in window ? new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) kick(); }) : null;
    io?.observe(section);
    let rt = 0;
    const ro = 'ResizeObserver' in window ? new ResizeObserver(() => { clearTimeout(rt); rt = setTimeout(() => { layout(); draw(); }, 80); }) : null;
    ro?.observe(cv);
    layout(); draw();
    if (!io) { visible = true; kick(); }
    return {
      stop() { if (raf) cancelAnimationFrame(raf); raf = 0; io?.disconnect(); ro?.disconnect(); },
      redraw() { if (still()) { share = target; draw(); } else kick(); },
      pick,
      get stats() { return { frames, share, target, drops: drops.length, auto }; },
    };
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
      ${pourHtml(cfg)}
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
    const vtx = { x: 0, y: 0, zoom: 1, spin: 0, init: false };
    const pourEl = root.querySelector('[data-pour]'), pour = pourEl ? pourField(pourEl) : null;
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
            vr: 0.05 + 0.95 * Math.sqrt(Math.random()), arm: Math.floor(Math.random() * 3), th: Math.random() * 6.283, jit: (Math.random() - 0.5) * 0.55,
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
        const [r, gg, b] = ATM[key].hex; g.strokeStyle = `rgba(${r},${gg},${b},${key === 'dark' ? 0.045 : 0.055})`;
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
    let introStart = 0, introPlayed = false;
    function beginIntro() {
      mode = 'intro'; modeClock = 0; atm = 1; introStart = performance.now(); introPlayed = true;
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
      setTimeout(() => { if (current === api && FORMS[form].id === 'drop') go(0, { scatter: false }); }, 650); // unless a blend was already chosen
    }

    function step(dt) {
      time += dt; clock += dt; modeClock += dt;
      if (mode === 'intro') {
        // Real time, not animation time: a slow device never keeps anyone waiting at the preloader.
        const pr = Math.min(1, (performance.now() - introStart) / 1000 / INTRO), c = Math.round(100 * (1 - (1 - pr) ** 2.2));
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
      const sy = scrollY;
      // The vortex swirls around the form in the hero, or the middle of the screen once the page scrolls on.
      const tcx = mode === 'intro' ? W / 2 : roam ? W * 0.5 : place.x + FW * place.s / 2;
      const tcy = mode === 'intro' ? H * 0.46 : roam ? H * 0.5 : place.y + FH * place.s / 2;
      if (!vtx.init) { vtx.x = tcx; vtx.y = tcy; vtx.init = true; }
      const ve = Math.min(1, dt * 2); vtx.x += (tcx - vtx.x) * ve; vtx.y += (tcy - vtx.y) * ve;
      const prog = Math.min(1, sy / Math.max(1, document.documentElement.scrollHeight - H));
      vtx.zoom = mix(vtx.zoom, 0.9 + prog * 0.45, ve);
      vtx.spin = mix(vtx.spin, prog * 2.6, ve); // scrolling turns the whole vortex
      const Rm = Math.hypot(W, H) * 0.56 * vtx.zoom;
      const inner = [mix(224, 255, atm), mix(161, 214, atm), mix(14, 90, atm)], outer = [mix(31, 30, atm), mix(138, 174, atm), mix(92, 191, atm)];
      for (const p of parts) {
        p.px = p.x; p.py = p.y;
        let tx, ty, k;
        const formed = p.t >= 0 && cur[p.t] && !roam;
        if (formed) {
          const q = cur[p.t]; tx = place.x + q[0] * place.s; ty = place.y + q[1] * place.s; k = 7 * p.k * gather;
          const e = Math.min(1, dt * 3); p.r += (q[2] - p.r) * e; p.g += (q[3] - p.g) * e; p.b += (q[4] - p.b) * e;
        } else {
          // The vortex: every free particle orbits on one of three spiral arms, tilted like a galaxy seen at an angle;
          // inner particles turn faster and glow gold, outer ones cool to teal.
          p.th += (0.08 + 0.5 * (1 - p.vr) ** 1.5) * dt;
          const a = p.th + p.arm * 2.094 + 2.7 * Math.log(1 + p.vr * 5) + vtx.spin + p.jit, rr = p.vr * Rm;
          tx = vtx.x + Math.cos(a) * rr + pointer.nx * 18 * p.z; ty = vtx.y + Math.sin(a) * rr * 0.58 + pointer.ny * 12 * p.z;
          k = 1.7 * p.k;
          const e = Math.min(1, dt * 1.5), c0 = mix(inner[0], outer[0], p.vr), c1 = mix(inner[1], outer[1], p.vr), c2 = mix(inner[2], outer[2], p.vr);
          p.r += (c0 - p.r) * e; p.g += (c1 - p.g) * e; p.b += (c2 - p.b) * e;
        }
        let ax = (tx - p.x) * k * k * 0.5, ay = (ty - p.y) * k * k * 0.5;
        // Bee-like turbulence: strongest while the swarm travels, a soft shimmer once it holds a form.
        const n = 150 * (0.07 + swirl) + (formed ? 0 : 40);
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
      // The vortex core: a soft glow where the swirl turns.
      if (vtx.init) {
        const cr = Math.min(W, H) * 0.42 * vtx.zoom, gr = ctx.createRadialGradient(vtx.x, vtx.y, 0, vtx.x, vtx.y, cr);
        gr.addColorStop(0, atm > 0.5 ? `rgba(255,214,90,${(0.22 * atm).toFixed(3)})` : `rgba(155,225,93,${(0.32 * (1 - atm)).toFixed(3)})`);
        gr.addColorStop(0.45, atm > 0.5 ? `rgba(30,174,191,${(0.12 * atm).toFixed(3)})` : `rgba(30,174,191,${(0.1 * (1 - atm)).toFixed(3)})`);
        gr.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
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
    M()?.watch?.(() => { if (current === api) { if (still()) settle(); else kick(); pour?.redraw(); } });

    function stop() {
      pour?.stop();
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
      get form() { return FORMS[form].id; }, get frames() { return frames; }, get particles() { return N; }, get mode() { return mode; }, get roaming() { return roam; }, get introPlayed() { return introPlayed; }, get pour() { return pour?.stats; }, pick: pct => pour?.pick(pct) };
    current = api;
    return api;
  }
  return { html, start, forms: FORMS.map(f => f.id), get scene() { return current; } };
})();
