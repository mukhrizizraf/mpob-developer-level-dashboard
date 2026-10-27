// MPOB Mandate Decision Studio · Developer level
// Same steps, rules and snapshot as the User level, plus the V3 "Detailed" evidence behind every step,
// held in stackable detail cards. Reads the reviewed V3 snapshot embedded at build time; rules in model.js.
// Motion comes from motion.js: springs that start from the on-screen value and never block input.

const SNAP = JSON.parse(document.getElementById('mpob-snapshot').textContent);
const TRACE = JSON.parse(document.getElementById('mpob-trace').textContent);
const Q = SNAP.queries;

/* ── Snapshot check: refuse to run on an incomplete snapshot rather than show zeros ── */
const REQUIRED = {
  model_registry: ['modelStatus', 'dataThroughLabel'],
  decision_snapshot: ['period', 'mopsRmT', 'pmeRmT', 'fundRmMn', 'bslRateRmT', 'b30Authorised'],
  model_assumptions: ['fundSafetyMultiple', 'rolling12AvgB20DrawdownRmMn', 'b30GapThreshold', 'b15GapFloor', 'solvencyTarget', 'annualCpoProductionMt', 'savingsCaptureRate', 'seedCapitalRmMn', 'mcPaths'],
  rq1_monthly: ['period', 'mopsRmT', 'pmeRmT', 'cpoRmT', 'viabilityGapRmT'],
  rq1_coefficients: ['Variable', 'Coefficient'],
  rq1_breakeven: ['Brent (USD/bbl)', 'MOPS diesel (RM/t)', 'Break-even CPO (RM/t)'],
  rq1_apmbio_diagnostic: ['component', 'rmTonne'],
  rq1_johansen: ['nullRank', 'statistic', 'critical5Pct', 'rejectAt5Pct', 'kArDiff'],
  rq2_scenarios_9m: ['Scenario', 'solvency_prob', 'p6_months'],
  rq2_scenarios_60m: ['Scenario', 'solvency_prob', 'p6_months'],
  rq2_capture: ['Scenario', 'Horizon (months)', 'Savings capture'],
  rq2_seed: ['Mandate', 'Scenario', 'Optimal F0 (RM mn)'],
  rq3_financing: ['Instrument', 'Collection point'],
  rq3_bsl: ['BSL rate (RM/t)', 'Production scenario', 'Annual revenue (RM mn)'],
  rq3_competitiveness: ['Instrument'],
  rq4_summary: ['vol_b20', 'vol_b30', 'vol_dual', 'reduction_vs_b30', 'b30_months_share', 'switches_per_year'],
  rq4_matrix: ['Energy', 'Geopolitics', 'Ceiling'],
  rq4_map: ['CPO (RM/t)', 'Brent (USD/bbl)', 'Mandate', 'VG (RM/t)'],
  b30_impact: ['dimension', 'value'],
};
const NUMERIC = {
  decision_snapshot: ['mopsRmT', 'pmeRmT', 'fundRmMn', 'bslRateRmT'],
  model_assumptions: ['fundSafetyMultiple', 'rolling12AvgB20DrawdownRmMn', 'b30GapThreshold', 'b15GapFloor', 'solvencyTarget', 'annualCpoProductionMt', 'savingsCaptureRate', 'seedCapitalRmMn', 'mcPaths'],
};
function snapshotProblems(snap, extra = []) {
  const problems = [];
  const q = snap?.queries ?? {};
  for (const [id, fields] of Object.entries(REQUIRED)) {
    const rows = q[id]?.rows;
    if (!Array.isArray(rows) || !rows.length) { problems.push(`${id}: no rows`); continue; }
    const missing = fields.filter(f => rows.some(row => !(f in row)));
    if (missing.length) problems.push(`${id}: missing ${missing.join(', ')}`);
  }
  for (const [id, fields] of Object.entries(NUMERIC)) {
    const row = q[id]?.rows?.[0];
    if (row) fields.filter(f => !Number.isFinite(Number(row[f])) || row[f] === null || row[f] === '').forEach(f => problems.push(`${id}.${f}: not a number`));
  }
  const vars = (q.rq1_coefficients?.rows ?? []).map(r => r.Variable);
  ['const', 'cpo_lag1', 'meoh_rm', 'gly_rm'].filter(v => !vars.includes(v)).forEach(v => problems.push(`rq1_coefficients: no ${v}`));
  for (const h of ['9m', '60m']) for (const s of ['A', 'B', 'C', 'D'])
    if (!(q[`rq2_scenarios_${h}`]?.rows ?? []).some(r => String(r.Scenario).trim().startsWith(s))) problems.push(`rq2_scenarios_${h}: no case ${s}`);
  if (!(q.rq1_monthly?.rows?.length >= 2)) problems.push('rq1_monthly: fewer than two months');
  return problems.concat(extra);
}
const PROBLEMS = snapshotProblems(SNAP, TRACE?.rows?.length >= 2 && ['E', 'F'].every(k => Number.isFinite(TRACE.rows.at(-1)[k])) ? [] : ['master trace: methanol or glycerol missing']);
if (PROBLEMS.length) {
  document.getElementById('page').innerHTML = `<section class="failure" role="alert"><h1>Snapshot unavailable or incomplete</h1>
    <p>The page will not calculate results from an incomplete snapshot. Rebuild it from a reviewed snapshot.</p><ul>${PROBLEMS.map(p => `<li>${p}</li>`).join('')}</ul></section>`;
  throw new Error(`Snapshot incomplete: ${PROBLEMS.join('; ')}`);
}

const A = Q.model_assumptions.rows[0];
const BASE = Q.decision_snapshot.rows[0];
const META = Q.model_registry.rows[0];
const MONTHLY = Q.rq1_monthly.rows;
const COEF = Q.rq1_coefficients.rows;
const coef = key => num(COEF.find(row => row.Variable === key)?.Coefficient);
const diag = prefix => num(Q.rq1_apmbio_diagnostic.rows.find(row => String(row.component).startsWith(prefix))?.rmTonne);
const LATEST_CPO = num(MONTHLY.at(-1).cpoRmT);
const SAVINGS_ANNUAL = num(Q.rq3_financing.rows.find(row => row.Instrument === 'Subsidy savings')?.['Annual revenue (RM mn)']);
const BREAK_EVEN = Q.rq1_breakeven.rows.map(row => ({ brent: num(row['Brent (USD/bbl)']), mops: num(row['MOPS diesel (RM/t)']), cpo: num(row['Break-even CPO (RM/t)']) }));
const BASE_CAPTURE = num(A.savingsCaptureRate);
const SCENARIOS = ['A', 'B', 'C', 'D'];
const CAPTURE_OPTIONS = [...new Set(['9', '60'].flatMap(h => rq2CaptureChoices(Q, h, BASE_CAPTURE)))].sort((a, b) => a - b);
const SEED_MAX = Math.max(...Q.rq2_seed.rows.map(row => num(row['Optimal F0 (RM mn)'])));
const RQ4 = Q.rq4_summary.rows[0];
const REDUCTION_VS_B20 = num(RQ4.vol_b20) === 0 ? 0 : (num(RQ4.vol_b20) - num(RQ4.vol_dual)) / num(RQ4.vol_b20);
const FUND_LIMIT = num(A.fundSafetyMultiple) * num(A.rolling12AvgB20DrawdownRmMn);
const WPL = Q.rq3_wpl?.rows?.[0] ?? {};
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const monthLabel = period => { const [y, m] = String(period).split('-'); return MONTHS[Number(m) - 1] ? `${MONTHS[Number(m) - 1]} ${y}` : String(period); };
const SNAP_MONTH = monthLabel(BASE.period);
const DATA_THROUGH = monthLabel(META.dataThrough ?? META.dataThroughLabel);
const PROD_PERIOD = 'Jan–Apr 2026';
const reduced = () => MOTION.reduce;

// Ingredient prices behind the fitted cost: CPO from the preceding month; methanol and glycerol are the
// reviewed master-workbook inputs for the snapshot month (trace columns E and F), not reverse-engineered terms.
const TRACE_LAST = TRACE.rows.at(-1);
const INGREDIENTS = { cpoLag: num(MONTHLY.at(-2).cpoRmT), methanol: num(TRACE_LAST.E), glycerol: num(TRACE_LAST.F) };

// RQ4 stress matrix: three completed geopolitical runs. They are named choices, not a severity scale.
const GEO_RUNS = [
  { anchor: 'Normal', label: 'Normal', note: 'No geopolitical shock' },
  { anchor: 'RU level-shift', label: 'Russia level shift', note: 'A lasting step up in prices' },
  { anchor: 'ME spike/decay', label: 'Middle East spike', note: 'A sharp spike that fades' },
];
const MATRIX = Q.rq4_matrix.rows.map(row => ({
  energy: row.Energy, geo: row.Geopolitics, ceiling: row.Ceiling, brent: num(row['Brent mean (USD/bbl)']),
  mean: num(row['Net fiscal cost 5y (RM mn, mean)']), p95: num(row['Net fiscal cost 5y (RM mn, p95)']),
  sigma: num(row['Fiscal cost sigma (RM mn)']), switches: num(row['Switches per year']),
  cpo: num(row['CPO absorbed (mn t/5y)']), end: num(row['End fund median (RM mn)']),
}));

const DEFAULTS = {
  mops: num(BASE.mopsRmT), pme: num(BASE.pmeRmT), fund: num(BASE.fundRmMn), bslRate: num(BASE.bslRateRmT),
  capture: BASE_CAPTURE, productionPct: 100, governmentSeed: 100, b30Auth: String(BASE.b30Authorised) === 'true',
  pmeMode: 'latest', ...INGREDIENTS, brent: 100, scenario: 'A', horizon: '60',
  energy: 'Baseline', geo: 'Normal', ceiling: 'B30',
  wplRate: num(WPL.WPL_SCENARIO_RATE ?? 0.03) * 100, wplCpo: num(WPL.WPL_SCENARIO_CPO_RM_T ?? LATEST_CPO),
};
const S = { ...DEFAULTS, dec: {}, tab: 'home', step: { home: 0, obj1: 0, obj2: 0, obj3: 0, obj4: 0, decision: 0 }, open: {}, cards: {}, cause: 'commit' };

/* ── Scenario state: snapshot values, your edits, and Decision-page overrides ── */
// Inputs that change a result. Case, period, Brent, energy, geopolitics and ceiling only select saved results.
const SCENARIO_KEYS = ['mops', 'pmeMode', 'pme', 'cpoLag', 'methanol', 'glycerol', 'fund', 'bslRate', 'capture', 'productionPct', 'governmentSeed', 'b30Auth', 'wplRate', 'wplCpo'];
const FROM_SNAPSHOT = new Set(['mops', 'pme', 'fund', 'bslRate', 'capture', 'b30Auth', 'cpoLag', 'methanol', 'glycerol', 'wplRate', 'wplCpo']);
const DEC_FROM = { mops: 'OBJ1', pme: 'OBJ1', fund: 'OBJ4', b30Auth: 'OBJ4', bslRate: 'OBJ3', capture: 'OBJ3' };
const LABEL = { mops: 'diesel price', pmeMode: 'cost method', pme: 'biodiesel cost', cpoLag: 'CPO price', methanol: 'methanol price', glycerol: 'glycerol price',
  fund: 'fund balance', bslRate: 'BSL rate', capture: 'savings share', productionPct: 'CPO production', governmentSeed: 'starting money', b30Auth: 'B30 approval',
  wplRate: 'WPL rate', wplCpo: 'WPL CPO price' };
const same = (a, b) => (typeof a === 'number' || typeof b === 'number') ? Math.abs(Number(a) - Number(b)) < 1e-9 : a === b;

const pmeNow = () => S.pmeMode === 'formula'
  ? fittedPme(COEF, { cpoLag: S.cpoLag, methanol: S.methanol, glycerol: S.glycerol })
  : S.pme;
const sharedControls = () => ({
  mops: S.mops, pme: pmeNow(), fund: S.fund, bslRate: S.bslRate, capture: S.capture,
  productionPct: S.productionPct, governmentSeed: S.governmentSeed, b30Auth: S.b30Auth,
});
const decisionControls = () => ({ ...sharedControls(), ...S.dec });
const sharedEdits = () => SCENARIO_KEYS.filter(k => {
  if (['cpoLag', 'methanol', 'glycerol'].includes(k) && S.pmeMode !== 'formula') return false;
  if (k === 'pme' && S.pmeMode === 'formula') return false;
  return !same(S[k], DEFAULTS[k]);
});
const decEdits = () => Object.keys(S.dec);
const listWords = keys => { const w = keys.map(k => LABEL[k] ?? k); return w.length <= 3 ? w.join(', ') : `${w.slice(0, 3).join(', ')} and ${w.length - 3} more`; };

const funding = c => fundingAmounts({ baseProductionMt: A.annualCpoProductionMt, productionPct: c.productionPct, bslRate: c.bslRate,
  savingsEstimate: SAVINGS_ANNUAL, savingsShare: c.capture, startingMoney: c.governmentSeed });
const geoNow = () => GEO_RUNS.find(g => g.anchor === S.geo) ?? GEO_RUNS[0];
// A missing combination returns nothing; it is never replaced by another run.
const matrixRow = (energy, geo, ceiling) => MATRIX.find(r => r.energy === energy && r.geo === geo && r.ceiling === ceiling);

function compute() {
  const pme = pmeNow();
  const p = policyState({ mops: S.mops, pme, fund: S.fund, b30Auth: S.b30Auth }, A);
  const dc = decisionControls();
  const g = geoNow();
  return {
    pme, p, f: funding(S), dc, dp: policyState(dc, A), df: funding(dc), g,
    be: BREAK_EVEN.find(row => row.brent === S.brent) ?? BREAK_EVEN[0],
    e: selectRq2(Q, S.horizon, S.scenario, S.capture, BASE_CAPTURE),
    m: matrixRow(S.energy, g.anchor, S.ceiling),
    mB20: matrixRow(S.energy, g.anchor, 'B20'), mB30: matrixRow(S.energy, g.anchor, 'B30'),
    wPen: wplImpact(S.wplCpo, num(WPL.WPL_THRESHOLD_PEN_RM_T), S.wplRate, true, WPL.WPL_ELIGIBLE_FFB_PEN_T ?? null, num(WPL.WPL_BASELINE_RATE) * 100),
    wEast: wplImpact(S.wplCpo, num(WPL.WPL_THRESHOLD_EAST_RM_T), S.wplRate, true, WPL.WPL_ELIGIBLE_FFB_EAST_T ?? null, num(WPL.WPL_BASELINE_RATE) * 100),
  };
}

/* ── Icons (24px line) ───────────────────────────────── */
const svg = d => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`;
const ICON = {
  pump: svg('M4 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16M3 21h12M6.5 8h5M14 10h1.5a2 2 0 0 1 2 2v4a1.5 1.5 0 0 0 3 0V8l-3-3'),
  flask: svg('M9 3h6M10 3v6L5 18a2 2 0 0 0 1.8 3h10.4A2 2 0 0 0 19 18l-5-9V3M7.4 14h9.2'),
  scale: svg('M12 4v16M7 20h10M5 7h14M5 7l-3 6a3 3 0 0 0 6 0L5 7zM19 7l-3 6a3 3 0 0 0 6 0l-3-6z'),
  target: svg('M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 12h.01M21 3l-9 9'),
  flag: svg('M5 21V4M5 4h12l-2.5 4L17 12H5'),
  cycle: svg('M4 12a8 8 0 0 1 14-5.3M20 3.5v4h-4M20 12a8 8 0 0 1-14 5.3M4 20.5v-4h4'),
  drop: svg('M12 3s6.5 6.6 6.5 11.2a6.5 6.5 0 0 1-13 0C5.5 9.6 12 3 12 3z'),
  calendar: svg('M4 6h16v15H4zM4 10.5h16M8.5 3v5M15.5 3v5'),
  percent: svg('M19 5 5 19M7 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM17 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4z'),
  shield: svg('M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3zM8.5 12l2.5 2.5 4.5-5'),
  coins: svg('M12 10c3.9 0 7-1.3 7-3s-3.1-3-7-3-7 1.3-7 3 3.1 3 7 3zM5 7v5c0 1.7 3.1 3 7 3s7-1.3 7-3V7M5 12v5c0 1.7 3.1 3 7 3s7-1.3 7-3v-5'),
  wallet: svg('M3 7.5h15a3 3 0 0 1 3 3V17a3 3 0 0 1-3 3H3V7.5zM3 7.5 14 4l1.6 3.5M16.5 14h.01'),
  bank: svg('M3 10l9-6 9 6M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 21h18'),
  bars: svg('M5 20V11M11 20V5M17 20v-6M3 20h18'),
  stamp: svg('M9 3h6v5l3 3H6l3-3V3zM5 14h14v3H5zM7 21h10'),
  bolt: svg('M13 3 4 14h7l-1 7 9-11h-7l1-7z'),
  check: svg('M5 12.5l4.5 4.5L19 7.5'),
  chev: svg('M9 5l7 7-7 7'),
  chevL: svg('M15 5l-7 7 7 7'),
  chevD: svg('M6 9l6 6 6-6'),
  palm: svg('M12 21v-9M12 12C9 8 5 8 3 10M12 12c3-4 7-4 9-2M12 12c-1-4-4-7-7-7M12 12c1-4 4-7 7-7M12 12c0-3 0-6 0-8'),
  table: svg('M4 5h16v14H4zM4 10h16M4 14.5h16M10 5v14'),
  code: svg('M8 8l-4 4 4 4M16 8l4 4-4 4M13.5 6l-3 12'),
  chart: svg('M4 19h16M5 15l4-5 4 3 6-7'),
  quote: svg('M5 11h4v6H5zM5 11c0-3 1.5-5 4-5.5M14 11h4v6h-4zM14 11c0-3 1.5-5 4-5.5'),
  alert: svg('M12 4 2.8 19.5h18.4L12 4zM12 10v4.5M12 17.2h.01'),
  db: svg('M12 8c4 0 7-1.3 7-3s-3-3-7-3-7 1.3-7 3 3 3 7 3zM5 5v14c0 1.7 3 3 7 3s7-1.3 7-3V5M5 12c0 1.7 3 3 7 3s7-1.3 7-3'),
  grid: svg('M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z'),
  list: svg('M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01'),
  wave: svg('M3 12h3l2.5-6 4 12 3-9 2 3H21'),
  globe: svg('M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM3 12h18M12 3c2.5 2.5 3.8 5.5 3.8 9s-1.3 6.5-3.8 9c-2.5-2.5-3.8-5.5-3.8-9S9.5 5.5 12 3z'),
  seed: svg('M12 21v-8M12 13c0-4-3-6-7-6 0 4 3 6 7 6zM12 11c0-3.5 2.5-6 7-6 0 4-3 6-7 6'),
  link: svg('M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1'),
  minus: svg('M6 12h12'),
  cross: svg('M7 7l10 10M17 7 7 17'),
  replay: svg('M4 12a8 8 0 1 0 2.3-5.7M4 4v4h4'),
  print: svg('M7 9V3h10v6M7 17H4v-7h16v7h-3M7 14h10v7H7z'),
  info: svg('M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 11v5M12 7.5h.01'),
};

/* ── Sliders and exact-value fields ──────────────────── */
const SL = {
  mops: { min: 1500, max: 6000, step: 0.01, fmt: v => rmT(v, 2) },
  pme: { min: 1500, max: 6000, step: 0.01, fmt: v => rmT(v, 2) },
  cpoLag: { min: 1000, max: 8000, step: 1, fmt: v => rmT(v) },
  methanol: { min: 500, max: 4000, step: 1, fmt: v => rmT(v) },
  glycerol: { min: 0, max: 6000, step: 1, fmt: v => rmT(v) },
  fund: { min: 0, max: 6000, step: 50, fmt: v => rmMn(v) },
  bslRate: { min: 0, max: 100, step: 1, fmt: v => rmT(v) },
  capture: { min: 0, max: 1, step: 0.01, fmt: v => pct(v, 0), raw: v => String(Math.round(v * 100)), parse: v => v / 100 },
  productionPct: { min: 90, max: 110, step: 1, fmt: v => `${Math.round(v)}%` },
  governmentSeed: { min: 0, max: 1000, step: 25, fmt: v => rmMn(v) },
  wplRate: { min: num(WPL.WPL_RATE_MIN ?? 0) * 100, max: num(WPL.WPL_RATE_MAX ?? 0.06) * 100, step: num(WPL.WPL_RATE_STEP ?? 0.001) * 100, fmt: v => `${num(v).toFixed(1)}%` },
  wplCpo: { min: 1500, max: 8000, step: 0.5, fmt: v => rmT(v, 1) },
};
const baseKey = key => key.startsWith('dec.') ? key.slice(4) : key;
const get = key => key.startsWith('dec.') ? decisionControls()[key.slice(4)] : S[key];
const isChanged = key => key.startsWith('dec.') ? Object.hasOwn(S.dec, key.slice(4)) : !same(S[key], DEFAULTS[key]);
const resetLabel = key => key.startsWith('dec.') ? `Use ${DEC_FROM[key.slice(4)]} value` : FROM_SNAPSHOT.has(key) ? 'Reset to snapshot' : 'Reset to start value';
// A Decision-page value equal to the inherited one is not an override: inheritance is kept.
function set(key, value, cause = 'commit') {
  S.cause = cause;
  if (key.startsWith('dec.')) {
    const k = key.slice(4);
    if (same(value, sharedControls()[k])) delete S.dec[k]; else S.dec[k] = value;
  } else S[key] = value;
  refresh();
}
function resetKey(key) {
  S.cause = 'commit';
  if (key.startsWith('dec.')) delete S.dec[key.slice(4)]; else S[key] = DEFAULTS[key];
  refresh();
}
function useObjectiveSettings() { S.cause = 'commit'; S.dec = {}; refresh(); }
function restoreSnapshot() { S.cause = 'commit'; for (const k of SCENARIO_KEYS) S[k] = DEFAULTS[k]; S.dec = {}; refresh(); }

let uid = 0;
function slider(key, label, note = '') {
  const c = SL[baseKey(key)];
  const id = `r${++uid}`;
  return `<div class="control">
    <div class="control-top"><label for="${id}">${label}</label><input class="control-value" id="${id}-v" data-num="${key}" inputmode="decimal" enterkeyhint="done" autocomplete="off" aria-label="${label}, exact value" aria-describedby="${id}-err"></div>
    <input type="range" id="${id}" data-range="${key}" min="${c.min}" max="${c.max}" step="${c.step}">
    <p class="field-error" id="${id}-err" role="alert" hidden></p>
    <div class="control-meta"><span>${c.fmt(c.min)}</span><button type="button" class="reset" data-reset="${key}">${resetLabel(key)}</button><span>${c.fmt(c.max)}</span></div>
    ${note ? `<p class="note">${note}</p>` : ''}
  </div>`;
}
const term = (abbr, text) => `<p class="term"><b>${abbr}</b> ${text}</p>`;

/* ── Small formatters ────────────────────────────────── */
const fx = (v, d = 2) => v == null || v === '' ? '—' : num(v).toLocaleString('en-MY', { minimumFractionDigits: d, maximumFractionDigits: d });
const esc = s => String(s ?? '').replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]);
const prodPct = label => String(label).startsWith('Low') ? 90 : String(label).startsWith('High') ? 110 : 100;
const prodName = pctValue => ({ 90: 'Low −10%', 100: 'Base', 110: 'High +10%' })[pctValue];

/* ── Output bindings ─────────────────────────────────── */
const T = (n, f) => ({ n, f });
const gapState = g => g > 0 ? 'good' : g < 0 ? 'bad' : 'hold';
const passState = ok => ok ? 'good' : 'bad';
const tested = (e, ok) => !e.row ? 'na' : passState(ok);
const mandateLabel = m => m === 'B15' ? 'B15' : m;
const mandateTag = m => m === 'B15' ? 'Proposed safeguard only' : m === 'B30' ? 'All three checks pass' : 'Default blend';
const surviveHeadline = e => !e.row ? 'Not tested' : num(e.solvency) >= num(A.solvencyTarget) && num(e.survival6m) >= 0.9 ? 'Passes both tests'
  : num(e.survival6m) >= 0.9 ? 'Passes 6 months, not the full period' : 'Does not pass';
const periodLabel = h => String(h) === '60' ? '5 years' : `${h} months`;
const fiveYearPasses = Q.rq2_scenarios_60m.rows.filter(row => num(row.solvency_prob) >= num(A.solvencyTarget)).length;
const fullStats = c => Boolean(c.e.row && c.e.row.var95_rm_m != null);
const basisText = keys => keys.length ? `Your scenario · changed: ${listWords(keys)}` : `Reviewed snapshot · data through ${DATA_THROUGH}`;
const noRun = 'No saved run';
const mOut = (key, f) => c => c.m ? T(c.m[key], f) : noRun;

const B = {
  // OBJ1
  mops: () => T(S.mops, v => rmT(v, 2)),
  mopsSub: () => same(S.mops, DEFAULTS.mops) ? `per tonne · snapshot month ${SNAP_MONTH}` : `per tonne · your scenario (snapshot ${SNAP_MONTH}: ${rmT(DEFAULTS.mops, 2)})`,
  pme: c => T(c.pme, v => rmT(v, 2)),
  pmeSource: () => S.pmeMode === 'formula' ? 'Fitted cost estimate from the APM-Bio equation, not the master-series cost'
    : same(S.pme, DEFAULTS.pme) ? `Reviewed master-series cost · ${SNAP_MONTH}` : `Your scenario (snapshot ${SNAP_MONTH}: ${rmT(DEFAULTS.pme, 2)})`,
  pmeLatest: () => S.pmeMode === 'latest',
  pmeFormula: () => S.pmeMode === 'formula',
  fitConst: () => rmT(coef('const'), 2),
  fitCpo: () => T(coef('cpo_lag1') * S.cpoLag, v => rmT(v, 2)),
  fitMeoh: () => T(coef('meoh_rm') * S.methanol, v => rmT(v, 2)),
  fitGly: () => T(coef('gly_rm') * S.glycerol, v => signedRmT(v)),
  fitTotal: () => T(fittedPme(COEF, { cpoLag: S.cpoLag, methanol: S.methanol, glycerol: S.glycerol }), v => rmT(v, 2)),
  fitResid: () => { const fit = fittedPme(COEF, { cpoLag: S.cpoLag, methanol: S.methanol, glycerol: S.glycerol }); return `${signedRmT(DEFAULTS.pme - fit)} (master-series ${rmT(DEFAULTS.pme, 2)} minus fitted)`; },
  gap: c => T(c.p.gap, signedRmT),
  gapState: c => gapState(c.p.gap),
  gapPos: c => Math.max(0, Math.min(100, (c.p.gap + 4500) / 9000 * 100)),
  gapWord: c => c.p.gap > 0 ? 'Savings' : c.p.gap < 0 ? 'Support needed' : 'Equal prices',
  gapSentence: c => c.p.gap > 0 ? `Biodiesel is ${rm(c.p.gap, 2)}/t cheaper than diesel. Blending saves money.`
    : c.p.gap < 0 ? `Biodiesel costs ${rm(-c.p.gap, 2)}/t more than diesel. Support may be needed.` : 'Biodiesel and diesel cost the same.',
  basis: () => basisText(sharedEdits()),
  edited: () => sharedEdits().length > 0,
  beCpo: c => T(c.be.cpo, v => rmT(v, 1)),
  beSub: c => `Diesel at USD ${c.be.brent}/bbl: ${rmT(c.be.mops, 1)} · CPO in ${SNAP_MONTH}: ${rmT(LATEST_CPO, 1)}`,
  beState: c => LATEST_CPO <= c.be.cpo ? 'good' : 'bad',
  beWord: c => LATEST_CPO <= c.be.cpo ? `CPO is ${rm(c.be.cpo - LATEST_CPO, 1)} below break-even` : `CPO is ${rm(LATEST_CPO - c.be.cpo, 1)} above break-even`,
  priceState: c => passState(c.p.pricePass),
  priceWord: c => c.p.pricePass ? 'Pass' : 'Fail',
  // OBJ2
  s6: c => c.e.row ? T(num(c.e.survival6m), v => pct(v, 1)) : 'Not tested',
  s6w: c => c.e.row ? num(c.e.survival6m) * 100 : 0,
  s6state: c => tested(c.e, num(c.e.survival6m) >= 0.9),
  s6word: c => !c.e.row ? 'No saved run for this choice' : num(c.e.survival6m) >= 0.9 ? 'Meets the 90% target' : 'Below the 90% target',
  fullLabel: () => `Lasts the whole ${periodLabel(S.horizon)}`,
  sol: c => c.e.row ? T(num(c.e.solvency), v => pct(v, 1)) : 'Not tested',
  solw: c => c.e.row ? num(c.e.solvency) * 100 : 0,
  solstate: c => tested(c.e, num(c.e.solvency) >= num(A.solvencyTarget)),
  solword: c => !c.e.row ? 'No saved run for this choice' : num(c.e.solvency) >= num(A.solvencyTarget) ? `Meets the ${pct(A.solvencyTarget, 0)} target` : `Below the ${pct(A.solvencyTarget, 0)} target`,
  rq2Head: c => surviveHeadline(c.e),
  rq2State: c => !c.e.row ? 'na' : surviveHeadline(c.e) === 'Passes both tests' ? 'good' : num(c.e.survival6m) >= 0.9 ? 'hold' : 'bad',
  rq2Sub: () => `${scenarioName(S.scenario)} · ${pct(S.capture, 0)} of savings paid in · ${periodLabel(S.horizon)}`,
  rq2Query: c => c.e.row ? c.e.queryId : noRun,
  capUntested: c => !c.e.row,
  hasStats: c => fullStats(c),
  noStats: c => Boolean(c.e.row) && !fullStats(c),
  stVar: c => fullStats(c) ? rmMn(c.e.row.var95_rm_m, 0) : '—',
  stCvar: c => fullStats(c) ? rmMn(c.e.cvar, 0) : '—',
  stMed: c => fullStats(c) ? rmMn(c.e.median, 0) : '—',
  stPeriod: () => `RM mn, total support over ${periodLabel(S.horizon)}. Not an annual figure.`,
  // OBJ3
  bslRevenue: c => T(c.f.bslRevenue, v => rmMn(v, 1)),
  bslSub: c => `${rmT(S.bslRate)} × ${c.f.productionMt.toFixed(3)} mn t of CPO (${PROD_PERIOD} base, not a full year)`,
  production: c => T(c.f.productionMt, v => `${v.toFixed(3)} mn t`),
  paidSavings: c => T(c.f.paidSavings, v => rmMn(v, 1)),
  savingsSub: () => `${pct(S.capture, 0)} of ${rmMn(SAVINGS_ANNUAL, 2)} modelled yearly savings`,
  combined: c => T(c.f.withStartingMoney, v => rmMn(v, 1)),
  combinedSub: () => `Levy (${PROD_PERIOD} base) + savings (yearly estimate) + ${rmMn(S.governmentSeed)} paid once. Not cash in hand: the periods differ.`,
  fundingEstimate: c => T(c.f.fundingEstimate, v => rmMn(v, 1)),
  stackBsl: c => c.f.bslRevenue,
  stackSav: c => c.f.paidSavings,
  stackSeed: () => S.governmentSeed,
  stackBslT: c => rmMn(c.f.bslRevenue, 0),
  stackSavT: c => rmMn(c.f.paidSavings, 0),
  stackSeedT: () => rmMn(S.governmentSeed, 0),
  legBsl: c => `BSL levy · ${rmMn(c.f.bslRevenue, 1)} · ${PROD_PERIOD} base`,
  legSav: c => `Savings paid in · ${rmMn(c.f.paidSavings, 1)} · yearly estimate`,
  legSeed: () => `Starting money · ${rmMn(S.governmentSeed, 0)} · one-off assumption`,
  eqRate: () => rmT(S.bslRate),
  eqProd: c => `${c.f.productionMt.toFixed(3)} mn t`,
  eqShare: () => pct(S.capture, 0),
  wPenEx: c => T(c.wPen.excess, v => rmT(v, 2)),
  wPenSel: c => T(c.wPen.selected, v => rmT(v, 2)),
  wPenBase: c => rmT(c.wPen.baseline, 2),
  wEastEx: c => T(c.wEast.excess, v => rmT(v, 2)),
  wEastSel: c => T(c.wEast.selected, v => rmT(v, 2)),
  wEastBase: c => rmT(c.wEast.baseline, 2),
  // OBJ4
  fundT: () => T(S.fund, v => rmMn(v)),
  fundState: c => passState(c.p.fundSafe),
  fundWord: c => c.p.fundSafe ? 'Pass' : 'Fail',
  fundBar: () => Math.min(100, S.fund / SL.fund.max * 100),
  approvalState: () => passState(S.b30Auth),
  approvalWord: () => S.b30Auth ? 'On' : 'Off',
  mandate: c => mandateLabel(c.p.mandate),
  mandateState: c => c.p.mandate,
  mandateTag: c => mandateTag(c.p.mandate),
  reason: c => c.p.decisionReason,
  gapShort: c => signedRmT(c.p.gap),
  geoLabel: c => c.g.label,
  geoNote: c => c.g.note,
  mMean: mOut('mean', v => rmMn(v, 0)),
  mP95: mOut('p95', v => rmMn(v, 0)),
  mEnd: mOut('end', v => rmMn(v, 0)),
  mCpo: mOut('cpo', v => `${v.toFixed(2)} mn t`),
  mSwitch: c => c.m ? fx(c.m.switches, 2) : noRun,
  mBrent: c => c.m ? `USD ${fx(c.m.brent, 0)}/bbl` : noRun,
  mSigma: c => c.m ? rmMn(c.m.sigma, 1) : noRun,
  mRun: c => c.m ? `${c.m.energy} · ${c.m.geo} · ${c.m.ceiling}` : `${noRun} for ${S.energy} · ${c.g.anchor} · ${S.ceiling}`,
  p95Same: c => Boolean(c.mB20 && c.mB30 && Math.abs(c.mB20.p95 - c.mB30.p95) < 0.001),
  // Decision now
  dGap: c => T(c.dp.gap, signedRmT),
  dGapState: c => gapState(c.dp.gap),
  dPriceState: c => passState(c.dp.pricePass),
  dPriceWord: c => c.dp.pricePass ? 'Pass' : 'Fail',
  dGapShort: c => signedRmT(c.dp.gap),
  dFund: c => T(num(c.dc.fund), v => rmMn(v)),
  dFundState: c => passState(c.dp.fundSafe),
  dFundWord: c => c.dp.fundSafe ? 'Pass' : 'Fail',
  dFundShort: c => rmMn(c.dc.fund),
  dFundBar: c => Math.min(100, num(c.dc.fund) / SL.fund.max * 100),
  dFunding: c => T(c.df.fundingEstimate, v => rmMn(v, 1)),
  dBsl: c => rmMn(c.df.bslRevenue, 1),
  dSav: c => rmMn(c.df.paidSavings, 1),
  dApprovalState: c => passState(c.dc.b30Auth),
  dApprovalWord: c => c.dc.b30Auth ? 'On' : 'Off',
  dMandate: c => mandateLabel(c.dp.mandate),
  dMandateState: c => c.dp.mandate,
  dMandateTag: c => mandateTag(c.dp.mandate),
  dReason: c => c.dp.decisionReason,
  dChecks: c => `${Number(c.dp.pricePass) + Number(c.dp.fundSafe) + Number(Boolean(c.dc.b30Auth))} of 3 checks pass`,
  dBasis: () => {
    const local = decEdits(), shared = sharedEdits();
    if (!local.length && !shared.length) return `Decision under the reviewed snapshot values · data through ${DATA_THROUGH}`;
    return ['Decision under these settings', shared.length ? `changed in the objectives: ${listWords(shared)}` : '', local.length ? `set on this page: ${listWords(local)}` : ''].filter(Boolean).join(' · ');
  },
  dChanged: () => decEdits().length > 0,
  anyChanged: () => decEdits().length > 0 || sharedEdits().length > 0,
  dMopsSrc: () => Object.hasOwn(S.dec, 'mops') ? 'This page' : same(S.mops, DEFAULTS.mops) ? `OBJ1 · snapshot ${SNAP_MONTH}` : 'OBJ1 · your scenario',
  dPmeSrc: () => Object.hasOwn(S.dec, 'pme') ? 'This page' : S.pmeMode === 'formula' ? 'OBJ1 · fitted estimate' : same(S.pme, DEFAULTS.pme) ? `OBJ1 · snapshot ${SNAP_MONTH}` : 'OBJ1 · your scenario',
  dFundSrc: () => Object.hasOwn(S.dec, 'fund') ? 'This page' : 'OBJ4',
  dAuthSrc: () => Object.hasOwn(S.dec, 'b30Auth') ? 'This page' : 'OBJ4',
  dBslSrc: () => Object.hasOwn(S.dec, 'bslRate') ? 'This page' : 'OBJ3',
  dCapSrc: () => Object.hasOwn(S.dec, 'capture') ? 'This page' : 'OBJ3',
  dProd: c => `${c.dc.productionPct}% of base`,
  dSeed: c => rmMn(c.dc.governmentSeed),
  dReport: c => `At diesel ${rmT(c.dc.mops, 2)} and biodiesel ${rmT(c.dc.pme, 2)} the gap is ${signedRmT(c.dp.gap)}. The fund of ${rmMn(c.dc.fund)} is ${c.dp.fundSafe ? 'above' : 'not above'} the ${rmMn(c.dp.fundThreshold, 2)} limit. B30 approval is ${c.dc.b30Auth ? 'assumed' : 'not assumed'}. The rule gives ${c.dp.mandate === 'B15' ? 'B15, a proposed safeguard only' : c.dp.mandate}. Data through ${DATA_THROUGH}${decEdits().length || sharedEdits().length ? ', with values changed from the snapshot' : ''}.`,
};
for (const id of SCENARIOS) {
  const pick = () => selectRq2(Q, S.horizon, id, S.capture, BASE_CAPTURE);
  B[`mc_${id}`] = () => pick().row ? num(pick().solvency) * 100 : 0;
  B[`mcs_${id}`] = () => tested(pick(), num(pick().solvency) >= num(A.solvencyTarget));
  B[`mcv_${id}`] = () => pick().row ? pct(pick().solvency, 1) : 'Not tested';
  B[`m6_${id}`] = () => pick().row ? num(pick().survival6m) * 100 : 0;
  B[`m6v_${id}`] = () => pick().row ? pct(pick().survival6m, 1) : 'Not tested';
}
for (const value of CAPTURE_OPTIONS) {
  B[`cap_${Math.round(value * 100)}`] = () => rq2CaptureChoices(Q, S.horizon, BASE_CAPTURE).some(v => Math.abs(v - value) < 1e-8);
}
Q.rq2_capture.rows.forEach((row, i) => {
  B[`hlcap_${i}`] = () => String(row.Scenario).trim()[0] === S.scenario && String(row['Horizon (months)']) === String(S.horizon) && Math.abs(num(row['Savings capture']) - S.capture) < 1e-8;
});
Q.rq3_bsl.rows.forEach((row, i) => {
  B[`hlbsl_${i}`] = () => num(row['BSL rate (RM/t)']) === S.bslRate && prodPct(row['Production scenario']) === S.productionPct;
});
MATRIX.forEach((row, i) => { B[`hlmx_${i}`] = c => row === c.m; });
BREAK_EVEN.forEach((row, i) => { B[`hlbe_${i}`] = c => row === c.be; });
for (const key of ['mean', 'p95', 'switches', 'cpo', 'end']) {
  const f = key === 'switches' ? v => fx(v, 2) : key === 'cpo' ? v => `${fx(v, 2)} mn t` : v => rmMn(v, 0);
  B[`cmp20_${key}`] = c => c.mB20 ? f(c.mB20[key]) : noRun;
  B[`cmp30_${key}`] = c => c.mB30 ? f(c.mB30[key]) : noRun;
}

/* ── Shared fragments ────────────────────────────────── */
const outCard = (label, out, sub = '', state = '') => `<div class="out" ${state ? `data-state-of="${state}"` : ''}>
  <div class="out-label">${label}</div><div class="out-big" data-out="${out}"></div>${sub ? `<div class="out-sub" ${sub.startsWith('@') ? `data-out="${sub.slice(1)}">` : `>${sub}`}</div>` : ''}</div>`;
const light = (label, state, word, small) => `<div class="light" data-state-of="${state}"><span>${label}</span><strong data-out="${word}"></strong><small ${small.startsWith('@') ? `data-out="${small.slice(1)}">` : `>${small}`}</small></div>`;
const verdict = (blend, state, tag, reason) => `<div class="verdict" data-state-of="${state}" data-pop><div class="verdict-icon" data-lottie-of="${state}" aria-hidden="true"></div><div class="verdict-label">Blend for these settings</div>
  <div class="verdict-blend" data-out="${blend}"></div><div class="verdict-note" data-out="${reason}"></div><span class="verdict-tag" data-out="${tag}"></span></div>`;
const basisLine = out => `<p class="basis" data-out="${out}"></p>`;
const formula = () => `PME = ${coef('const').toFixed(4)} + ${coef('cpo_lag1').toFixed(4)} × CPO(last month) + ${coef('meoh_rm').toFixed(4)} × Methanol − ${Math.abs(coef('gly_rm')).toFixed(4)} × Glycerol`;
const fundBar = (bar, state) => `<div class="bar" style="margin-top:22px"><i data-w="${bar}" data-state-of="${state}"></i><em style="left:${FUND_LIMIT / SL.fund.max * 100}%"><b>Limit</b></em></div>`;
const fundLimit = `Must be above ${rmMn(FUND_LIMIT, 2)} (${num(A.fundSafetyMultiple)} × recent average drawdown of ${rmMn(A.rolling12AvgB20DrawdownRmMn, 2)}).`;
const savedRun = `Saved run · opening fund ${rmMn(A.seedCapitalRmMn)} · levy ${rmT(BASE.bslRateRmT)} · ${num(A.mcPaths).toLocaleString('en-MY')} price paths`;

// Developer fragments
const tbl = (cols, rows, { hl, cls = '', caption = '' } = {}) => `<div class="tbl-wrap" tabindex="0" role="region" aria-label="${esc(caption || 'Table')}"><table class="tbl ${cls}">${caption ? `<caption class="sr-only">${esc(caption)}</caption>` : ''}<thead><tr>${cols.map(c => `<th scope="col" class="${c.n ? 'n' : ''}">${c.h}</th>`).join('')}</tr></thead>
  <tbody>${rows.map((row, i) => `<tr ${hl ? `data-hl="${hl(row, i)}"` : ''}>${cols.map(c => `<td class="${c.n ? 'n' : ''}">${c.v(row, i)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
const kv = pairs => `<dl class="kv">${pairs.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>`;
const code = text => `<pre class="code">${text}</pre>`;
const alertBox = (title, text) => `<div class="alert">${ICON.alert}<div><b>${title}</b>${text ? `<span>${text}</span>` : ''}</div></div>`;
const quote = (tag, text) => `<blockquote class="quote"><span>${tag}</span><p>${esc(text)}</p></blockquote>`;
const finds = items => `<ul class="finds">${items.map(item => `<li class="is-${item.o}"><span class="find-ico">${item.o === 'yes' ? ICON.check : item.o === 'no' ? ICON.cross : ICON.minus}</span><p><b>${item.t}</b>${item.d ? `<small>${item.d}</small>` : ''}</p></li>`).join('')}</ul>`;

/* ── Charts (inline SVG, pointer and keyboard read-out, data table) ── */
const CH = {};
let chartUid = 0;
function niceScale(min, max, n = 5) {
  const span = max - min || Math.abs(max) || 1;
  const raw = span / n; const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map(m => m * mag).find(s => s >= raw);
  const lo = Math.floor(min / step) * step; const hi = Math.ceil(max / step) * step;
  const ticks = []; for (let v = lo; v <= hi + step / 2; v += step) ticks.push(Number(v.toFixed(8)));
  return { lo, hi, ticks };
}
// series: [{ k, label, color }]; kind 'line' or 'bars' (bars colour by sign); refs: [{ y, label }]
function chart({ rows, x, xLabel, series, kind = 'line', refs = [], height = 250, yFmt = v => fx(v, 0), tipX, aria, unit = 'RM per tonne' }) {
  const id = `ch${++chartUid}`;
  const W = 720, H = height, L = 60, R = 16, Tp = 14, Bt = 30;
  const xs = rows.map((row, i) => x ? num(row[x]) : i);
  const xmin = Math.min(...xs), xmax = Math.max(...xs);
  const values = rows.flatMap(row => series.map(s => num(row[s.k]))).concat(refs.map(r => r.y), kind === 'bars' ? [0] : []);
  const { lo, hi, ticks } = niceScale(Math.min(...values), Math.max(...values), 5);
  const X = v => L + (v - xmin) / (xmax - xmin || 1) * (W - L - R);
  const Y = v => Tp + (1 - (v - lo) / (hi - lo || 1)) * (H - Tp - Bt);
  const px = xs.map(X);
  let xt = '';
  if (x) xt = rows.map((row, i) => `<text x="${px[i]}" y="${H - 8}" text-anchor="middle">${row[x]}</text>`).join('');
  else xt = rows.map((row, i) => String(row.period).endsWith('-01') && Number(String(row.period).slice(0, 4)) % 2 === 0
    ? `<text x="${px[i]}" y="${H - 8}" text-anchor="middle">${String(row.period).slice(0, 4)}</text>` : '').join('');
  const grid = ticks.map(t => `<line class="gl" x1="${L}" x2="${W - R}" y1="${Y(t)}" y2="${Y(t)}"/><text class="yt" x="${L - 8}" y="${Y(t) + 4}" text-anchor="end">${yFmt(t)}</text>`).join('');
  const refLines = refs.map(r => `<line class="ref" x1="${L}" x2="${W - R}" y1="${Y(r.y)}" y2="${Y(r.y)}"/><text class="reft" x="${W - R}" y="${Y(r.y) - 6}" text-anchor="end">${r.label}</text>`).join('');
  let marks = '';
  if (kind === 'bars') {
    const bw = Math.max(1, (W - L - R) / rows.length - 0.6);
    const s = series[0];
    marks = rows.map((row, i) => { const v = num(row[s.k]); const y = v >= 0 ? Y(v) : Y(0); const h = Math.abs(Y(v) - Y(0));
      return `<rect class="bar-r ${v >= 0 ? 'pos' : 'neg'}" style="--d:${i}" x="${px[i] - bw / 2}" y="${y}" width="${bw}" height="${Math.max(0.6, h)}"/>`; }).join('');
  } else {
    marks = series.map(s => `<path class="ln" pathLength="1" style="stroke:${s.color}" d="${rows.map((row, i) => `${i ? 'L' : 'M'}${px[i].toFixed(1)} ${Y(num(row[s.k])).toFixed(1)}`).join('')}"/>`).join('')
      + (rows.length <= 24 ? series.map(s => rows.map((row, i) => `<circle class="pt" cx="${px[i]}" cy="${Y(num(row[s.k]))}" r="3.2" style="fill:${s.color}"/>`).join('')).join('') : '');
  }
  const dots = series.map((s, k) => `<circle class="hov" data-hov="${k}" r="5" style="fill:${kind === 'bars' ? 'var(--ink)' : s.color}" cx="-20" cy="-20"/>`).join('');
  const label = row => x ? `${xLabel} ${row[x]}` : row.period;
  CH[id] = { rows, px, series, W, H, Y, tipX: tipX ?? label, yFmt: v => fx(v, 2), idx: rows.length - 1 };
  const legend = series.length > 1 ? `<div class="legend">${series.map(s => `<span style="--k:${s.color}">${s.label}</span>`).join('')}</div>` : '';
  const first = rows[0], last = rows.at(-1);
  const summary = `${aria}. ${rows.length} points from ${label(first)} to ${label(last)}, ${unit}. Last point: ${series.map(s => `${s.label} ${fx(last[s.k], 2)}`).join(', ')}.`;
  const table = `<div class="tbl-wrap" tabindex="0" role="region" aria-label="${esc(aria)} data"><table class="tbl dense"><caption class="sr-only">${esc(aria)}, ${unit}</caption>
    <thead><tr><th scope="col">${x ? xLabel : 'Month'}</th>${series.map(s => `<th scope="col" class="n">${s.label}</th>`).join('')}</tr></thead>
    <tbody>${rows.map(row => `<tr><th scope="row">${x ? row[x] : row.period}</th>${series.map(s => `<td class="n">${fx(row[s.k], 2)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  return `<div class="chart" data-chart="${id}" tabindex="0" role="group" aria-label="${esc(summary)} Use the left and right arrow keys to read each point.">
    <svg viewBox="0 0 ${W} ${H}" aria-hidden="true">${grid}${kind === 'bars' ? `<line class="zero" x1="${L}" x2="${W - R}" y1="${Y(0)}" y2="${Y(0)}"/>` : ''}${refLines}${marks}
    <line class="guide" x1="-10" x2="-10" y1="${Tp}" y2="${H - Bt}"/>${dots}<g class="xt">${xt}</g></svg>${legend}</div>
    <details class="chart-data"><summary>Show the data as a table</summary>${table}</details>`;
}

function policyMap() {
  const rows = Q.rq4_map.rows.map(row => ({ cpo: num(row['CPO (RM/t)']), brent: num(row['Brent (USD/bbl)']), mandate: row.Mandate, vg: num(row['VG (RM/t)']), pme: num(row['PME (RM/t)']), mops: num(row['MOPS (RM/t)']) }));
  const brents = [...new Set(rows.map(r => r.brent))].sort((a, b) => a - b);
  const cpos = [...new Set(rows.map(r => r.cpo))].sort((a, b) => a - b);
  return `<div class="map-wrap"><table class="map"><caption>Price check by CPO price (rows) and Brent crude (columns): blend passing the price check, viability gap, and the PME and MOPS behind it.</caption>
    <thead><tr><th scope="col">CPO \\ Brent</th>${brents.map(b => `<th scope="col">USD ${b}</th>`).join('')}</tr></thead>
    <tbody>${cpos.map(cpo => `<tr><th scope="row">${rm(cpo)}</th>${brents.map(b => { const cell = rows.find(r => r.cpo === cpo && r.brent === b);
      return cell ? `<td class="cell ${cell.mandate}">${cell.mandate}<small>${signedRmT(cell.vg)}</small><small class="map-extra">PME ${fx(cell.pme, 0)} · MOPS ${fx(cell.mops, 0)}</small></td>` : '<td class="cell none">No saved value</td>'; }).join('')}</tr>`).join('')}</tbody>
  </table></div>`;
}

function financingCompare() {
  const rows = Q.rq3_financing.rows.filter(row => row.Instrument !== 'Seed capital (one-off)');
  const max = Math.max(...rows.map(row => num(row['Annual revenue (RM mn)'])));
  const taxBurden = num(rows.find(row => row.Instrument === 'Production tax')?.['Grower burden (RM/t)']);
  const H = ['Money raised', 'Income swings (CV, lower is steadier)', 'Cost to growers'];
  return `<div class="compare-wrap"><table class="compare"><caption class="sr-only">Funding options compared on money raised, income swings and cost to growers</caption>
    <thead><tr><th scope="col">Option</th>${H.map(h => `<th scope="col">${h}</th>`).join('')}</tr></thead><tbody>
    ${rows.map(row => {
      const isRef = String(row.Instrument).startsWith('WPL');
      const revenue = row['Annual revenue (RM mn)'];
      const cv = row['Revenue CV (↓=stable)'];
      const burden = row['Grower burden (RM/t)'];
      const rate = row['Rate (RM/t)'];
      return `<tr class="${isRef ? 'is-ref' : ''}">
        <th scope="row"><b>${isRef ? 'WPL' : row.Instrument}</b>${isRef ? '<span class="ref-tag">Baseline only</span>' : ''}<small>${row['Collection point']}${rate != null ? ` · ${rmT(rate)}` : ''}</small></th>
        <td data-label="${H[0]}"><strong>${revenue == null ? 'Not estimated' : rmMn(revenue, 1)}</strong>${revenue == null ? '' : `<span class="mini"><i style="width:${num(revenue) / max * 100}%"></i></span>`}</td>
        <td data-label="${H[1]}"><strong>${cv == null ? '—' : num(cv).toFixed(3)}</strong><small>${cv == null ? 'Not estimated' : 'CV of income'}</small></td>
        <td data-label="${H[2]}"><strong class="${burden != null && num(burden) < taxBurden ? 'best' : ''}">${burden == null ? '—' : rmT(burden, 2)}</strong><small>${burden == null ? 'Not estimated' : 'per tonne CPO'}</small></td>
      </tr>`;
    }).join('')}
  </tbody></table></div>`;
}

const hbars = (rows, max, line) => `<div class="hbars">${line ? `<em style="--f:${line.v / max}"><b>${line.label}</b></em>` : ''}${rows.map(r => `<div class="hb ${r.cls ?? ''}"><span>${r.label}</span><div class="hb-track"><i style="width:${Math.max(1.5, r.v / max * 100)}%;--k:${r.color ?? 'var(--c)'}"></i></div><strong>${r.text}</strong></div>`).join('')}</div>`;

/* ── Evidence: findings and proposal wording (from V3) ── */
const JOH = Q.rq1_johansen.rows;
const JOH0 = JOH.filter(row => row.nullRank === 'r = 0');
const JOH_REJ = JOH0.filter(row => row.rejectAt5Pct === true).length;
const RANK_COUNT = k => JOH0.filter(row => num(row.selectedRank) === k).length;
const SHORT = Q.rq2_scenarios_9m.rows, LONG = Q.rq2_scenarios_60m.rows;
const SHORT_PASS = SHORT.filter(row => num(row.p6_months) >= 0.9).length;
const SHORT_MIN = Math.min(...SHORT.map(row => num(row.p6_months)));
const LONG_MAX = Math.max(...LONG.map(row => num(row.solvency_prob)));
const FIN = name => Q.rq3_financing.rows.find(row => String(row.Instrument).startsWith(name)) ?? {};
const COMP = Q.rq3_competitiveness.rows.filter(row => String(row.Instrument).startsWith('BSL'));
const NO_CONCERN = COMP.every(row => row['Competitive concern'] === 'No');
const SEED_ALL_AT_MAX = Q.rq2_seed.rows.every(r => num(r['Optimal F0 (RM mn)']) >= SEED_MAX);
const PROPOSAL = {
  obj1: ['Objective (i)', 'Develop an Automatic Pricing Formula (APM-Bio): design a flexible biodiesel-price proxy equation based on the spread between diesel price (MOPS proxy) and biodiesel price (PME-cost proxy), including the fiscal break-even point for B20 and B30 mandates.',
    'H1', 'A significant long-run cointegration relationship exists among diesel price (MOPS proxy), biodiesel price (PME-cost proxy), and Brent crude oil prices for 2010-2026, with structural break points in 2022, 2024 and February 2026.'],
  obj2: ['Objective (ii)', 'Evaluate the feasibility of a Biodiesel Stabilisation Fund (BSF): develop a mathematical BSF model and stress-test its fiscal resilience via Monte Carlo simulation under multiple energy price scenarios.',
    'H2', 'A Biodiesel Stabilisation Fund funded from ring-fenced subsidy savings and/or low-burden fiscal instruments can sustain subsidy deficits for at least 6 months under extreme energy price shock scenarios (90th percentile Monte Carlo).'],
  obj3: ['Objective (iii)', 'Examine alternative financing sources: compare production tax, export-point tax/levy, ring-fenced subsidy savings, seed capital and a Biodiesel Stability Levy (BSL) as potential BSF funding instruments, while treating WPL only as a baseline reference because of its existing allocation and industry-burden concerns.',
    'H3', 'Export-point tax/levy and BSL mechanisms can generate more stable BSF capitalisation than production-tax or WPL-based options while reducing direct burden on upstream growers and maintaining palm oil industry competitiveness.'],
  obj4: ['Objective (iv)', 'Develop a Dynamic Hybrid Mandate Model: design an automatic blending-rate adjustment mechanism (B20/B30) based on a dual-trigger system combining a price threshold and a fiscal savings formula.',
    'H4', 'The dual-trigger mechanism can reduce biodiesel mandate fiscal cost volatility by at least 25% compared to the existing fixed-mandate mechanism.'],
};
const FINDINGS = {
  obj1: { head: 'Biodiesel cost equation built', status: 'Cost equation needs an independent data check', items: [
    { o: 'yes', t: 'The cost equation and price gap are built.', d: 'Lagged CPO, methanol and glycerol. The gap is reported separately.' },
    { o: 'partial', t: 'The saved long-run test uses a different price set.', d: `Export value, CPO and Brent (MYR). ${JOH_REJ} of ${JOH0.length} lag settings reject rank zero.` },
    { o: 'partial', t: 'Check the equation against independent cost data.', d: 'The PME cost series is a constructed proxy.' },
    { o: 'partial', t: 'H1 (PME, MOPS Diesel, Brent) is a separate test.', d: 'The saved test uses CPO in place of MOPS Diesel.' },
  ] },
  obj2: { head: `${SHORT_PASS} of ${SHORT.length} cases pass the six-month target`, status: 'Partly: H2 passes only some short tests', items: [
    { o: 'yes', t: 'The fund model and Monte Carlo stress tests are built.', d: `${num(A.mcPaths).toLocaleString('en-MY')} paths. Controls select saved runs.` },
    { o: SHORT_PASS === SHORT.length ? 'yes' : 'partial', t: `${SHORT_PASS} of ${SHORT.length} nine-month cases meet the 90% six-month target.`, d: `Weakest case: ${pct(SHORT_MIN)}.` },
    { o: LONG.some(row => num(row.solvency_prob) >= num(A.solvencyTarget)) ? 'partial' : 'no', t: `Five-year survival peaks at ${pct(LONG_MAX)}. ${fiveYearPasses} of ${LONG.length} meet ${pct(A.solvencyTarget, 0)}.`, d: `Every starting-money search result sits at ${rmMn(SEED_MAX)}, the largest amount tested.` },
  ] },
  obj3: { head: 'Lower cost to growers', status: 'Export levy and BSL carry a lower grower burden than a production tax', items: [
    { o: 'yes', t: 'Export levy and BSL carry a lower grower burden than a production tax.', d: `${rmT(FIN('Export-point')['Grower burden (RM/t)'], 2)} and ${rmT(FIN('BSL')['Grower burden (RM/t)'], 2)} vs ${rmT(FIN('Production tax')['Grower burden (RM/t)'], 2)}.` },
    { o: 'partial', t: 'Steadier income is not yet shown.', d: `Income CV ${fx(FIN('Export-point')['Revenue CV (↓=stable)'], 3)}, ${fx(FIN('BSL')['Revenue CV (↓=stable)'], 3)} and ${fx(FIN('Production tax')['Revenue CV (↓=stable)'], 3)}. WPL not estimated.` },
    { o: NO_CONCERN ? 'yes' : 'partial', t: NO_CONCERN ? `BSL passes the cost check at ${COMP.map(row => rm(row['Levy (RM/t CPO)'])).join(', ')} per tonne.` : 'Some BSL rates fail the cost check.', d: 'Uses assumed prices and costs.' },
  ] },
  obj4: { head: 'B20/B30 rule built', status: 'Partly', items: [
    { o: num(RQ4.reduction_vs_b30) >= 0.25 ? 'yes' : 'no', t: `Cost swings fall ${pct(RQ4.reduction_vs_b30)} against fixed B30.`, d: 'Clears the 25% H4 test only against B30.' },
    { o: REDUCTION_VS_B20 >= 0.25 ? 'yes' : 'no', t: `Cost swings fall ${pct(REDUCTION_VS_B20)} against fixed B20.`, d: 'The rule and fixed B20 have the same volatility.' },
    { o: 'partial', t: `The rule picks B30 in ${pct(RQ4.b30_months_share)} of past months.`, d: 'Only when the gap is positive. B30 still needs approval.' },
  ] },
};
const evidenceCards = id => [
  { icon: 'list', title: 'What we found', src: 'Saved results', body: () => finds(FINDINGS[id].items) },
  { icon: 'quote', title: 'Proposal wording', src: 'Accepted proposal', body: () => quote(PROPOSAL[id][0], PROPOSAL[id][1]) + quote(PROPOSAL[id][2], PROPOSAL[id][3]) },
];

/* ── Tabs, steps and their detail stacks ─────────────── */
const lastTrace = TRACE.rows.slice(1);
const traceCell = (row, col) => `${fx(row[col], 2)}<small>${col}${row.row}</small>`;
const traceLagCell = (row, i) => `${fx(TRACE.rows[i].D, 2)}<small>D${TRACE.rows[i].row}</small>`;
const head = col => esc(String(TRACE.headers[col] ?? col).split('\n')[1] ?? col);
const traceNote = `<p class="note">The latest ${lastTrace.length} months of the MONTHLY DATA sheet in ${esc(TRACE.masterFile)} (the month before supplies the CPO lag). A sample trace for checking, not the full audit.</p>`;

const TABS = [
  {
    id: 'home', label: 'Home', sub: '', kicker: 'Home', home: true, steps: [],
    title: 'To decide, each month, whether Malaysia’s biodiesel blend stays at B20 or moves to B30.',
  },
  {
    id: 'obj1', label: 'OBJ1', sub: 'Price', kicker: 'Objective 1',
    title: 'To develop an automatic pricing mechanism for biodiesel (APM-Bio).',
    steps: [
      { icon: 'pump', short: 'To set the diesel price', title: 'To set the diesel price', chip: () => rmT(S.mops),
        body: () => `<div>${slider('mops', 'Diesel price (MOPS)')}${term('MOPS', 'Mean of Platts Singapore: the regional diesel benchmark price.')}</div>${outCard('Diesel price', 'mops', '@mopsSub')}`,
        stack: () => [
          { icon: 'chart', title: 'Monthly prices', src: 'rq1_monthly', body: () => chart({ rows: MONTHLY, aria: 'Monthly MOPS, PME and CPO prices',
            series: [{ k: 'mopsRmT', label: 'Diesel (MOPS)', color: 'var(--s1)' }, { k: 'pmeRmT', label: 'Biodiesel (PME)', color: 'var(--s2)' }, { k: 'cpoRmT', label: 'CPO', color: 'var(--s6)' }] })
            + `<p class="note">${MONTHLY[0].period} to ${MONTHLY.at(-1).period} · ${MONTHLY.length} months · RM per tonne.</p>` },
          { icon: 'db', title: 'Master data', src: TRACE.masterFile, body: () => tbl([
            { h: 'Month', v: r => r.period }, { h: `MOPS <small>${head('H')}</small>`, v: r => traceCell(r, 'H'), n: 1 },
            { h: `PME <small>${head('I')}</small>`, v: r => traceCell(r, 'I'), n: 1 }, { h: `Gap <small>${head('J')}</small>`, v: r => traceCell(r, 'J'), n: 1 }], lastTrace, { caption: 'Master data trace' }) + traceNote },
        ] },
      { icon: 'flask', short: 'To estimate the biodiesel cost', title: 'To estimate the biodiesel cost', chip: c => rmT(c.pme),
        body: () => `<div>
          <div class="seg" role="group" aria-label="How to set biodiesel cost"><button type="button" data-set="pmeMode" data-val="latest">Snapshot cost</button><button type="button" data-set="pmeMode" data-val="formula">Build from ingredients</button></div>
          <div data-show="pmeLatest">${slider('pme', 'Biodiesel cost (PME)')}</div>
          <div data-show="pmeFormula">${slider('cpoLag', 'CPO price, last month')}${slider('methanol', 'Methanol price')}${slider('glycerol', 'Glycerol price (by-product)')}
            <p class="note">Start values are the reviewed master inputs for ${SNAP_MONTH}: cells D${TRACE.rows.at(-2).row}, E${TRACE_LAST.row} and F${TRACE_LAST.row}.</p></div>
          ${term('PME', 'Palm methyl ester: the biodiesel blended into diesel.')}
        </div>${outCard('Biodiesel cost', 'pme', '@pmeSource')}`,
        stack: () => [
          { icon: 'code', title: 'Equation', src: 'rq1_coefficients · OLS-HAC', body: () => code(`PME_COST(t) = ${coef('const').toFixed(4)}\n            + ${coef('cpo_lag1').toFixed(4)} × CPO(t−1)\n            + ${coef('meoh_rm').toFixed(4)} × Methanol(t)\n            − ${Math.abs(coef('gly_rm')).toFixed(4)} × Glycerol(t)`)
            + `<div class="build"><div><span>Constant</span><b data-out="fitConst"></b></div><div><span>CPO term</span><b data-out="fitCpo"></b></div><div><span>Methanol term</span><b data-out="fitMeoh"></b></div><div><span>Glycerol term</span><b data-out="fitGly"></b></div><div class="is-total"><span>Fitted PME</span><b data-out="fitTotal"></b></div></div>`
            + `<p class="note">Live terms use the ingredient sliders; at the start values they are the ${SNAP_MONTH} master inputs. Constant + three terms = fitted PME at 2 decimal places. The saved diagnostic reports ${rmT(diag('Fitted'), 2)} with unrounded coefficients; the small difference is coefficient rounding. Residual vs the master series: <b data-out="fitResid"></b>. ${META.functionalForm} form · n = ${META.sampleSize}.</p>` },
          { icon: 'table', title: 'Coefficients', src: 'rq1_coefficients', body: () => tbl([
            { h: 'Term', v: r => ({ const: 'Constant', cpo_lag1: 'CPO (t−1)', meoh_rm: 'Methanol', gly_rm: 'Glycerol' })[r.Variable] ?? r.Variable },
            { h: 'Coef.', v: r => fx(r.Coefficient, 4), n: 1 }, { h: '95% CI', v: r => `${fx(r['CI 95% lo'], 4)} to ${fx(r['CI 95% hi'], 4)}`, n: 1 },
            { h: 'p', v: r => fx(r['p-value'], 4), n: 1 }, { h: 'Sig.', v: r => r.Sig ?? '' }], COEF, { caption: 'Cost equation coefficients' })
            + `<p class="note">RM-to-RM associations, not causal effects.</p>` },
          { icon: 'list', title: 'Cost build-up', src: 'rq1_apmbio_diagnostic', body: () => tbl([
            { h: 'Component', v: r => r.component }, { h: 'RM/t', v: r => fx(r.rmTonne, 2), n: 1 }, { h: 'Type', v: r => `<small>${r.type}</small>` }], Q.rq1_apmbio_diagnostic.rows, { caption: 'Saved APM-Bio cost build-up' })
            + `<p class="note">Fitted PME and the master-series PME are separate values. They are not forced to be equal.</p>` },
          { icon: 'db', title: 'Master data', src: TRACE.masterFile, body: () => tbl([
            { h: 'Month', v: r => r.period }, { h: 'PME', v: r => traceCell(r, 'I'), n: 1 }, { h: 'CPO (t−1)', v: (r, i) => traceLagCell(r, i), n: 1 },
            { h: 'Methanol', v: r => traceCell(r, 'E'), n: 1 }, { h: 'Glycerol', v: r => traceCell(r, 'F'), n: 1 }], lastTrace, { caption: 'Master data trace, cost inputs' }) + traceNote },
        ] },
      { icon: 'scale', short: 'To calculate the viability gap', title: 'To calculate the viability gap', chip: c => signedRmT(c.p.gap), single: true,
        body: () => `<div class="equation">
            <div class="eq-term"><span>Diesel price</span><strong data-out="mops"></strong></div><div class="eq-op">−</div>
            <div class="eq-term"><span>Biodiesel cost</span><strong data-out="pme"></strong></div><div class="eq-op">=</div>
            <div class="eq-term result"><span>Viability gap</span><strong data-out="gap"></strong></div></div>
          <div class="meter" role="img" aria-label="Viability gap position"><span class="zero"><b>VG = 0</b></span><span class="marker" data-l="gapPos"></span></div>
          <div class="meter-labels"><span>← Support needed</span><span>Savings →</span></div>
          <span class="badge" data-state-of="gapState" data-out="gapWord"></span>`,
        stack: () => {
          const gaps = MONTHLY.map(r => num(r.viabilityGapRmT));
          const positive = gaps.filter(g => g > 0).length; const deep = gaps.filter(g => g < num(A.b15GapFloor)).length;
          return [
            { icon: 'chart', title: 'Monthly gap', src: 'rq1_monthly', body: () => chart({ rows: MONTHLY, kind: 'bars', aria: 'Monthly viability gap',
              series: [{ k: 'viabilityGapRmT', label: 'Viability gap', color: 'var(--s3)' }], refs: [{ y: num(A.b15GapFloor), label: `B15 floor ${rmT(A.b15GapFloor)}` }] }) },
            { icon: 'grid', title: 'Gap summary', src: 'rq1_monthly', body: () => kv([
              ['Months with savings', `${positive} of ${gaps.length}`], ['Below the B15 floor', `${deep} months`],
              ['Lowest', signedRmT(Math.min(...gaps))], ['Highest', signedRmT(Math.max(...gaps))]]) },
            { icon: 'code', title: 'Formula', src: 'decision_snapshot', body: () => code(`VG = MOPS − PME\nB30 price check: VG > ${rmT(A.b30GapThreshold)}\nB15 floor:       VG < ${rmT(A.b15GapFloor)}`) },
          ];
        } },
      { icon: 'target', short: 'To find the break-even CPO price', title: 'To find the break-even CPO price', chip: c => `USD ${c.be.brent} → ${rm(c.be.cpo)}`,
        body: () => `<div><div class="control-top"><span class="label">Brent crude oil (USD per barrel)</span></div>
          <div class="chips" role="group" aria-label="Brent crude oil price">${BREAK_EVEN.map(b => `<button type="button" class="chip" data-set="brent" data-type="num" data-val="${b.brent}">USD ${b.brent}</button>`).join('')}</div>
          <p class="note">Biodiesel breaks even when CPO is at or below this price. Saved grid: methanol and glycerol stay at their ${SNAP_MONTH} values.</p></div>
          <div class="out" data-state-of="beState"><div class="out-label">Break-even CPO price</div><div class="out-big" data-out="beCpo"></div><div class="out-sub" data-out="beSub"></div><span class="badge" data-state-of="beState" data-out="beWord"></span></div>`,
        stack: () => [
          { icon: 'chart', title: 'Break-even line', src: 'rq1_breakeven', body: () => chart({ rows: Q.rq1_breakeven.rows, x: 'Brent (USD/bbl)', xLabel: 'Brent USD', aria: 'Break-even CPO and diesel price by Brent',
            series: [{ k: 'Break-even CPO (RM/t)', label: 'Break-even CPO', color: 'var(--s4)' }, { k: 'MOPS diesel (RM/t)', label: 'Diesel (MOPS)', color: 'var(--s1)' }] }) },
          { icon: 'table', title: 'Grid', src: 'rq1_breakeven', body: () => tbl([
            { h: 'Brent', v: r => `USD ${r.brent}` }, { h: 'Diesel (MOPS)', v: r => fx(r.mops, 1), n: 1 }, { h: 'Break-even CPO', v: r => fx(r.cpo, 1), n: 1 },
            { h: 'Difference', v: r => fx(r.cpo - r.mops, 1), n: 1 }], BREAK_EVEN, { hl: (r, i) => `hlbe_${i}`, caption: 'Break-even grid' })
            + `<p class="note">RM per tonne. The difference is between the two lines, not the live gap.</p>` },
        ] },
      { icon: 'wave', short: 'To test the long-run link', title: 'To test the long-run price link', chip: () => `${JOH_REJ} of ${JOH0.length} reject`,
        body: () => `<div><div class="out-label">Trace statistic vs 5% critical value · rank zero</div>
            ${hbars(JOH0.map(r => ({ label: `Lag ${r.kArDiff}`, v: num(r.statistic), text: fx(r.statistic, 1), color: r.rejectAt5Pct ? 'var(--s5)' : 'var(--muted)' })),
              Math.max(...JOH0.map(r => num(r.statistic))) * 1.08, { v: num(JOH0[0].critical5Pct), label: `5% · ${fx(JOH0[0].critical5Pct, 2)}` })}</div>
          <div class="out" data-state="${JOH_REJ === JOH0.length ? 'good' : 'hold'}"><div class="out-label">Rank zero rejected</div><div class="out-big">${JOH_REJ} of ${JOH0.length}</div>
            <div class="out-sub">lag settings · Johansen trace test</div>
            <div class="tags"><span>Export value</span><span>CPO</span><span>Brent (MYR)</span></div>
            <span class="badge" data-state="${JOH_REJ === JOH0.length ? 'good' : 'hold'}">${JOH_REJ === JOH0.length ? 'Supported for this price set' : 'Mixed'}</span></div>`,
        stack: () => [
          { icon: 'table', title: 'Johansen table', src: 'rq1_johansen', body: () => tbl([
            { h: 'Lags', v: r => r.kArDiff, n: 1 }, { h: 'Null', v: r => r.nullRank }, { h: 'Trace', v: r => fx(r.statistic, 3), n: 1 },
            { h: '5% crit.', v: r => fx(r.critical5Pct, 3), n: 1 }, { h: 'Decision', v: r => `<span class="pill ${r.rejectAt5Pct ? 'good' : ''}">${r.rejectAt5Pct ? 'Reject' : 'Keep'}</span>` },
            { h: 'Rank', v: r => r.selectedRank, n: 1 }], JOH, { caption: 'Johansen trace test' }) },
          { icon: 'grid', title: 'Selected rank', src: 'rq1_johansen', body: () => kv([['Rank 1', `${RANK_COUNT(1)} settings`], ['Rank 2', `${RANK_COUNT(2)} settings`], ['Lags tested', `${Math.min(...JOH.map(r => num(r.kArDiff)))} to ${Math.max(...JOH.map(r => num(r.kArDiff)))}`]]) },
          { icon: 'alert', title: 'Three variable sets', src: 'Read before reporting H1', body: () => tbl([
            { h: 'Check', v: r => `<b>${r[0]}</b>` }, { h: 'Variables', v: r => r[1] }], [
              ['Saved test', 'Biodiesel export value · CPO · Brent (MYR)'], ['Proposal H1', 'PME · MOPS Diesel · Brent'], ['Cost equation', 'PME cost · CPO (t−1) · Methanol · Glycerol']], { caption: 'Variable sets' })
            + `<p class="note">This result does not confirm the other two.</p>` },
        ] },
      { icon: 'flag', short: 'To report the price signal', title: 'To report the price signal', chip: c => c.p.gap > 0 ? 'Savings' : c.p.gap < 0 ? 'Support needed' : 'Equal',
        body: () => `<div>${outCard('APM-Bio price signal', 'gap', '@gapSentence', 'gapState')}${basisLine('basis')}</div>
          <div><div class="lights" style="grid-template-columns:1fr">${light('B30 price check', 'priceState', 'priceWord', 'The gap must be above RM 0/t')}</div>
          <div class="handoff"><div class="handoff-arrow" data-lottie-flow aria-hidden="true"></div><span>This gap feeds the Objective 4 price check and Decision now.</span></div>
          <div class="chips"><button type="button" class="btn btn-primary" data-tab="obj4">Use in Objective 4${ICON.chev}</button><button type="button" class="btn btn-ghost" data-tab="decision">Decision now</button></div></div>`,
        stack: () => evidenceCards('obj1') },
    ],
  },
  {
    id: 'obj2', label: 'OBJ2', sub: 'Shock test', kicker: 'Objective 2',
    title: 'To evaluate whether a Biodiesel Stabilisation Fund (BSF) can withstand price shocks.',
    steps: [
      { icon: 'cycle', short: 'To see how the fund moves', title: 'To see how the fund moves each month', chip: () => 'Monthly flow', single: true,
        body: () => `<div class="cycle" data-cycle>
          <div class="cyc on" style="--k:var(--s1-ink)"><b>F</b><strong>Opening balance</strong><span>Starts at ${rmMn(A.seedCapitalRmMn)}</span></div><div class="cyc-op">+</div>
          <div class="cyc on" style="--k:var(--s6-ink);animation-delay:.5s"><b>+</b><strong>Money in</strong><span>Levy and savings</span></div><div class="cyc-op">−</div>
          <div class="cyc on" style="--k:var(--s2-ink);animation-delay:1s"><b>−</b><strong>Support paid</strong><span>When biodiesel costs more</span></div><div class="cyc-op">=</div>
          <div class="cyc on" style="--k:var(--s3-ink);animation-delay:1.5s"><b>F′</b><strong>Closing balance</strong><span>Next month’s start</span></div></div>
          <p class="loop-note">Repeated every month across ${num(A.mcPaths).toLocaleString('en-MY')} simulated oil-price paths. The balance cannot fall below RM 0.
            <button type="button" class="btn-link replay" data-replay>${ICON.replay}<span>Replay</span></button></p>
          ${term('BSF', 'Biodiesel Stabilisation Fund: money set aside to pay the gap when biodiesel costs more than diesel.')}`,
        stack: () => [
          { icon: 'code', title: 'Implemented rule', src: 'rq2 · Python model', body: () => code('F(t) = max(0, F(t−1) + savings(t) + levy(t) − support(t))\nsolvent  if  F(t) > 0 in every month')
            + `<p class="note">Unpaid support after the fund empties is not carried forward.</p>` },
          { icon: 'grid', title: 'Run settings', src: 'model_assumptions', body: () => kv([
            ['Simulated paths', num(A.mcPaths).toLocaleString('en-MY')], ['Opening fund', rmMn(A.seedCapitalRmMn)], ['Levy in the runs', rmT(BASE.bslRateRmT)],
            ['Full-period target', pct(A.solvencyTarget, 0)], ['Six-month target', '90%'], ['Test periods', `${A.headlineMonths} and ${A.robustnessMonths} months`]])
            + `<p class="note">Saved runs use these values, not the sliders.</p>` },
          { icon: 'alert', title: 'Review flag', src: 'V3 note', body: () => alertBox('The monthly price step needs checking.', 'Prices change monthly, then get a second yearly-to-monthly adjustment. Review before policy use.') },
        ] },
      { icon: 'drop', short: 'To choose an oil-price case', title: 'To choose an oil-price case', chip: () => scenarioName(S.scenario), single: true,
        body: () => `<div class="choice-grid" role="group" aria-label="Oil-price case">${SCENARIOS.map(id => { const s = rq2CaseSettings[id];
          return `<button type="button" class="choice" data-set="scenario" data-val="${id}"><span class="tag">Case ${id}</span><strong>${s.name}</strong><span>${s.jump ? `Brent USD ${s.brentTarget}/bbl after a ${s.jump}% jump` : `Brent USD ${s.brentTarget}/bbl`}</span></button>`; }).join('')}</div>
          <p class="note">Four saved stress cases, not forecasts.</p>`,
        stack: () => [
          { icon: 'table', title: 'Case settings', src: 'v3_config.py · SCENARIOS', body: () => tbl([
            { h: 'Case', v: id => `<b>${id}</b> ${rq2CaseSettings[id].name}` }, { h: 'Brent target', v: id => `USD ${rq2CaseSettings[id].brentTarget}`, n: 1 },
            { h: 'Volatility', v: id => `${rq2CaseSettings[id].volatility.toFixed(2)}×`, n: 1 }, { h: 'Jump', v: id => rq2CaseSettings[id].jump ? `+${rq2CaseSettings[id].jump}%` : '—', n: 1 },
            { h: 'CPO rise', v: id => rq2CaseSettings[id].cpoRise ? `+${rq2CaseSettings[id].cpoRise}%` : '—', n: 1 },
            { h: 'Reversion', v: id => rq2CaseSettings[id].reversionMonths ? `${rq2CaseSettings[id].reversionMonths} mo` : '—', n: 1 }], SCENARIOS, { caption: 'Oil-price case settings' })
            + `<p class="note">Volatility is a multiple of the historical estimate.</p>` },
          { icon: 'alert', title: 'Why four cases', src: 'V3 note', body: () => alertBox('Four selected stress cases, not forecasts.', 'A fifth case needs a new reviewed run.') },
        ] },
      { icon: 'calendar', short: 'To choose the test period', title: 'To choose the test period', chip: () => periodLabel(S.horizon), single: true,
        body: () => `<div class="choice-grid two" role="group" aria-label="Test period">
          <button type="button" class="choice" data-set="horizon" data-val="9"><span class="tag">Short test</span><strong>9 months</strong><span>Includes the 6-month check</span></button>
          <button type="button" class="choice" data-set="horizon" data-val="60"><span class="tag">Long test</span><strong>5 years</strong><span>60 months</span></button></div>
          <p class="note">The two periods are separate saved runs with their own price-path settings. Compare cases within one period.</p>`,
        stack: () => [
          { icon: 'calendar', title: 'Why these periods', src: 'model_assumptions', body: () => kv([
            [`${A.headlineMonths} months`, 'H2’s six-month check, plus three months'], [`${A.robustnessMonths} months`, 'Long test and the starting-money search'], ['Other periods', 'No saved runs']])
            + `<p class="note">The non-jump price drift depends on the period, so the 9-month and 5-year runs are not two lengths of one experiment.</p>` },
        ] },
      { icon: 'percent', short: 'To choose the savings paid in', title: 'To choose the share of savings paid into the fund', chip: c => `${pct(S.capture, 0)}${c.e.row ? '' : ' · not tested'}`, single: true,
        body: () => `<div class="choice-grid" role="group" aria-label="Savings share">${CAPTURE_OPTIONS.map(v => `<button type="button" class="choice" data-set="capture" data-type="num" data-val="${v}" data-show="cap_${Math.round(v * 100)}"><span class="tag">Savings share</span><strong>${pct(v, 0)}</strong><span>of savings paid in</span></button>`).join('')}</div>
          <p class="note" data-show="capUntested"><b>This share was not tested for this period.</b> Choose one of the cards above.</p>
          <p class="note">Only the shares tested in the saved runs are shown. The 9-month test used 100% only.</p>`,
        stack: () => [
          { icon: 'grid', title: 'Tested combinations', src: 'rq2_scenarios · rq2_capture', body: () => `<div class="cover"><span></span>${CAPTURE_OPTIONS.map(v => `<b>${pct(v, 0)}</b>`).join('')}
            ${['9', '60'].map(h => `<b>${periodLabel(h)}</b>${CAPTURE_OPTIONS.map(v => rq2CaptureChoices(Q, h, BASE_CAPTURE).some(x => Math.abs(x - v) < 1e-8) ? `<i class="yes" aria-label="tested">${ICON.check}</i>` : '<i class="no" aria-label="not tested">—</i>').join('')}`).join('')}</div>
            <p class="note">Untested shares are never interpolated.</p>` },
          { icon: 'table', title: 'Savings runs', src: 'rq2_capture', body: () => tbl([
            { h: 'Share', v: r => pct(r['Savings capture'], 0), n: 1 }, { h: 'Case', v: r => scenarioName(r.Scenario) }, { h: 'Months', v: r => r['Horizon (months)'], n: 1 },
            { h: 'Full period', v: r => pct(r['Solvency prob'], 2), n: 1 }, { h: '6 months', v: r => pct(r['P(survive ≥6m)'], 2), n: 1 }], Q.rq2_capture.rows, { hl: (r, i) => `hlcap_${i}`, caption: 'Savings-share runs' }) },
        ] },
      { icon: 'shield', short: 'To read fund survival', title: 'To read whether the fund survives', chip: c => c.e.row ? pct(c.e.solvency, 1) : 'Not tested',
        body: () => `<div>
          <span class="run-badge">${savedRun}</span>
          <div class="gauge"><div class="gauge-top"><span>Lasts the first 6 months</span><strong data-out="s6"></strong></div><div class="bar"><i data-w="s6w" data-state-of="s6state"></i><em style="left:90%"><b>90%</b></em></div><small data-out="s6word"></small></div>
          <div class="gauge" style="margin-top:28px"><div class="gauge-top"><span data-out="fullLabel"></span><strong data-out="sol"></strong></div><div class="bar"><i data-w="solw" data-state-of="solstate"></i><em style="left:${num(A.solvencyTarget) * 100}%"><b>${pct(A.solvencyTarget, 0)}</b></em></div><small data-out="solword"></small></div>
          <div class="mini-cases" role="group" aria-label="Oil-price case">${SCENARIOS.map(id => `<button type="button" class="mini-case" data-set="scenario" data-val="${id}"><div class="col"><i data-h="mc_${id}" data-state-of="mcs_${id}"></i></div><strong data-out="mcv_${id}"></strong><span>${scenarioName(id)}</span></button>`).join('')}</div>
          <p class="note">Chance the fund lasts the whole period, for each oil-price case.</p></div>
          <div><div class="out" data-state-of="rq2State"><div class="out-label">Answer</div><div class="out-big md" data-out="rq2Head"></div><div class="out-sub" data-out="rq2Sub"></div><div class="out-sub">Saved run: <code data-out="rq2Query"></code></div></div>
            <p class="limit"><b>Read with care.</b> Saved model runs with their own assumptions. The monthly price step gets a second yearly-to-monthly scaling and is under review, so treat these probabilities as indicative.</p>
            <details class="disclose"><summary>What changes this result?</summary><p class="note">It changes with the oil-price case, the test period and the savings share, because each picks a different saved run. The levy rate, CPO production and starting money in Objective 3, and the fund balance in Objective 4, do <b>not</b> rerun this model.</p></details></div>`,
        stack: () => [
          { icon: 'bars', title: 'All four cases', src: 'rq2_scenarios', body: () => `<div class="gbars">
              <div class="gb-lines"><em style="bottom:${num(A.solvencyTarget) * 100}%"><b>${pct(A.solvencyTarget, 0)}</b></em><em class="six" style="bottom:90%"><b>90%</b></em></div>
              ${SCENARIOS.map(id => `<div class="gb"><div class="gb-plot"><i class="a" data-h="mc_${id}"></i><i class="b" data-h="m6_${id}"></i></div><span>${scenarioName(id)}</span><small><b data-out="mcv_${id}"></b> · <b data-out="m6v_${id}"></b></small></div>`).join('')}</div>
            <div class="legend"><span style="--k:var(--s3)">Whole period</span><span style="--k:var(--s1)">First 6 months</span></div>` },
          { icon: 'grid', title: 'Tail results', src: 'rq2_scenarios', body: () => `<div data-show="hasStats">${kv([
              ['95th-percentile support requirement (VaR 95%)', '<span data-out="stVar"></span>'], ['Average support in the worst 5% of paths (CVaR 95%)', '<span data-out="stCvar"></span>'], ['Median final balance', '<span data-out="stMed"></span>']])}
              <p class="note" data-out="stPeriod"></p>
              <p class="note">VaR 95% is the cut-off: 95% of paths need no more support than this. CVaR 95% is the average of the paths at or beyond that cut-off.</p></div>
            <div data-show="noStats">${alertBox('Not in this savings run.', 'Only the 100% runs saved tail results.')}</div>
            <div data-show="capUntested">${alertBox('No saved run for this choice.', '')}</div>` },
          { icon: 'table', title: 'Saved runs', src: `rq2_scenarios_${S.horizon}m`, body: () => tbl([
            { h: 'Case', v: r => scenarioName(r.Scenario) }, { h: 'Full period', v: r => pct(r.solvency_prob, 2), n: 1 }, { h: '6 months', v: r => pct(r.p6_months, 2), n: 1 },
            { h: 'CVaR 95%', v: r => fx(r.cvar95_rm_m, 0), n: 1 }, { h: 'Median end', v: r => fx(r.median_end, 0), n: 1 }], Q[`rq2_scenarios_${S.horizon}m`].rows, { caption: 'Saved fund runs' })
            + `<p class="note">RM mn · ${periodLabel(S.horizon)} · 100% savings share.</p>` },
        ] },
      { icon: 'seed', short: 'To find the starting money', title: 'To find the starting money needed', chip: () => `Cap ${rmMn(SEED_MAX)}`,
        body: () => { const seed = (m, s) => num(Q.rq2_seed.rows.find(r => r.Mandate === m && String(r.Scenario).trim().startsWith(s))?.['Optimal F0 (RM mn)']);
          const b20 = seed('B20', 'A'), b30 = seed('B30', 'A');
          return `<div class="cards4 three">
            <div class="kcard" style="--k:var(--b20)"><span>B20 · low oil</span><strong>${rmMn(b20)}</strong><small>5-year search</small></div>
            <div class="kcard" style="--k:var(--b30)"><span>B30 · low oil</span><strong>${rmMn(b30)}</strong><small>5-year search</small></div>
            <div class="kcard" style="--k:var(--s5)"><span>B30 minus B20</span><strong>${rmMn(Math.max(0, b30 - b20))}</strong><small>both at the largest amount tested</small></div></div>
          <div class="out" data-state="hold"><div class="out-label">Answer</div><div class="out-big md">${SEED_ALL_AT_MAX ? 'Search cap reached' : 'Mixed search results'}</div><div class="out-sub">${rmMn(SEED_MAX)} is the largest amount tested, not a confirmed minimum. The saved table has no search-status column, so “cap reached” is inferred from every result sitting at that amount.</div></div>`; },
        stack: () => [
          { icon: 'table', title: 'All starting-money tests', src: 'rq2_seed', body: () => tbl([
            { h: 'Blend', v: r => r.Mandate }, { h: 'Case', v: r => scenarioName(r.Scenario) }, { h: 'Levy', v: r => rmT(r['BSL rate (RM/t)']), n: 1 },
            { h: 'Months', v: r => r['Horizon (months)'], n: 1 }, { h: 'Amount tested', v: r => `${fx(r['Optimal F0 (RM mn)'], 0)}${num(r['Optimal F0 (RM mn)']) >= SEED_MAX ? ' <span class="pill">largest tested</span>' : ''}`, n: 1 }], Q.rq2_seed.rows, { caption: 'Starting-money search' })
            + `<p class="note">RM mn. ${rmMn(SEED_MAX)} = RM ${(SEED_MAX / 1000).toLocaleString('en-MY')} billion.</p>` },
          ...evidenceCards('obj2'),
        ] },
    ],
  },
  {
    id: 'obj3', label: 'OBJ3', sub: 'Money sources', kicker: 'Objective 3',
    title: 'To determine the best sources of funding for the BSF.',
    steps: [
      { icon: 'coins', short: 'To set the levy rate (BSL)', title: 'To set the Biodiesel Stability Levy (BSL) rate', chip: () => rmT(S.bslRate),
        body: () => `<div>${slider('bslRate', 'BSL rate per tonne of CPO')}<div class="chips" role="group" aria-label="Saved BSL rates">${[20, 25, 30].map(v => `<button type="button" class="chip" data-set="bslRate" data-type="num" data-val="${v}">${rmT(v)}</button>`).join('')}</div>
          ${term('BSL', 'Biodiesel Stability Levy: a proposed charge per tonne of CPO, paid into the fund.')}</div>
          ${outCard(`Levy income · ${PROD_PERIOD} production base`, 'bslRevenue', '@bslSub')}`,
        stack: () => {
          const rates = [...new Set(Q.rq3_bsl.rows.map(r => num(r['BSL rate (RM/t)'])))].sort((a, b) => a - b);
          return [
            { icon: 'grid', title: 'Saved levy grid', src: 'rq3_bsl', body: () => `<div class="bslgrid"><span class="ax">Rate \\ Production</span>${[90, 100, 110].map(p => `<span class="ax">${prodName(p)}</span>`).join('')}
              ${rates.map(rate => `<span class="ax">${rmT(rate)}</span>${[90, 100, 110].map(p => { const i = Q.rq3_bsl.rows.findIndex(r => num(r['BSL rate (RM/t)']) === rate && prodPct(r['Production scenario']) === p); const row = Q.rq3_bsl.rows[i];
                return row ? `<div class="bc ${num(row['Annual revenue (RM mn)']) >= 500 ? 'meets' : ''}" data-hl="hlbsl_${i}"><b>${fx(row['Annual revenue (RM mn)'], 1)}</b><small>${row['CPO production (MT)']} t</small></div>` : '<div class="bc">—</div>'; }).join('')}`).join('')}</div>
              <p class="note">RM mn on the ${PROD_PERIOD} production base. Highlights only at a saved rate and production. All cells are below the RM 500 mn line.</p>` },
            { icon: 'bars', title: 'Producer margin', src: 'rq3_competitiveness', body: () => hbars([
                ...COMP.map(r => ({ label: r.Instrument, v: num(r['Margin reduction (%)']), text: `${fx(r['Margin reduction (%)'], 2)}%` })),
                ...Q.rq3_competitiveness.rows.filter(r => !String(r.Instrument).startsWith('BSL')).map(r => ({ label: 'Indonesia levy', v: num(r['Margin reduction (%)']), text: `${fx(r['Margin reduction (%)'], 2)}%`, color: 'var(--muted)' }))],
              6, { v: 5, label: '5% concern' })
              + tbl([{ h: 'Levy', v: r => r.Instrument }, { h: 'Burden', v: r => r['Producer burden (RM/t)'] == null ? '—' : rmT(r['Producer burden (RM/t)'], 2), n: 1 },
                { h: 'vs Indonesia', v: r => `<small>${r['vs Indonesia levy']}</small>` }, { h: 'Concern', v: r => r['Competitive concern'] }], Q.rq3_competitiveness.rows, { caption: 'Producer burden and margin' }) },
          ];
        } },
      { icon: 'palm', short: 'To set CPO production', title: 'To set CPO production', chip: () => `${S.productionPct}%`,
        body: () => `<div>${slider('productionPct', 'CPO production (% of base)', `Base: ${num(A.annualCpoProductionMt).toFixed(3)} mn t (${PROD_PERIOD}, not a full year).`)}</div>
          <div class="out"><div class="out-label">CPO production</div><div class="out-big" data-out="production"></div><div class="out-sub">Levy income: <b data-out="bslRevenue"></b></div></div>`,
        stack: () => [
          { icon: 'db', title: 'Production base', src: 'model_assumptions · K column', body: () => kv([
            ['Base', `${num(A.annualCpoProductionMt).toFixed(6)} mn t`], ['Period', PROD_PERIOD], ['Tested range', '90% to 110%']])
            + alertBox('Labelled annual in the saved output.', 'Align periods before reporting yearly income. The page does not annualise four months.') },
        ] },
      { icon: 'wallet', short: 'To choose the savings paid in', title: 'To choose the share of savings paid into the fund', chip: () => pct(S.capture, 0),
        body: () => `<div>${slider('capture', 'Savings paid into the fund')}</div>${outCard('Savings paid in · yearly estimate', 'paidSavings', '@savingsSub')}`,
        stack: () => [
          { icon: 'db', title: 'Savings estimate', src: 'rq3_financing', body: () => kv([
            ['Modelled yearly savings', rmMn(SAVINGS_ANNUAL, 2)], ['Income swings (CV)', fx(FIN('Subsidy savings')['Revenue CV (↓=stable)'], 3)], ['Cost to growers', rmT(FIN('Subsidy savings')['Grower burden (RM/t)'], 2)]])
            + `<p class="note">${esc(FIN('Subsidy savings')['H3 assessment'])}.</p>` },
        ] },
      { icon: 'bank', short: 'To add starting money', title: 'To add one-off starting money', chip: () => rmMn(S.governmentSeed),
        body: () => `<div>${slider('governmentSeed', 'Government starting money (paid once)')}</div>${outCard('Illustrative sum · periods differ', 'combined', '@combinedSub')}`,
        stack: () => [
          { icon: 'code', title: 'Formula', src: 'funding-arithmetic', body: () => code(`levy     = BSL rate × production        (${PROD_PERIOD} base)\nsavings  = share × modelled savings      (yearly estimate)\nsum      = levy + savings + starting money (one-off)\n         → illustrative arithmetic; the periods differ`)
            + `<div class="build"><div><span>BSL rate</span><b data-out="eqRate"></b></div><div><span>Production</span><b data-out="eqProd"></b></div><div><span>Savings share</span><b data-out="eqShare"></b></div><div class="is-total"><span>Illustrative sum</span><b data-out="combined"></b></div></div>` },
        ] },
      { icon: 'bars', short: 'To compare funding options', title: 'To compare funding options', chip: c => rmMn(c.f.fundingEstimate, 1), single: true,
        body: () => `<div class="out"><div class="out-label">Levy + savings · illustrative, the periods differ</div><div class="out-big md" data-out="fundingEstimate"></div><div class="out-sub">Plus one-off starting money (not every year): <b data-out="combined"></b></div>
            <div class="stack" role="img" aria-label="Funding mix: levy, savings and one-off starting money"><i style="background:var(--s1);--on:var(--s1-on)" data-grow="stackBsl" data-out="stackBslT"></i><i style="background:var(--s6);--on:var(--s6-on)" data-grow="stackSav" data-out="stackSavT"></i><i style="background:var(--s4);--on:var(--s4-on)" data-grow="stackSeed" data-out="stackSeedT"></i></div>
            <div class="legend legend-values"><span style="--k:var(--s1)" data-out="legBsl"></span><span style="--k:var(--s6)" data-out="legSav"></span><span style="--k:var(--s4)" data-out="legSeed"></span></div></div>
          <div style="margin-top:22px">${financingCompare()}${term('CV', 'Coefficient of variation: how much yearly income swings. Lower is steadier.')}</div>
          <div class="out" data-state="good" style="margin-top:18px"><div class="out-label">Result</div><div class="out-big md" style="font-size:28px">Export-point levy and BSL carry a lower grower burden than a production tax.</div>
            <div class="out-sub">Steadier income is not yet shown: their income swings are similar to a production tax. Subsidy savings has no direct grower burden, but its income depends on the price gap. Starting money is paid once, not every year. WPL is a baseline reference only. The table uses the saved RM 25/t comparison.</div></div>
          <p class="note">This is a funding calculator. It does not rerun the fund survival model in Objective 2 or change the fund balance in Objective 4.</p>`,
        stack: () => [
          { icon: 'table', title: 'Full comparison', src: 'rq3_financing', body: () => tbl([
            { h: 'Instrument', v: r => `<b>${r.Instrument}</b><small>${r['Collection point']}</small>` }, { h: 'Rate', v: r => r['Rate (RM/t)'] == null ? '—' : rmT(r['Rate (RM/t)']), n: 1 },
            { h: 'Revenue', v: r => r.Instrument === 'Seed capital (one-off)' ? 'Paid once' : r['Annual revenue (RM mn)'] == null ? 'Not estimated' : fx(r['Annual revenue (RM mn)'], 2), n: 1 },
            { h: 'CV', v: r => r.Instrument === 'Seed capital (one-off)' ? 'n/a' : r['Revenue CV (↓=stable)'] == null ? '—' : fx(r['Revenue CV (↓=stable)'], 3), n: 1 },
            { h: 'Burden', v: r => r['Grower burden (RM/t)'] == null ? '—' : fx(r['Grower burden (RM/t)'], 2), n: 1 }, { h: 'Assessment', v: r => `<small>${esc(r['H3 assessment'])}</small>` }], Q.rq3_financing.rows, { caption: 'Financing instruments' })
            + `<p class="note">Revenue RM mn, burden RM/t. Missing WPL values stay “not estimated”, never RM 0.</p>` },
          { icon: 'scale', title: 'WPL · baseline reference', src: 'rq3_wpl', body: () => `${slider('wplCpo', 'CPO price')}${slider('wplRate', 'WPL rate')}
            <div class="wpl"><div><span>Peninsular · above ${rm(WPL.WPL_THRESHOLD_PEN_RM_T)}</span><b data-out="wPenSel"></b><small>excess <em data-out="wPenEx"></em> · at baseline <em data-out="wPenBase"></em></small></div>
              <div><span>Sabah & Sarawak · above ${rm(WPL.WPL_THRESHOLD_EAST_RM_T)}</span><b data-out="wEastSel"></b><small>excess <em data-out="wEastEx"></em> · at baseline <em data-out="wEastBase"></em></small></div></div>
            ${alertBox('Not added to the fund.', `Per tonne of FFB-equivalent. No eligible volume, so no total. BSF allocation: ${rmMn(WPL.WPL_BSF_ALLOCATION ?? 0)}.`)}` },
          ...evidenceCards('obj3'),
        ] },
    ],
  },
  {
    id: 'obj4', label: 'OBJ4', sub: 'Mandate rule', kicker: 'Objective 4',
    title: 'To develop a dynamic rule for moving between B20 and B30.',
    steps: [
      { icon: 'scale', short: 'To check the price gap', title: 'To check the price gap', chip: c => c.p.pricePass ? 'Pass' : 'Fail',
        body: () => `<div>${slider('mops', 'Diesel price (MOPS)')}<div data-show="pmeLatest">${slider('pme', 'Biodiesel cost (PME)')}</div>
          <p class="note" data-show="pmeFormula">Biodiesel cost comes from the ingredient formula in Objective 1.</p></div>
          <div>${outCard('Viability gap', 'gap', 'Must be above RM 0/t for B30', 'gapState')}<span class="badge" data-state-of="priceState" data-out="priceWord"></span></div>`,
        stack: () => [
          { icon: 'grid', title: 'Price limits', src: 'model_assumptions', body: () => kv([['B30 price check', `VG > ${rmT(A.b30GapThreshold)}`], ['B15 floor', `VG < ${rmT(A.b15GapFloor)}`], ['Source of VG', 'OBJ1']]) },
        ] },
      { icon: 'shield', short: 'To check the fund balance', title: 'To check the fund balance', chip: c => c.p.fundSafe ? 'Pass' : 'Fail',
        body: () => `<div>${slider('fund', 'Fund balance (BSF)')}<p class="note">Enter the current balance. It is not calculated from Objective 3.</p></div>
          <div class="out" data-state-of="fundState"><div class="out-label">Fund balance</div><div class="out-big" data-out="fundT"></div><div class="out-sub">${fundLimit}</div>${fundBar('fundBar', 'fundState')}<span class="badge" data-state-of="fundState" data-out="fundWord"></span></div>`,
        stack: () => [
          { icon: 'code', title: 'Fund limit', src: 'model_assumptions', body: () => code(`limit = ${num(A.fundSafetyMultiple)} × ${fx(A.rolling12AvgB20DrawdownRmMn, 4)}\n      = ${fx(FUND_LIMIT, 4)}  (RM mn)\nsafe  if  fund > limit   (strictly greater)`)
            + `<p class="note">${fx(A.rolling12AvgB20DrawdownRmMn, 4)} is the saved rolling 12-month average B20 drawdown. Fixed until a reviewed refresh.</p>` },
        ] },
      { icon: 'stamp', short: 'To confirm B30 approval', title: 'To confirm government approval for B30', chip: () => S.b30Auth ? 'On' : 'Off', single: true,
        body: () => `<div class="switch-row"><div><strong id="sw-obj4">Assume B30 is approved</strong><span>A government decision. This switch only tests the rule.</span></div><button type="button" class="switch" role="switch" data-switch="b30Auth" aria-labelledby="sw-obj4"></button></div>`,
        stack: () => [
          { icon: 'flag', title: 'Possible outcomes', src: 'policyState', body: () => `<div class="outcomes"><div class="B30"><b>B30</b><span>All three checks pass</span></div><div class="B20"><b>B20</b><span>Default</span></div><div class="B15"><b>B15*</b><span>Gap below ${rmT(A.b15GapFloor)} and fund not safe</span></div></div>
            <p class="note">* Proposed safeguard only. B35 is not modelled.</p>` },
        ] },
      { icon: 'flag', short: 'To apply the rule', title: 'To apply the B20 / B30 rule', chip: c => mandateLabel(c.p.mandate),
        body: () => `<div class="lights" style="grid-template-columns:1fr">${light('1 · Price gap', 'priceState', 'priceWord', '@gapShort')}${light('2 · Fund balance', 'fundState', 'fundWord', `Above ${rmMn(FUND_LIMIT)}`)}${light('3 · B30 approval', 'approvalState', 'approvalWord', 'Government decision')}</div>
          <div>${verdict('mandate', 'mandateState', 'mandateTag', 'reason')}${basisLine('basis')}</div>`,
        stack: () => [
          { icon: 'code', title: 'Rule logic', src: 'policyState', body: () => code(`if VG > ${num(A.b30GapThreshold)} and fund > ${fx(FUND_LIMIT, 2)} and approved:\n    B30\nelif VG < ${num(A.b15GapFloor)} and not fund > ${fx(FUND_LIMIT, 2)}:\n    B15   # proposed safeguard only\nelse:\n    B20`) },
          { icon: 'grid', title: 'Price map', src: 'rq4_map', body: () => policyMap() + `<p class="note">Price check only. Each cell lists the PME and MOPS behind it.</p>` },
        ] },
      { icon: 'globe', short: 'To stress-test five years', title: 'To stress-test five years', chip: c => c.m ? rmMn(c.m.mean) : noRun,
        body: () => `<div>
            <div class="control-top"><span class="label">Energy prices</span></div>
            <div class="seg" role="group" aria-label="Energy prices" style="margin-top:8px">${['Low', 'Baseline', 'High'].map(v => `<button type="button" data-set="energy" data-val="${v}">${v}</button>`).join('')}</div>
            <div class="control-top" style="margin-top:18px"><span class="label">Geopolitical run</span></div>
            <div class="choice-grid three-runs" role="group" aria-label="Geopolitical run" style="margin-top:8px">${GEO_RUNS.map(g => `<button type="button" class="choice" data-set="geo" data-val="${g.anchor}"><strong>${g.label}</strong><span>${g.note}</span></button>`).join('')}</div>
            <p class="note">Three saved runs; no interpolation between them.</p>
            <div class="control-top" style="margin-top:18px"><span class="label">Highest blend allowed</span></div>
            <div class="seg" role="group" aria-label="Highest blend allowed" style="margin-top:8px">${['B20', 'B30'].map(v => `<button type="button" data-set="ceiling" data-val="${v}">${v}</button>`).join('')}</div>
          </div>
          <div><div class="cards4 two">
            <div class="kcard" style="--k:var(--s2)"><span>Mean cost · 5 years</span><strong data-out="mMean"></strong></div>
            <div class="kcard" style="--k:var(--bad)"><span>P95 cost · 5 years</span><strong data-out="mP95"></strong></div>
            <div class="kcard" style="--k:var(--s3)"><span>Median final fund</span><strong data-out="mEnd"></strong></div>
            <div class="kcard" style="--k:var(--s6)"><span>CPO absorbed</span><strong data-out="mCpo"></strong></div></div>
            ${kv([['Switches per year', '<span data-out="mSwitch"></span>'], ['Brent mean', '<span data-out="mBrent"></span>'], ['Cost σ', '<span data-out="mSigma"></span>']])}
            <p class="note">Saved run: <b data-out="mRun"></b>.</p></div>`,
        stack: () => [
          { icon: 'scale', title: 'B20 vs B30 ceiling', src: 'rq4_matrix', body: () => tbl([
            { h: 'Metric', v: r => r[0] }, { h: 'B20', v: r => `<span data-out="cmp20_${r[1]}"></span>`, n: 1 }, { h: 'B30', v: r => `<span data-out="cmp30_${r[1]}"></span>`, n: 1 }],
            [['Mean cost', 'mean'], ['P95 cost', 'p95'], ['Switches / year', 'switches'], ['CPO absorbed', 'cpo'], ['Median final fund', 'end']], { caption: 'B20 and B30 ceiling compared' })
            + `<p class="note" data-show="p95Same"><b>P95 matches.</b> B30 runs only when the gap is positive, when no support is paid.</p>` },
          { icon: 'table', title: 'All 18 runs', src: 'rq4_matrix', body: () => tbl([
            { h: 'Energy', v: r => r.energy }, { h: 'Geopolitics', v: r => r.geo }, { h: 'Max', v: r => r.ceiling }, { h: 'Brent', v: r => fx(r.brent, 0), n: 1 },
            { h: 'Mean', v: r => fx(r.mean, 0), n: 1 }, { h: 'P95', v: r => fx(r.p95, 0), n: 1 }, { h: 'σ', v: r => fx(r.sigma, 0), n: 1 },
            { h: 'Sw/yr', v: r => fx(r.switches, 2), n: 1 }, { h: 'CPO', v: r => fx(r.cpo, 2), n: 1 }, { h: 'End fund', v: r => fx(r.end, 0), n: 1 }], MATRIX, { hl: (r, i) => `hlmx_${i}`, cls: 'dense', caption: 'Five-year stress matrix' })
            + `<p class="note">RM mn over 5 years · CPO mn t.</p>` },
          { icon: 'globe', title: 'Geopolitical runs', src: 'rq4_matrix', body: () => kv(GEO_RUNS.map(g => [g.label, `${g.note} · saved as “${g.anchor}”`]))
            + `<p class="note">The three runs need not rank the same way on every metric. They are not a probability scale.</p>` },
        ] },
      { icon: 'bars', short: 'To compare with fixed blends', title: 'To compare cost swings with fixed blends', chip: () => `−${pct(RQ4.reduction_vs_b30, 1)} vs B30`,
        body: () => { const max = Math.max(num(RQ4.vol_b20), num(RQ4.vol_b30), num(RQ4.vol_dual));
          const bar = (label, v, k) => `<div class="vbar"><strong>${rmMn(v, 1)}</strong><div class="plot"><i style="height:${v / max * 100}%;--k:${k}"></i></div><span>${label}</span></div>`;
          return `<div><div class="out-label">Monthly cost swings (lower is better)</div><div class="vbars">${bar('Fixed B20', num(RQ4.vol_b20), 'var(--b20)')}${bar('Fixed B30', num(RQ4.vol_b30), 'var(--b30)')}${bar('The rule', num(RQ4.vol_dual), 'var(--s5)')}</div></div>
          <div><div class="lights" style="grid-template-columns:1fr">
            <div class="light" data-state="${num(RQ4.reduction_vs_b30) >= 0.25 ? 'good' : 'bad'}"><span>vs fixed B30</span><strong>${pct(RQ4.reduction_vs_b30, 1)} smaller</strong><small>${num(RQ4.reduction_vs_b30) >= 0.25 ? 'Meets' : 'Below'} the 25% target</small></div>
            <div class="light" data-state="${REDUCTION_VS_B20 >= 0.25 ? 'good' : 'bad'}"><span>vs fixed B20</span><strong>${pct(REDUCTION_VS_B20, 1)} smaller</strong><small>${REDUCTION_VS_B20 >= 0.25 ? 'Meets' : 'Below'} the 25% target</small></div></div>
            <p class="note">The rule chose B30 in ${pct(RQ4.b30_months_share, 1)} of past months and switched ${num(RQ4.switches_per_year).toFixed(2)} times a year (${MONTHLY[0].period} to ${MONTHLY.at(-1).period}).</p>
            <p class="limit"><b>Read with care.</b> These are monthly swings from the back-test. Fixed-blend costs are scaled from the rule’s cost series, not simulated separately.</p></div>`; },
        stack: () => [
          { icon: 'bars', title: 'Average monthly cost', src: 'rq4_summary', body: () => hbars([
            { label: 'Fixed B20', v: num(RQ4.mean_b20), text: rmMn(RQ4.mean_b20, 1), color: 'var(--b20)' },
            { label: 'Fixed B30', v: num(RQ4.mean_b30), text: rmMn(RQ4.mean_b30, 1), color: 'var(--b30)' },
            { label: 'The rule', v: num(RQ4.mean_dual), text: rmMn(RQ4.mean_dual, 1), color: 'var(--s5)' }], Math.max(num(RQ4.mean_b30), num(RQ4.mean_b20)) * 1.1) },
          { icon: 'grid', title: 'Back-test', src: 'rq4_summary', body: () => kv([
            ['Volatility cut vs B30', pct(RQ4.reduction_vs_b30)], ['B30 share of months', pct(RQ4.b30_months_share)], ['Switches per year', fx(RQ4.switches_per_year, 2)],
            ['Cumulative saving vs B30', rmMn(RQ4.cum_saving_vs_b30_rm_mn, 0)], ['Volatility · B20 / B30 / rule', `${fx(RQ4.vol_b20, 1)} / ${fx(RQ4.vol_b30, 1)} / ${fx(RQ4.vol_dual, 1)}`]])
            + `<p class="note">Modelled cost difference, not cash received.</p>` },
          { icon: 'alert', title: 'Limitations', src: 'V3 note', body: () => alertBox('Fixed-blend costs are scaled from the rule’s series.', 'They are not separately simulated fund paths. The proposal asks for yearly volatility; this uses monthly.') },
          ...evidenceCards('obj4'),
        ] },
      { icon: 'bolt', short: 'To see what B30 would change', title: 'To see what moving to B30 would change', chip: () => '4 effects', single: true,
        body: () => { const row = p => Q.b30_impact.rows.find(r => String(r.dimension).startsWith(p));
          const fiscal = row('Fiscal'), industry = row('Industry'), green = row('Green'), ops = row('Operations');
          return `<div class="cards4">
            <div class="kcard" style="--k:var(--s2)"><span>Extra government support</span><strong>${rmMn(fiscal?.value)}</strong><small>per year, at the recent average gap</small></div>
            <div class="kcard" style="--k:var(--s4)"><span>Extra CPO used at home</span><strong>${num(industry?.value).toFixed(2)} mn t</strong><small>per year</small></div>
            <div class="kcard" style="--k:var(--s6)"><span>Fossil diesel replaced</span><strong>${num(green?.value).toFixed(2)} bn L</strong><small>per year</small></div>
            <div class="kcard" style="--k:var(--s1)"><span>PME needed vs recent output</span><strong>${num(ops?.value).toFixed(2)}×</strong><small>above 1× means supply is short</small></div></div>`; },
        stack: () => [
          { icon: 'table', title: 'Impact table', src: 'b30_impact', body: () => tbl([
            { h: 'Dimension', v: r => `<b>${esc(String(r.dimension).split(':')[0])}</b><small>${esc(String(r.dimension).split(':').slice(1).join(':').trim())}</small>` },
            { h: 'Value', v: r => fx(r.value, 3), n: 1 }, { h: 'Unit', v: r => r.unit }, { h: 'How to read', v: r => `<small>${esc(r.interpretation)}</small>` }], Q.b30_impact.rows, { caption: 'B30 impact' })
            + `<p class="note">CO₂ avoided is not estimated without an approved lifecycle factor.</p>` },
        ] },
    ],
  },
  {
    id: 'decision', label: 'Decision now', sub: '', kicker: 'Decision now',
    title: 'To decide the biodiesel blend for the chosen prices and fund.',
    steps: [
      { icon: 'scale', short: 'To check prices', title: 'To check the prices', chip: c => signedRmT(c.dp.gap),
        body: () => `<div>${slider('dec.mops', 'Diesel price (MOPS)')}${slider('dec.pme', 'Biodiesel cost (PME)')}<p class="note">Values come from Objective 1 until you change them here.</p></div>
          <div>${outCard('Viability gap', 'dGap', 'Must be above RM 0/t for B30', 'dGapState')}<span class="badge" data-state-of="dPriceState" data-out="dPriceWord"></span></div>`,
        stack: () => [
          { icon: 'link', title: 'Where the values come from', src: 'Shared state', body: () => kv([['Diesel price', '<span data-out="dMopsSrc"></span>'], ['Biodiesel cost', '<span data-out="dPmeSrc"></span>'], ['Snapshot month', SNAP_MONTH]])
            + `<p class="note">Changes here stay on this page. “Use OBJ1 value” returns a field to the objective setting.</p>` },
        ] },
      { icon: 'shield', short: 'To check the fund', title: 'To check the fund balance', chip: c => c.dp.fundSafe ? 'Pass' : 'Fail',
        body: () => `<div>${slider('dec.fund', 'Fund balance (BSF)')}</div>
          <div class="out" data-state-of="dFundState"><div class="out-label">Fund balance</div><div class="out-big" data-out="dFund"></div><div class="out-sub">${fundLimit}</div>${fundBar('dFundBar', 'dFundState')}<span class="badge" data-state-of="dFundState" data-out="dFundWord"></span></div>`,
        stack: () => [
          { icon: 'coins', title: 'Money coming in', src: 'funding-arithmetic', body: () => `${slider('dec.bslRate', 'BSL rate')}${slider('dec.capture', 'Savings paid into the fund')}
            <div class="build"><div><span>BSL revenue · ${PROD_PERIOD} base</span><b data-out="dBsl"></b></div><div><span>Savings paid in · yearly</span><b data-out="dSav"></b></div><div class="is-total"><span>Levy + savings · illustrative</span><b data-out="dFunding"></b></div></div>
            <p class="note">The periods differ. Does not change the blend.</p>` },
          { icon: 'link', title: 'Imported from OBJ3 and OBJ4', src: 'Shared state', body: () => kv([['Fund balance', '<span data-out="dFundSrc"></span>'], ['BSL rate', '<span data-out="dBslSrc"></span>'], ['Savings share', '<span data-out="dCapSrc"></span>'],
            ['Production', '<span data-out="dProd"></span>'], ['Starting money', '<span data-out="dSeed"></span>']]) },
        ] },
      { icon: 'stamp', short: 'To confirm B30 approval', title: 'To confirm government approval for B30', chip: c => c.dc.b30Auth ? 'On' : 'Off', single: true,
        body: () => `<div class="switch-row"><div><strong id="sw-dec">Assume B30 is approved</strong><span>A government decision. This switch only tests the rule.</span></div><button type="button" class="switch" role="switch" data-switch="dec.b30Auth" aria-labelledby="sw-dec"></button></div>
          <p class="note"><button type="button" class="reset" data-reset="dec.b30Auth">${resetLabel('dec.b30Auth')}</button></p>`,
        stack: () => [
          { icon: 'alert', title: 'Decision boundary', src: 'Policy constraint', body: () => alertBox('B15 is a proposed safeguard only.', 'It needs ministerial consideration.') + alertBox('WPL is a baseline reference only.', 'It is never the recommended funding source.') },
        ] },
      { icon: 'flag', short: 'To decide the blend', title: 'To decide the blend', chip: c => mandateLabel(c.dp.mandate), single: true,
        body: () => `<div class="stage-body" style="margin-top:0">
            <div class="lights" style="grid-template-columns:1fr">${light('1 · Price gap', 'dPriceState', 'dPriceWord', '@dGapShort')}${light('2 · Fund balance', 'dFundState', 'dFundWord', '@dFundShort')}${light('3 · B30 approval', 'dApprovalState', 'dApprovalWord', 'Government decision')}</div>
            <div>${verdict('dMandate', 'dMandateState', 'dMandateTag', 'dReason')}${basisLine('dBasis')}</div></div>
          <div class="summary4">
            <button type="button" class="sum" data-tab="obj1" style="--k:var(--s1-ink)"><span>OBJ1 · Price</span><strong data-out="dGapShort"></strong><small>Viability gap</small></button>
            <button type="button" class="sum" data-tab="obj2" style="--k:var(--s2-ink)"><span>OBJ2 · Shock test</span><strong>${fiveYearPasses} of ${Q.rq2_scenarios_60m.rows.length} cases</strong><small>last 5 years · baseline saved cases at 100% savings share</small></button>
            <button type="button" class="sum" data-tab="obj3" style="--k:var(--s3-ink)"><span>OBJ3 · Money sources</span><strong data-out="dFunding"></strong><small>Levy + savings · illustrative</small></button>
            <button type="button" class="sum" data-tab="obj4" style="--k:var(--s4-ink)"><span>OBJ4 · Rule</span><strong data-out="dChecks"></strong><small>B30 needs all three</small></button></div>
          <div class="reset-row">
            <span data-show="dChanged"><button type="button" class="btn-link" data-use-objectives>Use the objective settings</button><small>Clears the values set on this page.</small></span>
            <span data-show="anyChanged"><button type="button" class="btn-link" data-restore>Restore the reviewed snapshot</button><small>Resets every value on every tab.</small></span>
            <span><button type="button" class="btn-link" data-print>${ICON.print}<span>Print decision summary</span></button></span>
            <span><button type="button" class="btn-link" data-prov-open>${ICON.info}<span>Sources and provenance</span></button></span></div>`,
        stack: () => [
          { icon: 'list', title: 'Four objectives', src: 'Saved results', body: () => `<div class="objs">${['obj1', 'obj2', 'obj3', 'obj4'].map((id, k) => `<button type="button" class="obj" data-tab="${id}" style="--k:var(--s${k + 1}-ink)"><span>OBJ${k + 1}</span><b>${FINDINGS[id].head}</b><small>${FINDINGS[id].status}</small></button>`).join('')}</div>` },
          { icon: 'quote', title: 'Report line', src: 'This page', body: () => `<p class="report" data-out="dReport"></p><p class="note">A result under these assumptions. Not a forecast, budget or B30 approval.</p>` },
          { icon: 'db', title: 'Snapshot and release', src: 'model_registry', body: () => releaseKv() + `<p class="note"><button type="button" class="btn-link" data-prov-open>Open the source inspector</button></p>` },
        ] },
    ],
  },
];
// Home: the journey only (shared home.js); its title is kept for screen readers. The objectives live in the tab bar.
function homeConfig() {
  return { title: TABS[0].title };
}
const tabById = id => TABS.find(t => t.id === id) ?? TABS[0];
const tabIndex = id => TABS.findIndex(t => t.id === id);

/* ── Rendering ───────────────────────────────────────── */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

function renderTabs() {
  $('#tabs').innerHTML = `<div class="tabs-track" role="tablist" aria-label="Objectives"><span class="tab-pill" id="tab-pill" aria-hidden="true"></span>${TABS.map(t =>
    `<button type="button" role="tab" id="tab-${t.id}" aria-controls="page" class="tab ${t.id === 'decision' ? 'is-decision' : ''}" data-tab="${t.id}" aria-selected="${t.id === S.tab}" tabindex="${t.id === S.tab ? 0 : -1}">${t.label}${t.sub ? `<small>${t.sub}</small>` : ''}</button>`).join('')}</div>`;
  fitRo?.disconnect(); [$('.topbar-inner'), ...$$('.topbar-inner > *'), ...$$('.tab')].forEach(n => fitRo?.observe(n));
  fitTabs();
  requestAnimationFrame(() => movePill(false));
}
// Every tab must show whole. When they do not fit beside the brand and status (a narrower window, a wider look, the
// "Your scenario" badge), they take their own row under the brand instead of hiding off the end of the strip.
function fitTabs() {
  const bar = $('.topbar'), track = $('.tabs-track');
  if (!bar || !track) return;
  bar.classList.remove('is-stacked');
  bar.classList.toggle('is-stacked', track.scrollWidth > track.clientWidth + 1);
  movePill(false);
}
let fitRaf = 0;
const fitRo = 'ResizeObserver' in window ? new ResizeObserver(() => { cancelAnimationFrame(fitRaf); fitRaf = requestAnimationFrame(fitTabs); }) : null;
// The selection pill is two springs, one per edge. The leading edge is quicker than the trailing one,
// so the pill stretches toward the new tab and settles (motion hints where it is going).
const pill = { l: null, r: null };
function movePill(animate = true) {
  const active = $(`.tab[data-tab="${S.tab}"]`); const el = $('#tab-pill');
  if (!active || !el) return;
  $$('.tab').forEach(t => { const on = t.dataset.tab === S.tab; t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1; });
  $('#page').setAttribute('aria-labelledby', `tab-${S.tab}`);
  el.classList.toggle('is-decision', S.tab === 'decision');
  const L = active.offsetLeft, R = L + active.offsetWidth;
  const write = () => { el.style.left = `${pill.l.x}px`; el.style.width = `${Math.max(0, pill.r.x - pill.l.x)}px`; };
  if (!pill.l) { pill.l = new MOTION.Spring(L, write); pill.r = new MOTION.Spring(R, write); }
  if (!animate || reduced()) { pill.l.set(L); pill.r.set(R); return; }
  const right = L > pill.l.x;
  pill.l.to(L, { response: right ? 0.42 : 0.28, damping: 0.86, precision: 0.2 });
  pill.r.to(R, { response: right ? 0.28 : 0.42, damping: 0.86, precision: 0.2 });
  const track = $('.tabs-track');
  if (track && track.scrollWidth > track.clientWidth) track.scrollTo({ left: L - track.clientWidth / 2 + active.offsetWidth / 2, behavior: 'smooth' });
}

// Tab change: the old page folds away toward the side it leaves by, the new one unfolds from the other side
// (a foldable phone's hinge). Both are springs, so a second tap mid-fold retargets from where things are.
function pageHtml(tab) {
  if (tab.home) return HOME.html(homeConfig());
  const n = tab.steps.length;
  return `<section class="hero"><div class="hero-kicker">${tab.kicker}</div><h1>${tab.title}</h1><div class="hero-meta">${n} steps. ${tab.id === 'decision' ? 'Changes here stay on this page.' : 'Open Detail under each step for the evidence, or swipe the card.'}</div></section>
    <div class="flow-wrap"><nav class="flow" data-n="${n}" aria-label="Steps">${tab.steps.map((s, i) => `<button type="button" class="node c${i + 1}" data-go="${i}" style="--i:${i}">
      <span class="ring"><span class="disc">${ICON[s.icon]}<span class="n">${String(i + 1).padStart(2, '0')}</span></span><span class="check">${ICON.check}</span></span>
      <span class="node-label">Step ${i + 1}</span><span class="node-title">${s.short}</span><span class="node-value" data-chip="${i}"></span></button>`).join('')}</nav></div>
    <div class="hive-say" data-hive-anchor aria-hidden="true"></div>
    <div class="stage-shell" id="stage-shell"></div>`;
}
function renderPage(dir = 0) {
  const tab = tabById(S.tab);
  const host = $('#page');
  const old = $('.page', host);
  const leaving = typeof MORPH === 'undefined' ? [] : MORPH.capture(old); // the old step cards, before they move
  const el = document.createElement('div');
  el.className = 'page';
  el.innerHTML = pageHtml(tab);
  if (old) {
    if (dir && !reduced()) {
      const f = MOTION.fluid(old);
      old.style.transform = ''; const rect = old.getBoundingClientRect(); f.write();
      Object.assign(old.style, { position: 'absolute', top: `${rect.top}px`, left: `${rect.left}px`, width: `${rect.width}px`, margin: '0', transformOrigin: dir > 0 ? '0% 30%' : '100% 30%' });
      // A page much taller than the screen (Home's long story) folds only the part on screen, around its middle.
      const vh = innerHeight;
      if (rect.height > vh * 2) Object.assign(old.style, { clipPath: `inset(${Math.max(0, -rect.top)}px 0 ${Math.max(0, rect.bottom - vh)}px 0)`, transformOrigin: `${dir > 0 ? '0%' : '100%'} ${Math.max(0, -rect.top) + vh * 0.3}px` });
      old.classList.add('is-leaving'); old.inert = true; old.setAttribute('aria-hidden', 'true');
      $('#fold-layer').appendChild(old);
      f.to({ x: -dir * rect.width * 0.3, ry: dir * 16, s: 0.9, o: 0 }, { response: 0.4, damping: 1 }).then(() => { old.remove(); sweepAnims(); });
    } else if (dir && reduced()) {
      old.remove();
      el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 180, easing: 'ease' });
    } else old.remove();
  }
  host.appendChild(el);
  if (dir && !reduced()) {
    el.style.transformOrigin = dir > 0 ? '100% 30%' : '0% 30%';
    // No blur on the fold: re-blurring a whole page every frame was the costliest part of a tab change on laptop graphics.
    const f = MOTION.fluid(el).set({ x: dir * Math.min(260, el.offsetWidth * 0.24), ry: -dir * 14, s: 0.94, o: 0 });
    f.to({ x: 0, ry: 0, s: 1, o: 1 }, { response: 0.5, damping: 1, ry: { response: 0.56 } }).then(done => { if (done) { f.clear(); el.style.transformOrigin = ''; } });
    const glow = MOTION.fluid($('#aurora'));
    glow.to({ x: -dir * 60 }, { response: 0.5 }).then(() => glow.to({ x: 0 }, { response: 1.4 }));
  }
  if (dir) window.scrollTo({ top: 0, behavior: 'auto' });
  if (dir) SOUND.page(dir, TABS.indexOf(tab)); // a marimba note pitched by the tab's place (only once sound is on)
  HOME.start(el); // the swarm carries on as this page's background
  ART.mount(tab.home ? null : $('.flow-wrap', el), tab.id); // each step box shows a moving picture of its step
  if (tab.home) writeHash(); else renderStage(0);
  sweepAnims();
  if (typeof MORPH !== 'undefined') MORPH.play(tab.home ? null : el, leaving, tab.id, { quiet: !dir }); // first click into a page: old cards turn to dust, new cards spin, fly and drop into place; later visits, and opening without a click: a slight pop
}

const QIDS = new Set(Object.keys(Q));
const provLine = src => { const ids = String(src ?? '').split(/\s*·\s*|\s+/).filter(t => QIDS.has(t)); return ids.length ? `<p class="prov-line">Source: ${ids.map(id => `<button type="button" class="src-link" data-prov="${id}">${id}</button>`).join(' ')}</p>` : ''; };
function stackHtml(key, cards) {
  const sid = `st-${key.replace(':', '-')}`;
  return `<section class="dstack" data-stack="${key}" aria-label="Detail">
    <button type="button" class="dstack-bar" data-stack-toggle aria-expanded="false" aria-controls="${sid}">
      <span class="dstack-ico" data-lottie-stack aria-hidden="true"></span><span class="dstack-title">Detail</span><span class="dstack-count">${cards.length}</span>
      <span class="dstack-hint"><span class="when-closed">Open</span><span class="when-open">Show less</span>${ICON.chevD}</span>
    </button>
    <div class="dstack-cards" id="${sid}">${cards.map((card, k) => { const open = Boolean(S.cards[`${key}:${k}`]); const bid = `${sid}-c${k}`;
      return `<article class="dcard ${open ? 'is-open' : ''}" data-card="${k}">
      <button type="button" class="dcard-head" data-card-toggle aria-expanded="false" aria-controls="${bid}"><span class="dcard-ico">${ICON[card.icon] ?? ICON.list}</span>
        <span class="dcard-t"><b>${card.title}</b><code>${esc(card.src ?? '')}</code></span><span class="dcard-chev">${ICON.chevD}</span></button>
      <div class="dcard-body" id="${bid}" inert><div class="dcard-inner">${provLine(card.src)}${card.body()}</div></div></article>`; }).join('')}</div>
  </section>`;
}

// Step jump: the numbered buttons between Back and Next go straight to any step of this objective.
function jumpHtml(tab, i) {
  return `<nav class="step-jump" aria-label="Go to step">${tab.steps.map((s, k) => `<button type="button" class="jump c${k + 1}${k === i ? ' is-current' : k < i ? ' is-done' : ''}" data-go="${k}" title="Step ${k + 1}: ${s.short}" aria-label="Step ${k + 1}: ${s.short}"${k === i ? ' aria-current="step"' : ''}>${k + 1}</button>`).join('')}</nav>`;
}
function stageHtml(tab, i) {
  const step = tab.steps[i];
  const last = i === tab.steps.length - 1;
  const nextTab = TABS[TABS.indexOf(tab) + 1];
  const nextLabel = !last ? `<span>Next</span><small>${tab.steps[i + 1].short}</small>` : nextTab ? `<span>Next</span><small>${nextTab.kicker}</small>` : '<span>Start again</span>';
  return `<div class="stage-head"><span class="step-pill">Step ${i + 1} of ${tab.steps.length}</span><h2 tabindex="-1">${step.title}</h2></div>
    <div class="stage-body ${step.single ? 'single' : ''}">${step.body()}</div>
    ${step.stack ? stackHtml(`${tab.id}:${i}`, step.stack()) : ''}
    <div class="stage-foot"><button type="button" class="btn btn-ghost" data-back ${i === 0 ? 'disabled' : ''}>${ICON.chevL}<span>Back</span></button>${jumpHtml(tab, i)}<button type="button" class="btn btn-primary" data-next>${nextLabel}${ICON.chev}</button></div>`;
}
// Step change: the card slides along the direction of travel. After a swipe the outgoing card keeps the
// finger's velocity and the incoming one arrives beside it, like a carousel; after a tap both move a short way.
function renderStage(dir = 0, handoff = null) {
  const tab = tabById(S.tab);
  const i = S.step[tab.id];
  const shell = $('#stage-shell');
  const old = $('.stage:not(.is-leaving)', shell);
  const hadFocus = Boolean(old?.contains(document.activeElement));
  const h0 = shell.offsetHeight;
  const el = document.createElement('section');
  el.className = `stage c${i + 1}`;
  el.setAttribute('aria-label', `Step ${i + 1} of ${tab.steps.length}`);
  el.innerHTML = stageHtml(tab, i);
  $('#page').style.setProperty('--accent', `var(--s${i + 1})`);
  HOME.say(tab.steps[i].short); // the swarm writes this step in the band under the objective
  const width = old?.offsetWidth || shell.offsetWidth;
  const motion = dir && !reduced();
  if (old) {
    if (motion) {
      old.classList.add('is-leaving'); old.inert = true; old.setAttribute('aria-hidden', 'true');
      Object.assign(old.style, { position: 'absolute', top: '0', left: '0', width: `${width}px`, pointerEvents: 'none' });
      const target = handoff ? { x: -dir * width * 1.04, o: 0.35, s: 0.96 } : { x: -dir * 72, o: 0, s: 0.97 };
      MOTION.fluid(old).to(target, { response: handoff ? 0.36 : 0.3, damping: 1, velocity: handoff ? { x: handoff.velocity } : undefined, o: { response: 0.22 } })
        .then(() => { old.remove(); sweepAnims(); });
    } else if (dir) {
      old.remove();
      el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 160, easing: 'ease' });
    } else old.remove();
  }
  shell.appendChild(el);
  refresh(true);
  playFlows(el);
  $$('.dstack', el).forEach(st => { layoutStack(st, Boolean(S.open[st.dataset.stack]), false); initStackIcon(st); });
  if (motion) {
    const f = MOTION.fluid(el).set(handoff ? { x: dir * width + handoff.offset, o: 1, s: 0.985 } : { x: dir * 96, o: 0, s: 0.985 });
    f.to({ x: 0, o: 1, s: 1 }, { response: handoff ? 0.38 : 0.36, damping: 1, velocity: handoff ? { x: handoff.velocity } : undefined, o: { response: 0.24 } })
      .then(done => { if (done) f.clear(); });
    $$('.stage-body > *, .dstack', el).slice(0, 4).forEach((child, k) => {
      const cf = MOTION.fluid(child).set({ y: 10, o: 0 });
      setTimeout(() => cf.to({ y: 0, o: 1 }, { response: 0.34, damping: 1 }).then(done => { if (done) cf.clear(); }), 40 + k * 40);
    });
    const h1 = el.offsetHeight;
    if (h0 && Math.abs(h1 - h0) > 2) {
      shell.style.height = `${h0}px`; shell._sp_height = null;
      MOTION.prop(shell, 'height', h1, 'px', { response: 0.36, precision: 0.5 }).then(() => { shell.style.height = ''; shell._sp_height = null; });
    }
  }
  if (hadFocus) $('h2', el).focus({ preventScroll: true });
  const top = el.getBoundingClientRect().top;
  if (dir && top < 64) window.scrollTo({ top: window.scrollY + top - 96, behavior: reduced() ? 'auto' : 'smooth' });
  $$('#page .node').forEach((node, k) => {
    node.classList.toggle('is-active', k === i);
    node.classList.toggle('is-done', k < i);
    node.classList.toggle('is-future', k > i);
    if (k === i) node.setAttribute('aria-current', 'step'); else node.removeAttribute('aria-current');
  });
  const active = $('#page .node.is-active'); const wrap = $('#page .flow-wrap');
  if (active && wrap && wrap.scrollWidth > wrap.clientWidth) wrap.scrollTo({ left: active.offsetLeft - wrap.clientWidth / 2 + active.offsetWidth / 2, behavior: reduced() ? 'auto' : 'smooth' });
  for (const id of Object.keys(CH)) if (!document.querySelector(`[data-chart="${id}"]`)) delete CH[id];
  writeHash();
}

/* ── Detail stack: iOS-style notification stack, on springs ─────────
   Closed: cards sit on top of each other; two slivers peek out below the front card.
   Open: cards fan out into a list (FLIP from where they are on screen, so a second tap mid-motion
   reverses smoothly), and each card then opens on its own. A collapsed card's content is inert. */
function syncCards(st) {
  const stackOpen = st.classList.contains('is-open');
  $$('.dcard', st).forEach(card => {
    const open = stackOpen && card.classList.contains('is-open');
    $('.dcard-body', card).inert = !open;
    $('[data-card-toggle]', card).setAttribute('aria-expanded', String(open));
  });
}
function layoutStack(st, open, animate) {
  const cards = $$('.dcard', st);
  const wrap = $('.dstack-cards', st);
  if (!cards.length) return;
  const first = animate ? cards.map(card => card.getBoundingClientRect()) : null;
  const prev = cards.map(card => ({ o: card._fluid?.st.o ?? 1, vy: card._fluid?.velocity('y') ?? 0 }));
  const h0 = animate ? wrap.getBoundingClientRect().height : 0;
  st.classList.add('is-measuring');
  st.classList.toggle('is-open', open);
  $('[data-stack-toggle]', st).setAttribute('aria-expanded', String(open));
  cards.forEach(card => MOTION.fluid(card).clear());
  wrap._sp_height?.stop(); wrap._sp_height = null; wrap.style.height = '';
  const layout = cards.map(card => card.getBoundingClientRect());
  const top0 = layout[0].top;
  const target = cards.map((card, k) => { if (open) return { x: 0, y: 0, s: 1, o: 1 }; const d = Math.min(k, 2); return { x: 0, y: -(layout[k].top - top0) + d * 11, s: 1 - d * 0.045, o: k > 2 ? 0 : 1 }; });
  const h1 = open ? wrap.getBoundingClientRect().height : Math.max(...cards.slice(0, 3).map((card, k) => k * 11 + layout[k].height * (1 - k * 0.045)));
  cards.forEach((card, k) => { card.style.zIndex = String(cards.length - k); card.toggleAttribute('inert', !open && k > 0); });
  syncCards(st);
  st.classList.remove('is-measuring');
  if (!animate || reduced()) {
    cards.forEach((card, k) => MOTION.fluid(card).set(target[k]));
    if (!open) wrap.style.height = `${h1}px`;
    return;
  }
  cards.forEach((card, k) => {
    const L = layout[k], F = first[k];
    const f = MOTION.fluid(card).set({ x: F.left + F.width / 2 - (L.left + L.width / 2), y: F.top - L.top, s: F.width / L.width, o: prev[k].o });
    // Fanning out is a sheet-like motion with a touch of give; stacking back is critically damped.
    const go = () => f.to(target[k], { response: open ? 0.34 : 0.3, damping: open ? 0.84 : 1, velocity: { y: prev[k].vy } });
    if (open && k) setTimeout(go, k * 14); else go();
  });
  wrap.style.height = `${h0}px`;
  MOTION.prop(wrap, 'height', h1, 'px', { response: open ? 0.34 : 0.3, precision: 0.5 }).then(done => { if (done && st.classList.contains('is-open')) { wrap.style.height = ''; wrap._sp_height = null; } });
}
function toggleStack(st) {
  const open = !st.classList.contains('is-open');
  if (!open && $('.dstack-cards', st).contains(document.activeElement)) $('[data-stack-toggle]', st).focus();
  S.open[st.dataset.stack] = open;
  layoutStack(st, open, true);
  const anim = st._lottie;
  if (anim && !reduced()) { anim.setDirection(open ? 1 : -1); anim.play(); } else anim?.goToAndStop(open ? 29 : 0, true);
  if (open) revealCharts(st);
}
function toggleCard(card) {
  const st = card.closest('.dstack');
  const key = `${st.dataset.stack}:${card.dataset.card}`;
  const open = !card.classList.contains('is-open');
  if (!open && $('.dcard-body', card).contains(document.activeElement)) $('[data-card-toggle]', card).focus();
  S.cards[key] = open;
  card.classList.toggle('is-open', open);
  syncCards(st);
  if (open) { revealCharts(card); requestAnimationFrame(() => card.scrollIntoView({ block: 'nearest', behavior: reduced() ? 'auto' : 'smooth' })); }
}
// Charts are always drawn; revealing one replays its draw-in (lines trace, bars grow from zero).
function revealCharts(root) {
  if (reduced()) return;
  $$('.chart, .hbars', root).forEach(ch => { ch.classList.add('pre'); void ch.offsetWidth; requestAnimationFrame(() => ch.classList.remove('pre')); });
}
function initStackIcon(st) {
  const el = $('[data-lottie-stack]', st);
  if (!el || !window.lottie) return;
  st._lottie = track(window.lottie.loadAnimation({ container: el, renderer: 'svg', loop: false, autoplay: false, animationData: fresh(LOTTIE_ICONS.stack) }));
  st._lottie.goToAndStop(st.classList.contains('is-open') ? 29 : 0, true);
}

// Keyboard navigation is never animated: it is repeated often and must feel instant.
function goStep(i, { handoff = null, instant = false } = {}) {
  const tab = tabById(S.tab);
  const current = S.step[tab.id];
  if (i === current || i < 0 || i >= tab.steps.length) return;
  S.step[tab.id] = i;
  renderStage(instant ? 0 : i > current ? 1 : -1, handoff);
}
function goTab(id, { instant = false, step } = {}) {
  if (step !== undefined) S.step[id] = step;
  if (id === S.tab) { if (step !== undefined) renderStage(0); return; }
  const dir = Math.sign(tabIndex(id) - tabIndex(S.tab));
  S.tab = id;
  movePill(!instant);
  renderPage(instant ? 0 : dir);
}
function writeHash() {
  const hash = S.tab === 'home' ? '#home' : `#${S.tab}-${S.step[S.tab] + 1}`;
  if (location.hash !== hash) try { history.replaceState(null, '', hash); } catch {}
}
function readHash() {
  const m = /^#(home|obj[1-4]|decision)(?:-(\d+))?$/.exec(location.hash);
  if (!m) return null;
  const tab = tabById(m[1]);
  return { tab: tab.id, step: Math.min(tab.steps.length, Math.max(1, Number(m[2] ?? 1))) - 1 };
}

/* ── Refresh: values are written at once; containers follow on springs ── */
const SLOT = '.out-big, .verdict-blend, .light strong, .sum strong, .gauge-top strong, .kcard strong';
function writeText(el, text, n) {
  if (el.textContent === text) return;
  const prev = el._n;
  el.textContent = text; el._n = n;
  // A discrete change (a tap, not a drag) gets a short vertical "slot" swap. Only real values are shown.
  if (S.cause === 'drag' || reduced() || !el.matches(SLOT) || prev === undefined) return;
  const up = n === undefined || prev === undefined ? true : n >= prev;
  el.animate([{ transform: `translateY(${up ? 0.32 : -0.32}em)`, opacity: 0.25, filter: 'blur(2px)' }, { transform: 'none', opacity: 1, filter: 'blur(0)' }],
    { duration: 240, easing: 'cubic-bezier(.23, 1, .32, 1)' });
}
// What the step pictures show: the balance tips by the price gap; the shield, stamp, ladder and drop follow the checks.
const artState = (c, tab) => tab.id === 'decision'
  ? { gap: c.dp.gap, fundSafe: c.dp.fundSafe, auth: c.dc.b30Auth, mandate: c.dp.mandate, capture: S.capture }
  : { gap: c.p.gap, fundSafe: c.p.fundSafe, auth: S.b30Auth, mandate: c.p.mandate, capture: S.capture };
function refresh(initial = false) {
  const c = compute();
  const tab = tabById(S.tab);
  $$('#page [data-chip]').forEach(el => { const v = tab.steps[Number(el.dataset.chip)].chip(c); if (el.textContent !== v) el.textContent = v; });
  const art = artState(c, tab); ART.update(art);
  if (tab.id === 'obj4' || tab.id === 'decision') SOUND.verdict(tab.id, art.mandate); // a short chord when the blend changes
  updateScenario();
  const root = $('#stage-shell');
  if (!root) return;
  const live = $('.stage:not(.is-leaving)', root);
  if (!live) return;
  $$('[data-range]', live).forEach(el => {
    const key = el.dataset.range; const cfg = SL[baseKey(key)]; const v = num(get(key));
    if (document.activeElement !== el) el.value = String(v);
    el.style.setProperty('--p', `${(v - cfg.min) / (cfg.max - cfg.min) * 100}%`);
  });
  $$('[data-num]', live).forEach(el => {
    if (document.activeElement === el) return;
    const cfg = SL[baseKey(el.dataset.num)];
    el.value = cfg.fmt(num(get(el.dataset.num)));
  });
  $$('[data-reset]', live).forEach(el => { el.hidden = !isChanged(el.dataset.reset); });
  $$('[data-set]', live).forEach(el => {
    const v = get(el.dataset.set);
    const on = el.dataset.type === 'num' ? Math.abs(num(v) - Number(el.dataset.val)) < 1e-8 : String(v) === el.dataset.val;
    el.setAttribute('aria-pressed', String(on));
  });
  $$('[data-switch]', live).forEach(el => el.setAttribute('aria-checked', String(Boolean(get(el.dataset.switch)))));
  $$('[data-out]', live).forEach(el => {
    const v = B[el.dataset.out](c);
    if (initial) el._n = undefined;
    if (v && typeof v === 'object') writeText(el, v.f(v.n), v.n); else writeText(el, String(v));
  });
  $$('[data-state-of]', live).forEach(el => {
    const v = B[el.dataset.stateOf](c);
    if (el.dataset.state !== v) {
      const had = el.dataset.state !== undefined;
      el.dataset.state = v;
      if (el.hasAttribute('data-pop') && had && !initial && !reduced()) {
        const f = MOTION.fluid(el); f.set({ s: 0.94 }); f.to({ s: 1 }, { response: 0.42, damping: 0.72, precision: 0.0005 });
        MOTION.haptic(10);
      }
    }
  });
  $$('[data-show]', live).forEach(el => { el.hidden = !B[el.dataset.show](c); });
  $$('[data-hl]', live).forEach(el => el.classList.toggle('is-hl', Boolean(B[el.dataset.hl](c))));
  $$('[data-w]', live).forEach(el => MOTION.prop(el, 'width', B[el.dataset.w](c), '%', { immediate: initial }));
  $$('[data-h]', live).forEach(el => MOTION.prop(el, 'height', B[el.dataset.h](c), '%', { immediate: initial }));
  $$('[data-l]', live).forEach(el => MOTION.prop(el, 'left', B[el.dataset.l](c), '%', { immediate: initial }));
  $$('.stack', live).forEach(stack => {
    const parts = $$('[data-grow]', stack).map(el => ({ el, v: Math.max(0, num(B[el.dataset.grow](c))) }));
    const total = parts.reduce((s, p) => s + p.v, 0) || 1; const width = stack.clientWidth;
    parts.forEach(({ el, v }) => {
      el.hidden = v <= 0; el.style.flexBasis = '0';
      MOTION.prop(el, 'flexGrow', v, '', { immediate: initial, precision: 0.05 });
      el.classList.toggle('tight', v / total * width < 96);
    });
  });
  $$('[data-lottie-of]', live).forEach(el => playMark(el, B[el.dataset.lottieOf](c)));
  if (!initial) announce(c);
}

/* ── Scenario status (top bar) and screen-reader announcement ── */
function updateScenario() {
  const box = $('#scenario');
  const n = sharedEdits().length + decEdits().length;
  box.hidden = n === 0;
  if (n) $('#scenario-text').textContent = `Your scenario · ${n} change${n === 1 ? '' : 's'}`;
}
let announceTimer = 0, lastAnnounce = '';
function say(text) { if (text !== lastAnnounce) { lastAnnounce = text; $('#announce').textContent = text; } }
function announce(c) {
  clearTimeout(announceTimer);
  announceTimer = setTimeout(() => {
    const t = S.tab;
    say(t === 'obj1' ? `Viability gap ${signedRmT(c.p.gap)}. B30 price check ${c.p.pricePass ? 'passes' : 'fails'}.`
      : t === 'obj2' ? (c.e.row ? `${scenarioName(S.scenario)}, ${periodLabel(S.horizon)}: lasts the whole period in ${pct(c.e.solvency, 1)} of saved paths, the first 6 months in ${pct(c.e.survival6m, 1)}.` : 'No saved run for this choice.')
      : t === 'obj3' ? `Levy income ${rmMn(c.f.bslRevenue, 1)}. Levy plus savings ${rmMn(c.f.fundingEstimate, 1)}, illustrative.`
      : t === 'obj4' ? `Blend ${c.p.mandate}. ${c.p.decisionReason}` : `Blend ${c.dp.mandate}. ${c.dp.decisionReason}`);
  }, 600);
}

/* ── Chart read-out: pointer and keyboard share one path ── */
const tip = $('#tip');
function showPoint(wrap, idx, at) {
  const cfg = CH[wrap.dataset.chart]; if (!cfg) return;
  cfg.idx = Math.max(0, Math.min(cfg.rows.length - 1, idx));
  const row = cfg.rows[cfg.idx];
  wrap.classList.add('is-hover');
  const guide = $('.guide', wrap); guide.setAttribute('x1', cfg.px[cfg.idx]); guide.setAttribute('x2', cfg.px[cfg.idx]);
  $$('.hov', wrap).forEach(dot => { const s = cfg.series[Number(dot.dataset.hov)]; dot.setAttribute('cx', cfg.px[cfg.idx]); dot.setAttribute('cy', cfg.Y(num(row[s.k]))); });
  tip.innerHTML = `<b>${esc(cfg.tipX(row))}</b>${cfg.series.map(s => `<span><i style="background:${s.color}"></i>${s.label}<em>${cfg.yFmt(row[s.k])}</em></span>`).join('')}`;
  tip.hidden = false;
  const box = $('svg', wrap).getBoundingClientRect();
  const x = at?.x ?? box.left + cfg.px[cfg.idx] / cfg.W * box.width;
  const y = at?.y ?? box.top + cfg.Y(num(row[cfg.series[0].k])) / cfg.H * box.height;
  const w = tip.offsetWidth, h = tip.offsetHeight;
  tip.style.left = `${Math.max(8, Math.min(window.innerWidth - w - 12, x + 16))}px`;
  tip.style.top = `${Math.max(12, y - h - 14)}px`;
  return row;
}
function hideTip() { if (!tip.hidden) { tip.hidden = true; $$('.chart.is-hover').forEach(ch => ch.classList.remove('is-hover')); } }
function chartHover(event) {
  const wrap = event.target.closest?.('[data-chart]');
  if (!wrap || !CH[wrap.dataset.chart]) { if (!document.activeElement?.matches?.('[data-chart]')) hideTip(); return; }
  const cfg = CH[wrap.dataset.chart];
  const box = $('svg', wrap).getBoundingClientRect();
  const xv = (event.clientX - box.left) / box.width * cfg.W;
  let best = 0;
  cfg.px.forEach((p, i) => { if (Math.abs(p - xv) < Math.abs(cfg.px[best] - xv)) best = i; });
  showPoint(wrap, best, { x: event.clientX, y: event.clientY });
}
document.addEventListener('pointermove', chartHover);
document.addEventListener('pointerdown', chartHover);
document.addEventListener('scroll', hideTip, { passive: true });
document.addEventListener('focusin', event => { const wrap = event.target.closest?.('[data-chart]'); if (wrap && CH[wrap.dataset.chart]) showPoint(wrap, CH[wrap.dataset.chart].idx); });
document.addEventListener('focusout', event => { if (event.target.closest?.('[data-chart]')) hideTip(); });

/* ── Source inspector (read-only provenance) ─────────── */
function releaseKv() {
  return kv([
    ['Status', esc(META.modelStatus)], ['Model version', esc(META.modelVersion ?? '—')], ['Data through', DATA_THROUGH],
    ['Model estimated', esc(META.estimatedAtLabel ?? META.estimatedAt ?? '—')], ['Snapshot generated', esc(String(SNAP.generatedAt ?? '—').slice(0, 10))],
    ['This page built', esc(String(SNAP.builtAt ?? '—').slice(0, 10))]]);
}
function openProvenance(id) {
  const dlg = $('#prov');
  const q = id ? Q[id] : null;
  const src = q?.source ?? {};
  const cols = q ? [...new Set(q.rows.flatMap(r => Object.keys(r)))] : [];
  $('#prov-body').innerHTML = `${q ? `<section class="prov-query"><h3><code>${esc(id)}</code> · ${esc(src.label ?? '')}</h3>
      ${kv([['Rows', String(q.rows.length)], ['Files', esc((src.files ?? []).join(', ') || '—')], ['Filters', esc((src.filters ?? []).join(', ') || '—')]])}
      ${(src.caveats ?? []).map(t => alertBox(esc(t), '')).join('')}
      <div class="tbl-wrap prov-rows" tabindex="0" role="region" aria-label="${esc(id)} rows"><table class="tbl dense"><caption class="sr-only">Saved rows of ${esc(id)}</caption><thead><tr>${cols.map(k => `<th scope="col">${esc(k)}</th>`).join('')}</tr></thead>
        <tbody>${q.rows.slice(0, 200).map(r => `<tr>${cols.map(k => `<td>${esc(typeof r[k] === 'number' ? fx(r[k], Math.abs(r[k]) < 10 ? 4 : 2) : r[k])}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
      ${q.rows.length > 200 ? `<p class="note">First 200 of ${q.rows.length} rows shown.</p>` : ''}</section>` : ''}
    <section><h3>Release</h3>${releaseKv()}
      <p class="note">Snapshot SHA-256 <code>${esc(SNAP.snapshotSha256 ?? '—')}</code></p>
      <p class="note">Release fingerprint <code>${esc(SNAP.releaseFingerprint ?? '—')}</code></p>
      <p class="note">Model estimation, snapshot generation and page build are different dates. Values are read-only; nothing here can be edited.</p></section>
    <section><h3>Source manifest</h3>${tbl([{ h: 'Query', v: k => `<button type="button" class="src-link" data-prov="${k}">${k}</button>` }, { h: 'Label', v: k => esc(Q[k].source?.label ?? '') }, { h: 'Rows', v: k => Q[k].rows.length, n: 1 }, { h: 'Files', v: k => `<small>${esc((Q[k].source?.files ?? []).join(', '))}</small>` }], Object.keys(Q), { cls: 'dense', caption: 'Source manifest' })}
      <p class="note">Master workbook trace: ${esc(TRACE.masterFile)}, rows ${TRACE.rows[0].row} to ${TRACE_LAST.row} of the MONTHLY DATA sheet.</p></section>`;
  if (!dlg.open) {
    dlg.showModal();
    if (!reduced()) { const f = MOTION.fluid(dlg); f.set({ s: 0.96, y: 12, o: 0 }); f.to({ s: 1, y: 0, o: 1 }, { response: 0.34, damping: 0.92, o: { response: 0.2 } }); }
  }
  $('#prov-body').scrollTop = 0;
  $('#prov-close').focus();
}
function closeProvenance() {
  const dlg = $('#prov');
  if (!dlg.open) return;
  if (reduced()) return dlg.close();
  MOTION.fluid(dlg).to({ s: 0.97, y: 8, o: 0 }, { response: 0.2, damping: 1 }).then(() => { dlg.close(); MOTION.fluid(dlg).clear(); });
}
$('#prov').addEventListener('cancel', event => { event.preventDefault(); closeProvenance(); });
$('#prov').addEventListener('keydown', event => { if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); closeProvenance(); } });
$('#prov').addEventListener('click', event => { if (event.target === event.currentTarget) closeProvenance(); });

/* ── Lottie (offline lottie-web light player), with an owner for every instance ── */
const LOTTIE_ICONS = JSON.parse(document.getElementById('lottie-icons').textContent);
const LOTTIE_FLOW = JSON.parse(document.getElementById('lottie-flow').textContent);
const fresh = data => JSON.parse(JSON.stringify(data)); // the player mutates animation data
const LIVE = new Set();
const track = anim => { LIVE.add(anim); return anim; };
function sweepAnims() { for (const a of LIVE) if (!a.wrapper?.isConnected || a.wrapper.closest('.is-leaving')) { a.destroy(); LIVE.delete(a); } }
function playMark(el, state) {
  if (el._state === state || !window.lottie) return;
  el._state = state;
  if (el._anim) { el._anim.destroy(); LIVE.delete(el._anim); }
  const data = LOTTIE_ICONS[state] ?? LOTTIE_ICONS.B20;
  el._anim = track(window.lottie.loadAnimation({ container: el, renderer: 'svg', loop: false, autoplay: !reduced(), animationData: fresh(data) }));
  if (reduced()) el._anim.goToAndStop(data.op - 1, true);
}
function playFlows(root) {
  if (!window.lottie) return;
  $$('[data-lottie-flow]', root).forEach(el => {
    const anim = track(window.lottie.loadAnimation({ container: el, renderer: 'svg', loop: reduced() ? false : 2, autoplay: !reduced(), animationData: fresh(LOTTIE_FLOW) }));
    if (reduced()) anim.goToAndStop(20, true);
  });
}
MOTION.watch(reduce => {
  if (!reduce) return;
  for (const a of LIVE) { try { a.goToAndStop(a.totalFrames - 1, true); } catch {} }
  document.getAnimations?.().forEach(a => { try { a.finish(); } catch { a.cancel(); } });
});

/* ── Print: an explicit decision record, not just the current step ── */
function printSummary() {
  const c = compute();
  const rows = [
    ['Diesel price (MOPS)', rmT(c.dc.mops, 2), B.dMopsSrc()], ['Biodiesel cost (PME)', rmT(c.dc.pme, 2), B.dPmeSrc()],
    ['Fund balance', rmMn(c.dc.fund), B.dFundSrc()], ['B30 approval', c.dc.b30Auth ? 'Assumed' : 'Not assumed', B.dAuthSrc()],
  ];
  const checks = [['Price gap above RM 0/t', signedRmT(c.dp.gap), c.dp.pricePass], [`Fund above ${rmMn(FUND_LIMIT, 2)}`, rmMn(c.dc.fund), c.dp.fundSafe], ['B30 approval', c.dc.b30Auth ? 'Assumed' : 'Not assumed', Boolean(c.dc.b30Auth)]];
  $('#print-summary').innerHTML = `<h1>Mandate Decision Studio · decision summary</h1>
    <p>${String(META.modelStatus)} · data through ${DATA_THROUGH} · model ${META.modelVersion ?? ''} estimated ${META.estimatedAtLabel ?? ''} · snapshot ${String(SNAP.snapshotSha256 ?? '').slice(0, 12)} · printed ${new Date().toLocaleDateString('en-MY')}</p>
    <table><thead><tr><th>Input</th><th>Value</th><th>Source</th></tr></thead><tbody>${rows.map(r => `<tr><td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td></tr>`).join('')}</tbody></table>
    <table><thead><tr><th>Rule check</th><th>Value</th><th>Result</th></tr></thead><tbody>${checks.map(r => `<tr><td>${r[0]}</td><td>${r[1]}</td><td>${r[2] ? 'Pass' : 'Fail'}</td></tr>`).join('')}</tbody></table>
    <p class="ps-result">Blend under these settings: <b>${c.dp.mandate}</b>. ${c.dp.decisionReason}</p>
    <p>Funding (illustrative, periods differ): levy ${rmMn(c.df.bslRevenue, 1)} on the ${PROD_PERIOD} production base, savings ${rmMn(c.df.paidSavings, 1)} yearly estimate, starting money ${rmMn(c.dc.governmentSeed)} paid once. These are kept separate; they are not cash in hand.</p>
    <ul><li>Values are simulated placeholders from the reviewed snapshot, not official MPOB figures.</li><li>Controls do not rerun the research models.</li><li>B15 is a proposed safeguard only. WPL is a baseline reference only.</li><li>This is a result under stated assumptions, not a forecast, budget or B30 approval.</li></ul>`;
}
window.addEventListener('beforeprint', printSummary);

/* ── Events ──────────────────────────────────────────── */
document.addEventListener('input', event => {
  const el = event.target.closest('[data-range]');
  if (el) set(el.dataset.range, Number(el.value), 'drag');
});
document.addEventListener('change', event => { if (event.target.closest('[data-range]')) S.cause = 'commit'; });

// Exact-value fields: a draft until committed. Invalid text and Escape never change the model.
const NUM_RE = /^[+-]?(?:\d{1,3}(?:,\d{3})+|\d+)?(?:\.\d+)?$/;
function parseTyped(text) {
  const t = String(text).trim().replace(/^RM\s*/i, '').replace(/\s*(?:\/\s*t|mn|%)$/i, '').trim();
  if (!t || !/\d/.test(t) || !NUM_RE.test(t)) return null;
  return Number(t.replace(/,/g, ''));
}
const errorBox = el => document.getElementById(el.getAttribute('aria-describedby'));
function showError(el, message) { el.setAttribute('aria-invalid', 'true'); const box = errorBox(el); if (box) { box.textContent = message; box.hidden = false; } }
function clearError(el) { el.removeAttribute('aria-invalid'); const box = errorBox(el); if (box) { box.hidden = true; box.textContent = ''; } }
function commitNumber(el) {
  if (el.value.trim() === el._start) return true;
  const cfg = SL[baseKey(el.dataset.num)];
  const typed = parseTyped(el.value);
  if (typed === null) { showError(el, `“${el.value.trim()}” is not a number. The value was not changed.`); return false; }
  const value = cfg.parse ? cfg.parse(typed) : typed;
  if (value < cfg.min || value > cfg.max) { showError(el, `Enter a value from ${cfg.fmt(cfg.min)} to ${cfg.fmt(cfg.max)}. The value was not changed.`); return false; }
  clearError(el);
  if (!same(value, num(get(el.dataset.num)))) set(el.dataset.num, value);
  return true;
}
document.addEventListener('focusin', event => {
  const el = event.target.closest('[data-num]');
  if (!el) return;
  const cfg = SL[baseKey(el.dataset.num)]; const v = num(get(el.dataset.num));
  el.value = cfg.raw ? cfg.raw(v) : String(Math.round(v * 100) / 100);
  el._start = el.value; el._handled = false;
  el.select();
});
document.addEventListener('focusout', event => {
  const el = event.target.closest('[data-num]');
  if (!el) return;
  if (!el._handled) commitNumber(el);
  el._handled = false;
  refresh();
});

const TAB_KEYS = { ArrowRight: 1, ArrowLeft: -1, Home: -Infinity, End: Infinity };
document.addEventListener('keydown', event => {
  // Escape closes the source inspector wherever focus happens to be.
  if (event.key === 'Escape' && $('#prov')?.open) { event.preventDefault(); return closeProvenance(); }
  const field = event.target.closest?.('[data-num]');
  if (field && event.key === 'Enter') {
    event.preventDefault();
    if (commitNumber(field)) { field._handled = true; field.blur(); } else field.select();
    return;
  }
  if (field && event.key === 'Escape') { event.preventDefault(); clearError(field); field.value = field._start ?? field.value; field._handled = true; field.blur(); return; }
  const chartEl = event.target.closest?.('[data-chart]');
  if (chartEl && CH[chartEl.dataset.chart] && ['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) {
    event.preventDefault();
    const cfg = CH[chartEl.dataset.chart]; const jump = event.shiftKey ? 12 : 1;
    const idx = event.key === 'Home' ? 0 : event.key === 'End' ? cfg.rows.length - 1 : cfg.idx + (event.key === 'ArrowRight' ? jump : -jump);
    const row = showPoint(chartEl, idx);
    say(`${cfg.tipX(row)}: ${cfg.series.map(s => `${s.label} ${cfg.yFmt(row[s.k])}`).join(', ')}`);
    return;
  }
  const tabEl = event.target.closest?.('[role="tab"]');
  if (tabEl && event.key in TAB_KEYS) {
    event.preventDefault();
    const k = tabIndex(tabEl.dataset.tab), d = TAB_KEYS[event.key];
    const next = TABS[d === Infinity ? TABS.length - 1 : d === -Infinity ? 0 : (k + d + TABS.length) % TABS.length];
    goTab(next.id, { instant: true });
    $(`#tab-${next.id}`).focus();
    return;
  }
  if (event.target.closest('input, textarea, select, [role="tab"], details, summary, dialog, .tbl-wrap')) return;
  if (event.key === 'ArrowRight') goStep(S.step[S.tab] + 1, { instant: true });
  if (event.key === 'ArrowLeft') goStep(S.step[S.tab] - 1, { instant: true });
});
document.addEventListener('click', event => {
  const t = event.target.closest('button, summary, .dstack:not(.is-open) .dstack-cards');
  if (!t) return;
  if (t.classList.contains('dstack-cards')) return toggleStack(t.closest('.dstack'));
  if (t.hasAttribute('data-stack-toggle')) return toggleStack(t.closest('.dstack'));
  if (t.hasAttribute('data-card-toggle')) {
    const st = t.closest('.dstack');
    return st.classList.contains('is-open') ? toggleCard(t.closest('.dcard')) : toggleStack(st);
  }
  if (t.dataset.prov) return openProvenance(t.dataset.prov);
  if (t.hasAttribute('data-prov-open')) return openProvenance();
  if (t.id === 'prov-close') return closeProvenance();
  if (t.dataset.tab) { if (t.closest('dialog')) closeProvenance(); return goTab(t.dataset.tab, t.dataset.step !== undefined ? { step: Number(t.dataset.step) } : {}); } // Home links can open a given step
  if (t.dataset.go !== undefined) { SOUND.tap(); return goStep(Number(t.dataset.go)); } // a step box clicks like a phone key
  if (t.hasAttribute('data-back')) { SOUND.tap('back'); return goStep(S.step[S.tab] - 1); }
  if (t.hasAttribute('data-next')) {
    SOUND.tap('next');
    const tab = tabById(S.tab); const i = S.step[tab.id];
    if (i < tab.steps.length - 1) return goStep(i + 1);
    const nextTab = TABS[TABS.indexOf(tab) + 1];
    if (nextTab) return goTab(nextTab.id, { step: 0 });
    return goStep(0);
  }
  if (t.dataset.set !== undefined) return set(t.dataset.set, t.dataset.type === 'num' ? Number(t.dataset.val) : t.dataset.val);
  if (t.dataset.switch) return set(t.dataset.switch, !get(t.dataset.switch));
  if (t.dataset.reset) return resetKey(t.dataset.reset);
  if (t.hasAttribute('data-use-objectives')) return useObjectiveSettings();
  if (t.hasAttribute('data-restore')) return restoreSnapshot();
  if (t.hasAttribute('data-print')) { printSummary(); return window.print(); }
  if (t.hasAttribute('data-replay')) t.closest('.stage').querySelector('[data-cycle]').classList.toggle('again');
});
let resizeRaf = 0;
window.addEventListener('resize', () => {
  movePill(false);
  cancelAnimationFrame(resizeRaf);
  resizeRaf = requestAnimationFrame(() => $$('.dstack:not(.is-open)').forEach(st => layoutStack(st, false, false)));
});
window.addEventListener('hashchange', () => { const h = readHash(); if (h && (h.tab !== S.tab || h.step !== S.step[h.tab])) goTab(h.tab, { step: h.step, instant: true }); });

// Swipe the step card: 1:1 tracking, rubber-band at the first and last step, momentum decides.
MOTION.swipe(document, {
  surface: '.stage:not(.is-leaving)',
  ignore: 'input, textarea, select, summary, .map-wrap, .compare-wrap, .dstack, .chart, .tbl-wrap, [data-no-swipe]',
  can: dir => { const i = S.step[S.tab] + dir; return i >= 0 && i < tabById(S.tab).steps.length; },
  onMove: (el, offset, width) => MOTION.fluid(el).set({ x: offset, s: 1 - Math.min(0.02, Math.abs(offset) / width * 0.04) }),
  onEnd: (el, { commit, dir, offset, velocity }) => {
    if (commit) { MOTION.haptic(8); return goStep(S.step[S.tab] + dir, { handoff: { offset, velocity } }); }
    MOTION.fluid(el).to({ x: 0, s: 1 }, { response: 0.38, damping: 0.8, velocity: { x: velocity } });
  },
});

/* ── Start ───────────────────────────────────────────── */
const statusWord = String(META.modelStatus).toLowerCase().replace(/^\w/, ch => ch.toUpperCase());
$('#status').innerHTML = `<i></i><span class="status-long">${statusWord} · ${esc(META.modelVersion ?? '')} · data through ${DATA_THROUGH}</span><span class="status-short">Snapshot · ${DATA_THROUGH}</span>`;
$('#scenario').innerHTML = `<span id="scenario-text"></span><button type="button" class="btn-link" data-restore>Restore snapshot</button>`;
const fromHash = readHash();
if (fromHash) { S.tab = fromHash.tab; S.step[fromHash.tab] = fromHash.step; }
renderTabs();
renderPage(0);
if (!reduced()) { const first = $('.page'); const f = MOTION.fluid(first).set({ y: 16, o: 0 }); f.to({ y: 0, o: 1 }, { response: 0.5 }).then(done => { if (done) f.clear(); }); }
document.fonts?.ready?.then(() => movePill(false));
