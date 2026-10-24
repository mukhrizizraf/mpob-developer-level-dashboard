// Mirror Hall: the step flow as a row of tall cards of living marbled liquid. Shared by the User and Developer levels.
// Each card is filled with slowly flowing marble in its step colour, veined with silver, and stands on a glossy floor
// that reflects it. One WebGL canvas behind the row draws every card and its reflection; the cards themselves stay the
// real buttons (icon, number, value). The step in hand glows brightest, steps done keep their colour, steps ahead are
// washed out; the liquid stirs where a finger or the pointer touches. The loop rests when the row is off screen and draws
// one still frame under Reduce motion. Without WebGL the cards fall back to a CSS gradient.

const HALL = (() => {
  const M = () => (typeof MOTION === 'undefined' ? null : MOTION);
  const VS = 'attribute vec2 a; void main() { gl_Position = vec4(a, 0.0, 1.0); }';
  const FS = `precision highp float;
uniform vec2 uPos, uSize, uM;   // card centre and size (device px, GL coordinates), pointer (device px)
uniform vec3 uC;                // step colour
uniform float uT, uSeed, uOn, uR, uStir, uDots;
float h(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float n(vec2 p) { vec2 i = floor(p), f = fract(p), u = f * f * (3.0 - 2.0 * f);
  return mix(mix(h(i), h(i + vec2(1.0, 0.0)), u.x), mix(h(i + vec2(0.0, 1.0)), h(i + vec2(1.0, 1.0)), u.x), u.y); }
float fbm(vec2 p) { float v = 0.0, a = 0.5; mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
  for (int i = 0; i < 4; i++) { v += a * n(p); p = m * p; a *= 0.5; } return v; }
float box(vec2 p, vec2 b, float r) { vec2 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }
void main() {
  vec2 loc = gl_FragCoord.xy - uPos, hs = uSize * 0.5; // ("half" is reserved in GLSL ES)
  float a = 1.0, refl = 0.0;
  if (loc.y < -hs.y) { // the floor: mirror the card about its bottom edge and fade it out
    float d = -hs.y - loc.y;
    loc.y = -uSize.y - loc.y; refl = 1.0;
    a = 0.42 * (1.0 - smoothstep(0.0, uSize.y * 0.34, d));
  }
  float edge = 1.0 - smoothstep(-1.0, 1.0, box(loc, hs, uR));
  if (edge * a < 0.002) discard;
  vec2 uv = (loc + hs) / uSize;
  // Marble: domain-warped noise, flowing slowly; a touch stirs it locally.
  vec2 p = uv * vec2(1.9, 2.7) + uSeed;
  vec2 tm = (uM - uPos) / uSize; float near = uStir * exp(-dot((loc / uSize) - tm, (loc / uSize) - tm) * 9.0);
  p += near * vec2(sin(uT * 2.0), cos(uT * 1.7)) * 0.9;
  float t = uT * 0.06;
  vec2 q = vec2(fbm(p + vec2(0.0, t)), fbm(p + vec2(5.2, 1.3) - t));
  vec2 r = vec2(fbm(p + 3.4 * q + vec2(1.7, 9.2) + 0.6 * t), fbm(p + 3.4 * q + vec2(8.3, 2.8) - 0.5 * t));
  float f = fbm(p + 3.4 * r);
  vec3 deep = vec3(0.02, 0.025, 0.04) + uC * 0.12;
  vec3 col = mix(deep, uC, smoothstep(0.28, 0.78, f));
  col = mix(col, uC * 1.25 + 0.08, smoothstep(0.7, 1.05, length(q)) * 0.5);
  float vein = pow(1.0 - abs(sin((f + r.x * 0.8) * 10.0)), 8.0);
  col = mix(col, vec3(0.94, 0.96, 1.0), vein * 0.7);
  float g = dot(col, vec3(0.3, 0.59, 0.11));
  col = mix(vec3(g), col, mix(0.3, 1.0, uOn)) * mix(0.5, 1.0, uOn);
  col += (1.0 - refl) * 0.14 * smoothstep(0.62, 1.0, uv.y); // a soft light from above, like glass
  if (uDots > 0.5) { vec2 c = mod(gl_FragCoord.xy, 6.0) - 3.0; col *= smoothstep(2.4, 1.7, length(c)); } // the dot-matrix look
  gl_FragColor = vec4(col * a * edge, a * edge);
}`;
  const probe = document.createElement('canvas').getContext('2d');
  const rgbOf = css => { probe.fillStyle = '#000'; probe.fillStyle = css || '#888'; const m = /^#(..)(..)(..)$/.exec(probe.fillStyle); return m ? [1, 2, 3].map(k => parseInt(m[k], 16) / 255) : [0.5, 0.5, 0.5]; };

  function mount(wrap) {
    const cv = document.createElement('canvas'); cv.className = 'hall-gl'; cv.setAttribute('aria-hidden', 'true');
    const gl = cv.getContext('webgl', { premultipliedAlpha: true, antialias: false, alpha: true });
    if (!gl) return null;
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null; };
    const vs = sh(gl.VERTEX_SHADER, VS), fs = sh(gl.FRAGMENT_SHADER, FS);
    if (!vs || !fs) return null;
    const prog = gl.createProgram(); gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
    gl.useProgram(prog);
    const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'a'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const U = {}; ['uPos', 'uSize', 'uM', 'uC', 'uT', 'uSeed', 'uOn', 'uR', 'uStir', 'uDots'].forEach(k => { U[k] = gl.getUniformLocation(prog, k); });
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); gl.enable(gl.SCISSOR_TEST);
    wrap.before(cv); wrap.classList.add('has-hall');

    const nodes = [...wrap.querySelectorAll('.node')];
    const cards = nodes.map((node, k) => ({ node, ring: node.querySelector('.ring'), on: 0.3, c: [0.5, 0.5, 0.5], seed: k * 3.7 + 1.3 }));
    let W = 0, H = 0, dpr = 1, raf = 0, last = 0, time = 0, frames = 0, visible = true, tick = 0, dots = 0, dead = false;
    const ptr = { x: -1e4, y: -1e4, stir: 0, to: 0 };
    const still = () => Boolean(M()?.reduce);

    function place() { // the canvas covers the row's box, inside the page
      Object.assign(cv.style, { left: `${wrap.offsetLeft}px`, top: `${wrap.offsetTop}px`, width: `${wrap.offsetWidth}px`, height: `${wrap.offsetHeight}px` });
      dpr = Math.min(2, window.devicePixelRatio || 1);
      W = Math.max(1, Math.round(wrap.offsetWidth * dpr)); H = Math.max(1, Math.round(wrap.offsetHeight * dpr));
      if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
      gl.viewport(0, 0, W, H);
    }
    function readColours() {
      cards.forEach(c => { c.c = rgbOf(getComputedStyle(c.node).getPropertyValue('--c').trim()); });
      dots = document.documentElement.dataset.theme === 'mono' ? 1 : 0;
    }
    function draw(dt) {
      if (++tick % 40 === 1) readColours();
      const base = cv.getBoundingClientRect();
      gl.disable(gl.SCISSOR_TEST); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); gl.enable(gl.SCISSOR_TEST);
      ptr.stir += (ptr.to - ptr.stir) * Math.min(1, dt * 4);
      gl.uniform1f(U.uT, time); gl.uniform1f(U.uDots, dots);
      gl.uniform2f(U.uM, (ptr.x - base.left) * dpr, H - (ptr.y - base.top) * dpr); gl.uniform1f(U.uStir, ptr.stir);
      for (const c of cards) {
        const want = c.node.classList.contains('is-active') ? 1 : c.node.classList.contains('is-done') ? 0.82 : 0.22;
        c.on += (want - c.on) * Math.min(1, dt * 5);
        const r = c.ring.getBoundingClientRect();
        const x = (r.left - base.left) * dpr, y = (r.top - base.top) * dpr, w = r.width * dpr, h = r.height * dpr;
        if (x + w < 0 || x > W) continue;
        const gy = H - (y + h), floor = h * 0.36;
        gl.scissor(Math.max(0, Math.floor(x - 2)), Math.max(0, Math.floor(gy - floor)), Math.ceil(w + 4), Math.ceil(h + floor + 2));
        gl.uniform2f(U.uPos, x + w / 2, gy + h / 2); gl.uniform2f(U.uSize, w, h);
        gl.uniform3f(U.uC, c.c[0], c.c[1], c.c[2]); gl.uniform1f(U.uSeed, c.seed); gl.uniform1f(U.uOn, c.on);
        gl.uniform1f(U.uR, (parseFloat(getComputedStyle(c.ring).borderTopLeftRadius) || 20) * dpr * Math.min(1, r.width / (c.ring.offsetWidth || r.width)));
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      }
      frames++;
    }
    function frame(now) {
      raf = 0;
      if (!wrap.isConnected || wrap.closest('.is-leaving')) { stop(); return; }
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60; last = now;
      time += dt;
      draw(dt);
      if (visible && !still() && !document.hidden) raf = requestAnimationFrame(frame);
    }
    const kick = () => { if (!raf) { last = 0; raf = requestAnimationFrame(frame); } };
    // Under Reduce motion the liquid holds still; it is drawn again whenever a card changes (a step, a resize).
    const redraw = () => { if (dead) return; if (still()) { readColours(); draw(1); } else kick(); };

    const onMove = e => { ptr.x = e.clientX; ptr.y = e.clientY; ptr.to = e.target.closest?.('.node') ? 1 : 0; if (ptr.to) kick(); };
    const onLeave = () => { ptr.to = 0; };
    wrap.addEventListener('pointermove', onMove, { passive: true }); wrap.addEventListener('pointerdown', onMove, { passive: true });
    wrap.addEventListener('pointerleave', onLeave); wrap.addEventListener('pointercancel', onLeave);
    wrap.addEventListener('scroll', redraw, { passive: true });
    const ro = 'ResizeObserver' in window ? new ResizeObserver(() => { place(); redraw(); }) : null; ro?.observe(wrap);
    const io = 'IntersectionObserver' in window ? new IntersectionObserver(([en]) => { visible = en.isIntersecting; if (visible) kick(); }) : null; io?.observe(wrap);
    const mo = new MutationObserver(redraw); nodes.forEach(n => mo.observe(n, { attributes: true, attributeFilter: ['class'] }));
    const onTheme = new MutationObserver(() => { readColours(); redraw(); }); onTheme.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    M()?.watch?.(redraw);

    function stop() {
      dead = true;
      if (raf) cancelAnimationFrame(raf); raf = 0;
      ro?.disconnect(); io?.disconnect(); mo.disconnect(); onTheme.disconnect();
      gl.getExtension('WEBGL_lose_context')?.loseContext(); // hand the GPU context back; each page makes its own
    }
    place(); readColours(); cards.forEach(c => { c.on = c.node.classList.contains('is-active') ? 1 : c.node.classList.contains('is-done') ? 0.82 : 0.22; });
    if (still()) draw(1); else kick();
    return { stop, redraw, get frames() { return frames; }, get cards() { return cards.length; } };
  }

  let current = null;
  return {
    mount(wrap) { current?.stop(); current = wrap ? mount(wrap) : null; return current; },
    get scene() { return current; },
  };
})();
