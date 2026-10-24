// Appearance: six looks (Classic follows the device, Classic dark is always dark; the others set their own shapes, controls and type).
// Shared by the User and Developer levels. The choice is a per-viewer convenience kept in localStorage;
// the page renders correctly without it. Switching reveals the new theme in a circle from the button.

const THEME = (() => {
  const M = () => (typeof MOTION === 'undefined' ? null : MOTION); // motion.js, when present
  // Six looks. Each changes shapes, controls, icon strokes and type as well as colour (see shared.css "Looks").
  const ALL = [
    { id: 'system', name: 'Classic', note: 'Follows the device, light or dark' },
    { id: 'dark', name: 'Classic dark', note: 'The classic look, always dark', dark: true },
    { id: 'bloom', name: 'Bloom', note: 'Soft, big and rounded' },
    { id: 'tonal', name: 'Tonal', note: 'Calm tones, organic shapes' },
    { id: 'citrus', name: 'Citrus', note: 'Crisp, bright, chunky sliders' },
    { id: 'mono', name: 'Mono', note: 'Dot-matrix minimal, dark', dark: true },
  ];
  const KEY = 'mpob-theme';
  const root = document.documentElement;
  const darkQuery = window.matchMedia?.('(prefers-color-scheme: dark)');
  let current = 'system';
  try { const saved = localStorage.getItem(KEY); if (ALL.some(t => t.id === saved)) current = saved; } catch {}

  const isDark = id => id === 'system' ? Boolean(darkQuery?.matches) : id === 'dark' || Boolean(ALL.find(t => t.id === id)?.dark);
  function paintMeta() {
    // Status bar and browser chrome follow the page background.
    const bg = getComputedStyle(document.body).backgroundColor;
    let meta = document.querySelector('meta[name="theme-color"]:not([media])');
    if (!meta) { meta = document.createElement('meta'); meta.name = 'theme-color'; document.head.appendChild(meta); }
    meta.content = bg;
  }
  function apply(id) {
    current = id;
    if (id === 'system') delete root.dataset.theme; else root.dataset.theme = id;
    root.style.colorScheme = isDark(id) ? 'dark' : 'light';
    paintMeta();
    document.querySelectorAll('[data-theme-pick]').forEach(b => b.setAttribute('aria-checked', String(b.dataset.themePick === id)));
    const label = document.querySelector('#theme-btn .theme-name'); if (label) label.textContent = ALL.find(t => t.id === id)?.name ?? '';
  }
  function choose(id, origin) {
    if (id === current) return;
    try { localStorage.setItem(KEY, id); } catch {}
    const reduce = M()?.reduce;
    // Circle reveal from the chosen swatch (View Transitions). Elsewhere: a short colour cross-fade.
    if (document.startViewTransition && !reduce && origin) {
      const r = origin.getBoundingClientRect();
      const x = r.left + r.width / 2, y = r.top + r.height / 2;
      const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
      root.style.setProperty('--vt-x', `${x}px`); root.style.setProperty('--vt-y', `${y}px`); root.style.setProperty('--vt-r', `${radius}px`);
      root.classList.add('theme-vt');
      const t = document.startViewTransition(() => apply(id));
      t.finished.finally(() => root.classList.remove('theme-vt'));
    } else {
      root.classList.add('theme-fade');
      apply(id);
      setTimeout(() => root.classList.remove('theme-fade'), reduce ? 220 : 420);
    }
  }

  // The swatch is a small specimen of the look: its icon shape, colours and a mini button.
  const swatch = t => `<span class="sw" data-look="${t.id}" aria-hidden="true"><i></i></span>`;
  function mount(host) {
    host.innerHTML = `<button type="button" class="theme-btn" id="theme-btn" aria-haspopup="dialog" aria-expanded="false" aria-controls="theme-pop">
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 3.5a8.5 8.5 0 0 1 0 17z" fill="currentColor"/></svg><span class="theme-name"></span></button>
      <div class="theme-pop" id="theme-pop" role="dialog" aria-label="Appearance" hidden>
        <div class="theme-head"><b>Appearance</b><span>Saved on this device only</span></div>
        <div class="theme-grid" role="radiogroup" aria-label="Look">${ALL.map(t => `<button type="button" role="radio" class="theme-opt" data-theme-pick="${t.id}" aria-checked="false">${swatch(t)}<span><b>${t.name}</b><small>${t.note}</small></span></button>`).join('')}</div>
      </div>`;
    const btn = host.querySelector('#theme-btn'); const pop = host.querySelector('#theme-pop');
    const opts = () => [...pop.querySelectorAll('[data-theme-pick]')];
    let open = false;
    const fluid = () => M()?.fluid(pop);
    function show() {
      open = true; pop.hidden = false; btn.setAttribute('aria-expanded', 'true');
      // The panel grows out of its button (origin-aware), on a critically damped spring.
      if (M() && !M().reduce) { fluid().set({ s: 0.9, y: -8, o: 0 }); fluid().to({ s: 1, y: 0, o: 1 }, { response: 0.3, damping: 0.9, o: { response: 0.18 } }); }
      (opts().find(b => b.getAttribute('aria-checked') === 'true') ?? opts()[0]).focus();
    }
    function hide(focusBack = true) {
      if (!open) return; open = false; btn.setAttribute('aria-expanded', 'false');
      const done = () => { if (!open) pop.hidden = true; };
      if (M() && !M().reduce) fluid().to({ s: 0.94, y: -6, o: 0 }, { response: 0.2, damping: 1 }).then(done); else done();
      if (focusBack) btn.focus();
    }
    btn.addEventListener('click', () => open ? hide() : show());
    pop.addEventListener('click', e => { const b = e.target.closest('[data-theme-pick]'); if (b) choose(b.dataset.themePick, b.querySelector('.sw')); });
    pop.addEventListener('keydown', e => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); return hide(); }
      const list = opts(); const k = list.indexOf(document.activeElement);
      const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
      if (step && k >= 0) { e.preventDefault(); e.stopPropagation(); list[(k + step + list.length) % list.length].focus(); }
      if (e.key === 'Tab') { const first = list[0], last = list.at(-1); if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); } }
    });
    document.addEventListener('pointerdown', e => { if (open && !host.contains(e.target)) hide(false); });
    apply(current);
  }
  darkQuery?.addEventListener?.('change', () => { if (current === 'system') apply('system'); });
  apply(current);
  return { mount, choose, get current() { return current; }, themes: ALL };
})();
