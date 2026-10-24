// Fluid motion for the Mandate Decision Studio (shared by the User and Developer levels).
// After Apple's "Designing Fluid Interfaces": every animation is a spring that starts from the value on
// screen, carries velocity and can be retargeted at any moment, so input is never locked out.
// No library: one requestAnimationFrame ticker. Reduced motion swaps springs for short cross-fades and
// follows the system setting live, during the session.
// Motion never touches research values: numbers are written immediately; only containers move.

const MOTION = (() => {
  const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  const watchers = new Set();
  const state = { reduce: Boolean(mq?.matches) };
  const onChange = event => { state.reduce = event.matches; watchers.forEach(fn => fn(state.reduce)); };
  if (mq?.addEventListener) mq.addEventListener('change', onChange); else mq?.addListener?.(onChange);

  /* ── Spring (damping ratio + response, Apple's designer parameters; mass 1) ── */
  const active = new Set();
  const dirty = new Set();
  let raf = 0, last = 0;
  function tick(now) {
    // Real elapsed time (4 ms sub-steps keep it stable), so a slow device or a busy frame never puts motion in slow motion.
    const dt = Math.min(0.1, last ? (now - last) / 1000 : 1 / 60);
    last = now;
    for (const s of [...active]) s.step(dt);
    for (const f of dirty) f.write();
    dirty.clear();
    raf = active.size ? requestAnimationFrame(tick) : 0;
    if (!raf) last = 0;
  }
  const wake = () => { if (!raf) raf = requestAnimationFrame(tick); };

  class Spring {
    constructor(value, onUpdate) { this.x = value; this.v = 0; this.target = value; this.onUpdate = onUpdate; this.done = []; }
    to(target, { response = 0.4, damping = 1, velocity, precision = 0.01 } = {}) {
      this.target = target; this.k = (2 * Math.PI / response) ** 2; this.c = 4 * Math.PI * damping / response; this.eps = precision;
      if (velocity !== undefined) this.v = velocity;
      if (Math.abs(this.x - target) < this.eps && Math.abs(this.v) < this.eps) { this.set(target); return Promise.resolve(true); }
      active.add(this); wake();
      return new Promise(resolve => this.done.push(resolve));
    }
    set(value) { this.x = value; this.v = 0; this.target = value; this.stop(true); this.onUpdate(value); }
    stop(finished = false) { active.delete(this); const d = this.done; this.done = []; d.forEach(r => r(finished)); }
    step(dt) {
      // Semi-implicit Euler in 4 ms sub-steps: stable for stiff, fast springs.
      const n = Math.max(1, Math.ceil(dt / 0.004)); const h = dt / n;
      for (let i = 0; i < n; i++) { this.v += (-this.k * (this.x - this.target) - this.c * this.v) * h; this.x += this.v * h; }
      if (Math.abs(this.v) < this.eps * 10 && Math.abs(this.x - this.target) < this.eps) { this.x = this.target; this.v = 0; this.onUpdate(this.x); this.stop(true); return; }
      this.onUpdate(this.x);
    }
  }

  /* ── Fluid element: x, y, scale, rotateY, opacity and blur, composed into one write per frame ── */
  const DEF = { x: 0, y: 0, s: 1, ry: 0, o: 1, blur: 0 };
  class Fluid {
    constructor(el) { this.el = el; this.st = { ...DEF }; this.sp = {}; }
    spring(key) { return this.sp[key] ??= new Spring(this.st[key], v => { this.st[key] = v; dirty.add(this); wake(); }); }
    set(values) { for (const [k, v] of Object.entries(values)) this.spring(k).set(v); this.write(); return this; }
    to(values, opts = {}) {
      if (state.reduce) { this.set(values); return Promise.resolve(true); }
      return Promise.all(Object.entries(values).map(([k, v]) => this.spring(k).to(v, { ...opts, ...(opts[k] || {}), velocity: opts.velocity?.[k] })));
    }
    velocity(key) { return this.sp[key]?.v ?? 0; }
    stop() { Object.values(this.sp).forEach(s => s.stop()); }
    clear() { this.stop(); this.st = { ...DEF }; this.sp = {}; const st = this.el.style; st.transform = ''; st.opacity = ''; st.filter = ''; }
    write() {
      const { x, y, s, ry, o, blur } = this.st; const st = this.el.style;
      st.transform = x === 0 && y === 0 && s === 1 && ry === 0 ? '' : `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0)${ry ? ` rotateY(${ry.toFixed(3)}deg)` : ''}${s !== 1 ? ` scale(${s.toFixed(4)})` : ''}`;
      st.opacity = o >= 0.999 ? '' : String(Math.max(0, o).toFixed(3));
      st.filter = blur > 0.05 ? `blur(${blur.toFixed(2)}px)` : '';
    }
  }
  const fluid = el => el._fluid ??= new Fluid(el);

  // One style property (width/left/height in %), sprung from its on-screen value.
  function prop(el, name, value, unit = '%', opts = {}) {
    const key = `_sp_${name}`;
    if (!el[key]) {
      const start = parseFloat(el.style[name]);
      el[key] = new Spring(Number.isFinite(start) ? start : value, v => { el.style[name] = `${v.toFixed(3)}${unit}`; });
    }
    const sp = el[key];
    if (state.reduce || opts.immediate || !el.isConnected) { sp.set(value); return Promise.resolve(true); }
    return sp.to(value, { response: 0.32, damping: 1, precision: 0.02, ...opts });
  }

  /* ── CSS spring easing: the same physics, sampled into linear() for simple state changes ── */
  function cssSpring(response, damping, samples = 44) {
    const k = (2 * Math.PI / response) ** 2, c = 4 * Math.PI * damping / response;
    let x = 0, v = 0; const pts = [0]; const h = 1 / 600; let t = 0;
    // Settle time: when the remaining motion is imperceptible.
    const trace = []; while (t < 3) { v += (-k * (x - 1) - c * v) * h; x += v * h; t += h; trace.push(x); if (t > 0.05 && Math.abs(1 - x) < 0.001 && Math.abs(v) < 0.01) break; }
    for (let i = 1; i <= samples; i++) pts.push(trace[Math.min(trace.length - 1, Math.round(i / samples * (trace.length - 1)))]);
    pts[pts.length - 1] = 1;
    return { easing: `linear(${pts.map(p => +p.toFixed(4)).join(', ')})`, duration: Math.round(t * 1000) };
  }
  if (window.CSS?.supports?.('transition-timing-function', 'linear(0, 1)')) {
    const root = document.documentElement.style;
    for (const [name, r, d] of [['ui', 0.3, 1], ['soft', 0.42, 1], ['bounce', 0.38, 0.78], ['sheet', 0.34, 0.86]]) {
      const s = cssSpring(r, d); root.setProperty(`--spring-${name}`, s.easing); root.setProperty(`--spring-${name}-ms`, `${s.duration}ms`);
    }
  }

  /* ── Gesture helpers (Designing Fluid Interfaces sample code) ── */
  const project = (velocity, rate = 0.998) => velocity / 1000 * rate / (1 - rate);
  const rubberband = (overshoot, dimension, constant = 0.55) => overshoot * dimension * constant / (dimension + constant * Math.abs(overshoot));

  // Horizontal swipe with hysteresis, 1:1 tracking, rubber-band at the ends and velocity hand-off.
  // ignore: selector of children that keep their own gestures (sliders, tables, charts, inputs).
  function swipe(root, { surface, ignore, can, onMove, onEnd }) {
    let g = null;
    root.addEventListener('pointerdown', event => {
      if (event.button !== 0 || !event.isPrimary) return;
      const el = event.target.closest?.(surface);
      if (!el || event.target.closest(ignore)) return;
      g = { el, id: event.pointerId, x0: event.clientX, y0: event.clientY, axis: null, hist: [[event.timeStamp, event.clientX]], width: el.offsetWidth };
    });
    root.addEventListener('pointermove', event => {
      if (!g || event.pointerId !== g.id) return;
      const dx = event.clientX - g.x0, dy = event.clientY - g.y0;
      if (!g.axis) {
        if (Math.hypot(dx, dy) < 10) return;
        g.axis = Math.abs(dx) > Math.abs(dy) * 1.2 ? 'x' : 'y';
        if (g.axis === 'y') { g = null; return; }
        try { g.el.setPointerCapture(g.id); } catch {}
        g.el.classList.add('is-dragging');
      }
      g.hist.push([event.timeStamp, event.clientX]); if (g.hist.length > 6) g.hist.shift();
      const dir = dx < 0 ? 1 : -1;
      const offset = can(dir) ? dx : rubberband(dx, g.width);
      g.offset = offset; onMove(g.el, offset, g.width);
    });
    const end = event => {
      if (!g || event.pointerId !== g.id) return;
      const done = g; g = null;
      // A flick on a busy frame can arrive whole, with no move before the release: judge it by the release point.
      if (!done.axis && event.type === 'pointerup' && Number.isFinite(event.clientX)) {
        const dx = event.clientX - done.x0, dy = event.clientY - done.y0;
        if (Math.hypot(dx, dy) >= 10 && Math.abs(dx) > Math.abs(dy) * 1.2) { done.axis = 'x'; done.offset = 0; }
      }
      if (done.axis !== 'x') return;
      done.el.classList.remove('is-dragging');
      // Slow frames coalesce pointer moves, so the release point itself counts as the last sample.
      if (event.type === 'pointerup' && Number.isFinite(event.clientX) && event.clientX !== done.hist.at(-1)[1]) {
        const dx = event.clientX - done.x0;
        done.offset = can(dx < 0 ? 1 : -1) ? dx : rubberband(dx, done.width);
        done.hist.push([event.timeStamp, event.clientX]); if (done.hist.length > 6) done.hist.shift();
      }
      const [t0, x0] = done.hist[0], [t1, x1] = done.hist.at(-1);
      const velocity = t1 > t0 ? (x1 - x0) / (t1 - t0) * 1000 : 0;
      const projected = done.offset + project(velocity, 0.99);
      const dir = projected < 0 ? 1 : -1;
      const commit = Math.abs(projected) > done.width * 0.32 && Math.sign(velocity || projected) === Math.sign(projected) && can(dir);
      onEnd(done.el, { commit, dir, offset: done.offset, velocity, width: done.width });
      // A drag is not a click: swallow the click that follows the release.
      if (Math.abs(done.offset) > 6) {
        const swallow = e => { e.stopPropagation(); e.preventDefault(); };
        window.addEventListener('click', swallow, { capture: true, once: true });
        setTimeout(() => window.removeEventListener('click', swallow, { capture: true }), 350);
      }
    };
    root.addEventListener('pointerup', end);
    root.addEventListener('pointercancel', end);
  }

  // Short, meaningful haptic tick on devices that support it (never during reduced motion).
  const haptic = (ms = 8) => { if (!state.reduce) try { navigator.vibrate?.(ms); } catch {} };

  return { state, watch: fn => watchers.add(fn), get reduce() { return state.reduce; }, Spring, fluid, prop, cssSpring, project, rubberband, swipe, haptic };
})();
