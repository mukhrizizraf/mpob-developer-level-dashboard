// Step morph: how the Mirror Hall step cards arrive when an objective or the Decision page opens.
// The cards of the page being left break into dust in their own colours; the dust spirals into a vortex over the step
// row; the new cards spin out of that vortex, fly up in an arc and drop into their places with a small bounce, then hand
// over to the real liquid cards (hall.js) underneath. The flying cards are copies in a fixed layer above the page, so
// nothing is clipped by the row's sideways scroll; the real buttons stay in place and usable the whole time.
// The hive and its writing (home.js) are not touched. Under Reduce motion nothing moves and the cards simply appear.
// The flight is a first welcome: each page plays it once per visit to the studio. Going back to a page already seen,
// the cards only pop up in place (a 10px rise from 94% size on a spring with a small overshoot, 30ms apart, about
// half a second), so moving back and forth between objectives is quick but still alive.
// Self-contained: it brings its own small stylesheet, so shared.css stays identical across the two levels.
// API:  MORPH.capture(oldPage) -> boxes   (call before the old page starts to move)
//       MORPH.play(newPage | null, boxes, key, { quiet })  (null for Home: the old cards just turn to dust; key names
//       the page; quiet: the page opened without a click, so the cards pop and the flight is kept for the first click)

const MORPH = (() => {
  const TAU = Math.PI * 2;
  const M = () => (typeof MOTION === 'undefined' ? null : MOTION);
  const reduce = () => Boolean(M() ? M().reduce : window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
  // Timing (seconds). Card i starts STAGGER * i after card 0.
  const T = { spin: 0.85, fly: 0.62, swap: 0.34, fade: 0.24, stagger: 0.1 };
  // The revisit pop: a damped spring (damping ratio 0.75, launched at 8 units/s) sampled for CSS linear(): halfway in
  // a tenth of its time, 5% overshoot. The cubic-bezier written before it is the fallback for browsers without linear().
  const POP_SPRING = 'linear(0, 0.142, 0.275, 0.398, 0.51, 0.61, 0.697, 0.771, 0.835, 0.888, 0.931, 0.966, 0.993, 1.013, 1.028, 1.038, 1.045, 1.048, 1.049, 1.048, 1.046, 1.043, 1.039, 1.035, 1.031, 1.027, 1.023, 1.019, 1.016, 1.013, 1.01, 1.008, 1.006, 1.004, 1.003, 1.002, 1)';

  const CSS = `
.morph-dust { position: fixed; inset: 0; width: 100%; height: 100%; z-index: 18; pointer-events: none; }
.morph-layer { position: fixed; inset: 0; z-index: 19; pointer-events: none; overflow: hidden; }
.morph-layer .node.morph-card { position: absolute; left: 0; top: 0; margin: 0; animation: none; will-change: transform, opacity; }
.morph-layer .node-title, .morph-layer .node-label, .morph-layer .node-value { visibility: hidden; }
:root .morph-layer .ring { transition: none; overflow: hidden;
  background:
    radial-gradient(70% 55% at 28% 22%, color-mix(in srgb, var(--c) 45%, #fff) 0%, transparent 70%),
    radial-gradient(80% 60% at 78% 88%, color-mix(in srgb, var(--c) 55%, #000) 0%, transparent 70%),
    conic-gradient(from 200deg at 60% 40%, var(--c), color-mix(in srgb, var(--c) 70%, #fff), var(--c), color-mix(in srgb, var(--c) 62%, #000), var(--c));
  -webkit-box-reflect: below 6px linear-gradient(transparent 64%, rgba(0, 0, 0, .3)); }
.morph-layer .morph-sheen { position: absolute; inset: 0; border-radius: inherit; pointer-events: none;
  background: linear-gradient(115deg, transparent 34%, rgba(255, 255, 255, .55) 48%, transparent 62%);
  animation: morphSheen 1s ease-in-out infinite; }
@keyframes morphSheen { from { transform: translateX(-130%); } to { transform: translateX(130%); } }
.flow-wrap.is-morphing .node { animation: none; }
:root .flow-wrap.is-morphing .node.morph-wait .ring { transform: scale(.001) !important; opacity: 0 !important; transition: none !important; }
.flow-wrap.is-morphing .node .node-title, .flow-wrap.is-morphing .node .node-value {
  transition: opacity .45s ease, transform .6s var(--spring, cubic-bezier(.2, .9, .3, 1.2)); }
.flow-wrap.is-morphing .node.morph-wait .node-title, .flow-wrap.is-morphing .node.morph-wait .node-value { opacity: 0; transform: translateY(10px); }
:root .flow-wrap .node.morph-snap .ring { transition: none !important; }
.flow-wrap.morph-seen .node { animation: morphPop .5s cubic-bezier(.3, 1.3, .5, 1) backwards, morphFade .16s ease-out backwards;
  animation-timing-function: ${POP_SPRING}, ease-out; animation-delay: calc(var(--i, 0) * 30ms); }
@keyframes morphPop { from { transform: translateY(10px) scale(.94); } to { transform: none; } }
@keyframes morphFade { from { opacity: 0; } to { opacity: 1; } }`;

  let layer = null, cv = null, ctx = null, W = 0, H = 0, dpr = 1, raf = 0, last = 0, clock = 0;
  let run = null;
  const seen = new Set(); // pages whose cards have already flown in
  const parts = [], ripples = [];

  function ensure() {
    if (layer) return true;
    const style = document.createElement('style'); style.id = 'morph-style'; style.textContent = CSS; document.head.appendChild(style);
    cv = document.createElement('canvas'); cv.className = 'morph-dust'; cv.setAttribute('aria-hidden', 'true');
    layer = document.createElement('div'); layer.className = 'morph-layer has-hall'; layer.setAttribute('aria-hidden', 'true');
    document.body.append(cv, layer);
    ctx = cv.getContext('2d');
    size(); addEventListener('resize', size);
    M()?.watch?.(on => { if (on) finish(true); });
    return true;
  }
  function size() {
    dpr = Math.min(2, window.devicePixelRatio || 1); W = innerWidth; H = innerHeight;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
  }
  const colourOf = el => (el && getComputedStyle(el).getPropertyValue('--c').trim()) || '#7b8af0';
  function darkGround() {
    for (const el of [document.body, document.documentElement]) {
      const m = getComputedStyle(el).backgroundColor.match(/[\d.]+/g);
      if (!m || (m.length > 3 && Number(m[3]) === 0)) continue;
      return 0.299 * m[0] + 0.587 * m[1] + 0.114 * m[2] < 128;
    }
    return Boolean(window.matchMedia?.('(prefers-color-scheme: dark)').matches);
  }

  /* ── dust ─────────────────────────────────────────── */
  function spawn(p) { parts.push(p); if (parts.length > 1600) parts.splice(0, parts.length - 1600); kick(); }
  function dustFrom(box, n, target) {
    for (let k = 0; k < n; k++) {
      const x = box.x + Math.random() * box.w, y = box.y + Math.random() * box.h;
      // a dissolve that sweeps across the card: the far side lets go a little later
      const delay = ((x - box.x) / Math.max(1, box.w)) * 0.22 + Math.random() * 0.08;
      spawn({ x, y, vx: (Math.random() - 0.5) * 90, vy: -30 - Math.random() * 90, age: -delay, life: 0.9 + Math.random() * 0.7,
        r: 0.8 + Math.random() * 1.8, c: box.c, tx: target?.x, ty: target?.y, seek: Boolean(target), sw: (Math.random() < 0.5 ? -1 : 1) * (0.8 + Math.random()) });
    }
  }
  function dissolve(boxes, target) {
    if (!boxes?.length || reduce()) return;
    ensure();
    boxes.forEach(b => dustFrom(b, Math.min(110, Math.round((b.w * b.h) / 240)), target));
  }
  function burst(x, y, c, w) {
    for (let k = 0; k < 26; k++) {
      const a = Math.PI + Math.random() * Math.PI, s = 60 + Math.random() * 220;
      spawn({ x: x + (Math.random() - 0.5) * w * 0.8, y, vx: Math.cos(a) * s * 1.6, vy: Math.sin(a) * s * 0.5, age: 0, life: 0.45 + Math.random() * 0.45, r: 0.8 + Math.random() * 1.6, c, seek: false });
    }
    ripples.push({ x, y, c, age: 0, life: 0.7, w });
  }

  /* ── cards ────────────────────────────────────────── */
  function capture(page) {
    if (!page || reduce()) return [];
    const out = [];
    page.querySelectorAll('.flow .node').forEach(node => {
      const r = node.querySelector('.ring')?.getBoundingClientRect();
      if (r && r.width > 6 && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth) out.push({ x: r.left, y: r.top, w: r.width, h: r.height, c: colourOf(node) });
    });
    if (run) run.cards.forEach(c => { if (!c.done) { const r = c.ring.getBoundingClientRect(); if (r.width > 6) out.push({ x: r.left, y: r.top, w: r.width, h: r.height, c: c.c }); } });
    return out;
  }

  function vortexOf(wrap, nodes) {
    const wr = wrap.getBoundingClientRect();
    const x0 = Math.max(wr.left, 0), x1 = Math.min(wr.right, innerWidth);
    let y = 0, n = 0;
    nodes.forEach(node => { const r = node.getBoundingClientRect(); y += r.top + node._ry; n++; });
    return { x: (x0 + x1) / 2, y: n ? y / n : wr.top + wr.height / 2, R: Math.min(210, Math.max(90, (x1 - x0) * 0.28)) };
  }

  function play(page, leaving = [], key = null, { quiet = false } = {}) {
    const wrap = page?.querySelector('.flow-wrap');
    const nodes = wrap ? [...wrap.querySelectorAll('.flow .node')] : [];
    // Seen before, or a quiet arrival (the studio opening on this page, a key press, an address change): no flight and no
    // dust, the cards just pop up in place. A quiet arrival does not count as the visit, so the first click still flies.
    if (wrap && (quiet || (key != null && seen.has(key)))) {
      ensure(); finish(false); wrap.classList.add('morph-seen'); return;
    }
    if (!wrap || !nodes.length || reduce()) { finish(false); dissolve(leaving, null); return; }
    ensure(); finish(false); // cards still in the air were already captured as dust
    const wr = wrap.getBoundingClientRect();
    if (wr.bottom < 0 || wr.top > innerHeight) { dissolve(leaving, null); return; }
    if (key != null) seen.add(key);

    nodes.forEach(node => { const ring = node.querySelector('.ring'); node._rx = ring.offsetLeft + ring.offsetWidth / 2; node._ry = ring.offsetTop + ring.offsetHeight / 2; node._rh = ring.offsetHeight; });
    const v = vortexOf(wrap, nodes);
    dissolve(leaving, v);
    if (!leaving.length) { // first arrival: a little dust drifts in from the sides to feed the vortex
      for (let k = 0; k < 120; k++) {
        const side = Math.random() < 0.5 ? -1 : 1;
        spawn({ x: v.x + side * (v.R * 1.6 + Math.random() * 220), y: v.y + (Math.random() - 0.5) * 220, vx: 0, vy: 0, age: -Math.random() * 0.3, life: 1 + Math.random() * 0.5,
          r: 0.8 + Math.random() * 1.5, c: colourOf(nodes[k % nodes.length]), tx: v.x, ty: v.y, seek: true, sw: side * (0.9 + Math.random()) });
      }
    }

    wrap.classList.add('is-morphing');
    const cards = nodes.map((node, i) => {
      const clone = node.cloneNode(true);
      clone.removeAttribute('data-go'); clone.removeAttribute('id'); clone.tabIndex = -1; clone.disabled = true;
      clone.querySelectorAll('[id],[data-chip]').forEach(e => { e.removeAttribute('id'); e.removeAttribute('data-chip'); });
      clone.classList.remove('morph-wait', 'morph-snap'); clone.classList.add('morph-card');
      clone.style.width = `${node.offsetWidth}px`;
      clone.style.transformOrigin = `${node._rx}px ${node._ry}px`;
      clone.style.opacity = '0';
      const ring = clone.querySelector('.ring');
      const sheen = document.createElement('i'); sheen.className = 'morph-sheen'; ring.appendChild(sheen);
      layer.appendChild(clone);
      node.classList.add('morph-wait');
      const dir = i % 2 ? -1 : 1;
      return { node, clone, ring, disc: clone.querySelector('.disc'), c: colourOf(node), i, dir,
        th0: (i / nodes.length) * TAU + Math.random() * 0.3, delay: i * T.stagger, lift: 110 + (i % 3) * 22,
        landed: false, swapAt: 0, done: false, p0: null };
    });
    run = { wrap, nodes, cards, t: 0 };
    kick();
  }

  // Where card c sits during the spin, at local time u (0..T.spin).
  function spinState(c, u, v) {
    const k = Math.min(1, u / T.spin), e = 1 - Math.pow(1 - k, 3);
    const th = c.th0 + c.dir * u * 6.2;
    const r = v.R * (0.22 + 0.78 * e), depth = Math.sin(th);
    return { x: v.x + Math.cos(th) * r, y: v.y - 8 + depth * r * 0.32, s: (0.42 + 0.3 * e) * (0.86 + 0.14 * depth),
      ry: c.dir * 1080 * e, rz: Math.cos(th) * 12 * (1 - 0.4 * e), depth };
  }
  const bez = (a, b, c, d, t) => { const m = 1 - t; return m * m * m * a + 3 * m * m * t * b + 3 * m * t * t * c + t * t * t * d; };

  function stepCards(dt) {
    const R = run; R.t += dt;
    if (!R.wrap.isConnected || R.wrap.closest('.is-leaving')) { finish(false, true); return; }
    const v = vortexOf(R.wrap, R.nodes);
    let alive = 0;
    for (const c of R.cards) {
      if (c.done) continue; alive++;
      const u = R.t - c.delay;
      if (u < 0) continue;
      const nr = c.node.getBoundingClientRect();
      const tx = nr.left + c.node._rx, ty = nr.top + c.node._ry;
      let x, y, s = 1, sx = 1, sy = 1, ry = 0, rz = 0, op = 1, z = 100;
      if (u < T.spin) {
        const st = spinState(c, u, v);
        ({ x, y, s, ry, rz } = st); z = Math.round(100 + st.depth * 40);
        op = Math.min(1, u / 0.18) * (0.7 + 0.3 * (st.depth * 0.5 + 0.5));
        if (Math.random() < 0.7) spawn({ x: x + (Math.random() - 0.5) * 30, y: y + (Math.random() - 0.5) * 40, vx: (Math.random() - 0.5) * 40, vy: (Math.random() - 0.5) * 40, age: 0, life: 0.5, r: 0.7 + Math.random() * 1.3, c: c.c, seek: false });
      } else if (u < T.spin + T.fly) {
        const p0 = c.p0 || (c.p0 = spinState(c, T.spin, v));
        const k = (u - T.spin) / T.fly, e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
        x = bez(p0.x, p0.x + (tx - p0.x) * 0.15, tx, tx, e);
        y = bez(p0.y, p0.y - c.lift, ty - c.lift * 1.2, ty, e);
        const ryEnd = c.dir > 0 ? Math.ceil(p0.ry / 360 + 0.5) * 360 : Math.floor(p0.ry / 360 - 0.5) * 360;
        ry = p0.ry + (ryEnd - p0.ry) * (1 - Math.pow(1 - k, 3));
        rz = p0.rz * (1 - e) + Math.sin(k * Math.PI) * c.dir * 8;
        s = p0.s + (1 - p0.s) * e; z = 140;
        for (let q = 0; q < 2; q++) spawn({ x: x + (Math.random() - 0.5) * 24, y: y + (Math.random() - 0.5) * 30, vx: (Math.random() - 0.5) * 30, vy: 20 + Math.random() * 40, age: 0, life: 0.55, r: 0.7 + Math.random() * 1.6, c: c.c, seek: false });
      } else {
        const k = u - T.spin - T.fly;
        if (!c.landed) { c.landed = true; burst(tx, nr.top + c.node._ry + c.node._rh / 2, c.c, c.node._rh * 0.75); M()?.haptic?.(5); if (typeof SOUND !== 'undefined') SOUND.land(); }
        const sq = Math.exp(-7 * k) * Math.cos(17 * k);
        sy = 1 - 0.11 * sq; sx = 1 + 0.065 * sq;
        x = tx; y = ty - Math.abs(Math.sin(13 * k)) * 12 * Math.exp(-9 * k) + (c.node._rh / 2) * (1 - sy);
        if (k >= T.swap && !c.swapAt) { // hand over to the real liquid card underneath
          c.swapAt = R.t;
          c.node.classList.add('morph-snap'); c.node.classList.remove('morph-wait');
          const n = c.node; requestAnimationFrame(() => requestAnimationFrame(() => n.classList.remove('morph-snap')));
        }
        if (c.swapAt) { op = 1 - (R.t - c.swapAt) / T.fade; if (op <= 0) { c.clone.remove(); c.done = true; continue; } }
      }
      const fx = Math.cos((ry * Math.PI) / 180);
      if (c.disc) c.disc.style.opacity = Math.max(0, Math.min(1, fx * 4)).toFixed(2); // the back of a card has no icon
      c.clone.style.zIndex = z;
      c.clone.style.opacity = op.toFixed(3);
      c.clone.style.transform = `translate3d(${(x - c.node._rx).toFixed(1)}px, ${(y - c.node._ry).toFixed(1)}px, 0) perspective(900px) rotateY(${ry.toFixed(1)}deg) rotateZ(${rz.toFixed(2)}deg) scale(${(s * sx).toFixed(4)}, ${(s * sy).toFixed(4)})`;
    }
    if (!alive) { R.wrap.classList.remove('is-morphing'); run = null; }
  }

  // End the current flight. withDust: the cards in the air break into dust (a new tab was picked mid-flight).
  function finish(instant, withDust = false) {
    if (!run) return;
    const R = run; run = null;
    R.cards.forEach(c => {
      if (!c.done && withDust && !instant && c.clone.style.opacity !== '0') {
        const r = c.ring.getBoundingClientRect(); if (r.width > 6) dustFrom({ x: r.left, y: r.top, w: r.width, h: r.height, c: c.c }, 60, null);
      }
      c.clone.remove(); c.node.classList.remove('morph-wait', 'morph-snap');
    });
    R.wrap.classList.remove('is-morphing');
    if (instant) { parts.length = 0; ripples.length = 0; ctx?.clearRect(0, 0, cv.width, cv.height); }
  }

  /* ── loop ─────────────────────────────────────────── */
  // One loop only: dust spawned during a frame must not start a second loop.
  let inFrame = false;
  function kick() { if (!raf && !inFrame) { last = 0; raf = requestAnimationFrame(frame); } }
  function frame(now) {
    raf = 0; inFrame = true;
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60; last = now; clock += dt;
    if (reduce()) { inFrame = false; finish(true); return; }
    if (run) stepCards(dt);
    draw(dt);
    inFrame = false;
    if (run || parts.length || ripples.length) raf = requestAnimationFrame(frame);
    else ctx.clearRect(0, 0, cv.width, cv.height);
  }
  function draw(dt) {
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const dark = darkGround();
    ctx.globalCompositeOperation = dark ? 'lighter' : 'source-over';
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i]; p.age += dt;
      if (p.age < 0) continue;
      if (p.age > p.life) { parts.splice(i, 1); continue; }
      if (p.seek) {
        const dx = p.tx - p.x, dy = p.ty - p.y;
        p.vx += (dx * 3.4 - dy * p.sw * 2.6) * dt; p.vy += (dy * 3.4 + dx * p.sw * 2.6) * dt;
        const drag = Math.pow(0.18, dt); p.vx *= drag; p.vy *= drag;
      } else { const drag = Math.pow(0.22, dt); p.vx *= drag; p.vy = p.vy * drag - 14 * dt; }
      p.x += p.vx * dt; p.y += p.vy * dt;
      const a = Math.min(1, p.age / 0.08) * (1 - p.age / p.life);
      ctx.globalAlpha = (dark ? 0.9 : 0.75) * a;
      ctx.fillStyle = p.c;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, TAU); ctx.fill();
    }
    for (let i = ripples.length - 1; i >= 0; i--) {
      const r = ripples[i]; r.age += dt;
      if (r.age > r.life) { ripples.splice(i, 1); continue; }
      const k = r.age / r.life, e = 1 - Math.pow(1 - k, 3), rx = r.w * (0.5 + 0.9 * e);
      ctx.globalAlpha = (1 - k) * (dark ? 0.7 : 0.5);
      ctx.strokeStyle = r.c; ctx.lineWidth = 2 * (1 - k) + 0.5;
      ctx.beginPath(); ctx.ellipse(r.x, r.y + 4, rx, rx * 0.16, 0, 0, TAU); ctx.stroke();
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  }

  return { capture, play, dissolve, finish: () => finish(true), get busy() { return Boolean(run); } };
})();
