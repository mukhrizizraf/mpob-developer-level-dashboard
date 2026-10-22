// Visual + interaction check with headless Chrome over CDP (no npm packages needed).
//   node shoot.mjs [outDir]
// Opens the built page, walks every tab and step, applies a few control changes,
// screenshots each state and reports page exceptions / console errors.
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';

const here = dirname(fileURLToPath(import.meta.url));
const inProject = existsSync(join(here, '../V3_DASHBOARD_APP'));
const page = join(here, inProject ? '../MPOB_Mandate_Decision_Studio_developer_level.html' : 'index.html');
const snapshot = JSON.parse(readFileSync(join(here, inProject ? '../../data/V3_DASHBOARD_SNAPSHOT.json' : 'data/V3_DASHBOARD_SNAPSHOT.json'), 'utf8'));
const outDir = process.argv[2] ?? join(tmpdir(), 'mpob-developer-level-shots');
mkdirSync(outDir, { recursive: true });
const chrome = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(existsSync);
const port = 9333 + Math.floor(Math.random() * 400);
const proc = spawn(chrome, ['--headless=new', `--remote-debugging-port=${port}`, '--no-first-run', '--disable-gpu', `--user-data-dir=${join(tmpdir(), `mpob-cdp-${port}`)}`, 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));

let targets;
for (let i = 0; i < 50 && !targets; i++) { try { targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); } catch { await sleep(200); } }
const ws = new WebSocket(targets.find(t => t.type === 'page').webSocketDebuggerUrl);
await new Promise(r => ws.addEventListener('open', r));
let id = 0; const pending = new Map(); const problems = [];
ws.addEventListener('message', ({ data }) => {
  const msg = JSON.parse(data);
  if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
  if (msg.method === 'Runtime.exceptionThrown') problems.push(`EXCEPTION ${msg.params.exceptionDetails.exception?.description ?? msg.params.exceptionDetails.text}`);
  if (msg.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(msg.params.type)) problems.push(`CONSOLE ${msg.params.type}: ${msg.params.args.map(a => a.value ?? a.description).join(' ')}`);
});
const send = (method, params = {}) => new Promise(r => { const n = ++id; pending.set(n, r); ws.send(JSON.stringify({ id: n, method, params })); });
const run = async expr => (await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true })).result?.result?.value;
async function shot(name, width = 1440, full = true) {
  await send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width < 600 });
  await sleep(250);
  const height = full ? await run('Math.ceil(document.documentElement.scrollHeight)') : 900;
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 600 });
  await sleep(150);
  const { result } = await send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(join(outDir, `${name}.png`), Buffer.from(result.data, 'base64'));
}

await send('Runtime.enable'); await send('Page.enable');
await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: process.env.SCHEME ?? 'light' }] });
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url: pathToFileURL(page).href });
await sleep(1500);
await run(`localStorage.clear(); true`);
await send('Page.reload'); await sleep(1600);

const click = sel => run(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return 'missing ' + ${JSON.stringify(sel)}; el.click(); return 'ok'; })()`);
const text = sel => run(`document.querySelector(${JSON.stringify(sel)})?.textContent?.trim()`);
const slide = (key, value) => run(`(() => { const el = document.querySelector('[data-range="${key}"]'); if (!el) return 'missing'; el.value = ${value}; el.dispatchEvent(new Event('input', { bubbles: true })); return 'ok'; })()`);
const checks = [];
const expect = (label, actual, wanted) => checks.push(`${actual === wanted ? 'PASS' : 'FAIL'} ${label}: ${actual}${actual === wanted ? '' : ` (wanted ${wanted})`}`);

// Every step: closed stack, then the stack open with every card open.
const openAll = () => run(`(async () => { const st = document.querySelector('.dstack'); if (!st) return 0;
  st.querySelector('[data-stack-toggle]').click(); await new Promise(r => setTimeout(r, 750));
  for (const head of st.querySelectorAll('.dcard:not(.is-open) [data-card-toggle]')) { head.click(); await new Promise(r => setTimeout(r, 90)); }
  await new Promise(r => setTimeout(r, 900)); return st.querySelectorAll('.dcard.is-open').length; })()`);
const closeStack = () => run(`(async () => { const st = document.querySelector('.dstack.is-open'); if (st) st.querySelector('[data-stack-toggle]').click(); await new Promise(r => setTimeout(r, 700)); return true; })()`);
const tabs = { obj1: 6, obj2: 6, obj3: 5, obj4: 7, decision: 4 };
let stacked = 0, opened = 0;
for (const [tab, steps] of Object.entries(tabs)) {
  await click(`.tab[data-tab="${tab}"]`); await sleep(900);
  for (let s = 0; s < steps; s++) {
    await click(`.node[data-go="${s}"]`); await sleep(800);
    await shot(`${tab}-step${s + 1}`, 1440, true);
    stacked += await run(`document.querySelectorAll('.dstack .dcard').length`);
    opened += await openAll();
    await shot(`${tab}-step${s + 1}-detail`, 1440, true);
    await closeStack();
  }
}
expect('Every detail card opens', String(opened), String(stacked));

// Stack geometry: closed cards overlap (front + two slivers); open cards form a list.
await click('.tab[data-tab="obj1"]'); await sleep(700); await click('.node[data-go="1"]'); await sleep(900);
const closedGeom = await run(`(() => { const c = [...document.querySelectorAll('.dstack .dcard')].map(e => e.getBoundingClientRect());
  return JSON.stringify({ n: c.length, span: Math.round(c.at(-1).bottom - c[0].top), peek: Math.round(c[1].bottom - c[0].bottom) }); })()`);
const g1 = JSON.parse(closedGeom);
expect('Closed stack is compact', String(g1.span < 110 && g1.peek > 2 && g1.peek < 14), 'true');
await run(`document.querySelector('.dstack [data-stack-toggle]').click()`); await sleep(900);
const openGeom = await run(`(() => { const c = [...document.querySelectorAll('.dstack .dcard')].map(e => e.getBoundingClientRect());
  return String(c.every((r, i) => i === 0 || r.top >= c[i - 1].bottom + 4)); })()`);
expect('Open stack is a list', openGeom, 'true');
await shot('obj1-step2-stack-open', 1440, true);
await closeStack();

// Interaction checks on the shared values
await click('.tab[data-tab="obj1"]'); await sleep(700); await click('.node[data-go="2"]'); await sleep(700);
expect('OBJ1 latest gap', await text('.eq-term.result strong'), '−RM 646.01/t');
await click('.node[data-go="0"]'); await sleep(600); await slide('mops', 4800); await sleep(600);
await click('.node[data-go="2"]'); await sleep(900);
expect('OBJ1 gap after diesel RM4,800', await text('.eq-term.result strong'), '+RM 149.06/t');
await click('.tab[data-tab="obj4"]'); await sleep(700); await click('.node[data-go="2"]'); await sleep(700); await click('[data-switch="b30Auth"]'); await sleep(300);
await click('.node[data-go="3"]'); await sleep(1200);
expect('OBJ4 mandate with positive gap + approval', await text('.verdict-blend'), 'B30');
await shot('obj4-step4-B30', 1440, true);
await click('.tab[data-tab="decision"]'); await sleep(700); await click('.node[data-go="0"]'); await sleep(600);
await slide('dec.mops', 1500); await slide('dec.pme', 2100); await click('.node[data-go="1"]'); await sleep(600); await slide('dec.fund', 0);
await click('.node[data-go="3"]'); await sleep(1200);
expect('Decision deep-stress case', await text('.verdict-blend'), 'B15');
await shot('decision-step4-B15', 1440, true);
await click('[data-reset-all]'); await sleep(900);
expect('Decision reset returns to shared values', await text('.verdict-blend'), 'B30');
await click('.tab[data-tab="obj2"]'); await sleep(700); await click('.node[data-go="2"]'); await sleep(500); await click('[data-set="horizon"][data-val="9"]'); await sleep(300);
await click('.node[data-go="4"]'); await sleep(1100);
expect('OBJ2 9-month low-oil six-month survival', await text('.gauge strong'), '32.0%');
await shot('obj2-step5-9m', 1440, true);
await click('.tab[data-tab="obj3"]'); await sleep(700); await click('.node[data-go="4"]'); await sleep(1100);
expect('OBJ3 funding estimate at RM25/t, 100%', await text('[data-out="fundingEstimate"]'), 'RM 227.4 mn');

// OBJ4 five-year stress test reads the exact saved matrix row
const rm0 = v => `RM ${Number(v).toLocaleString('en-MY', { maximumFractionDigits: 0, minimumFractionDigits: 0 })} mn`;
const row = (e, g, c) => snapshot.queries.rq4_matrix.rows.find(r => r.Energy === e && r.Geopolitics === g && r.Ceiling === c);
await click('.tab[data-tab="obj4"]'); await sleep(700); await click('.node[data-go="4"]'); await sleep(1100);
expect('OBJ4 Baseline · Normal · B30 mean cost', await text('[data-out="mMean"]'), rm0(row('Baseline', 'Normal', 'B30')['Net fiscal cost 5y (RM mn, mean)']));
await click('[data-set="energy"][data-val="High"]'); await slide('geo', 9); await click('[data-set="ceiling"][data-val="B20"]'); await sleep(900);
expect('OBJ4 High · ME spike · B20 P95 cost', await text('[data-out="mP95"]'), rm0(row('High', 'ME spike/decay', 'B20')['Net fiscal cost 5y (RM mn, p95)']));
await openAll(); await sleep(300);
expect('OBJ4 matrix highlights one run', String(await run(`document.querySelectorAll('.tbl tr.is-hl').length`)), '1');
await shot('obj4-step5-stress', 1440, true);
await closeStack();

// Chart hover read-out
await click('.tab[data-tab="obj1"]'); await sleep(700); await click('.node[data-go="0"]'); await sleep(800); await openAll();
const hover = await run(`(() => { const svg = document.querySelector('.chart svg'); const r = svg.getBoundingClientRect();
  const ev = new PointerEvent('pointermove', { clientX: r.right - 20, clientY: r.top + r.height / 2, bubbles: true }); svg.dispatchEvent(ev);
  return document.getElementById('tip').hidden ? 'hidden' : document.querySelector('#tip b').textContent; })()`);
expect('Chart hover shows the latest month', hover, snapshot.queries.rq1_monthly.rows.at(-1).period);
await closeStack();

// Mobile
await click('.tab[data-tab="obj1"]'); await sleep(700); await click('.node[data-go="0"]'); await sleep(700);
await shot('mobile-obj1', 390, true);
await click('.tab[data-tab="decision"]'); await sleep(700); await click('.node[data-go="3"]'); await sleep(900);
await shot('mobile-decision', 390, true);
const overflow = await run('document.documentElement.scrollWidth > window.innerWidth');
expect('No horizontal page scroll at 390px', String(overflow), 'false');

console.log(checks.join('\n'));
console.log(problems.length ? problems.join('\n') : 'No page exceptions or console errors.');
console.log(`Screenshots: ${outDir}`);
ws.close(); proc.kill();
process.exit(0);
