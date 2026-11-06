/* ── Number origins (Developer level only) ──────────────────────────────────────────────────────
   Rest the cursor on any number and a card floats beside it: the workbook cells it starts from, the sum with its real
   values, and threads back to the number. Click to keep it open. On a phone, tap a number. It only reads: it changes no
   number, no setting and no rule.

   Each number is looked up in this order:
   1. A master-data cell reference printed beside it (H201): that cell.
   2. A row of a Detail table: the saved snapshot row and column it is drawn from.
   3. The audio guide's checked narration and sum cards for this step, if the number matches exactly (default settings).
   4. A live sum worked out from the current settings, so it stays true when a slider moves.
   5. A saved snapshot value equal to the number, then a labelled constant.
   Anything still unknown says so. It never guesses. */
const NUMTRACE = (() => {
  const DATA = JSON.parse(document.getElementById('number-origins').textContent);
  const WB = DATA.workbook, SCENES = DATA.scenes ?? [];
  const MONTH_ROWS = WB.months ?? [];
  const SCOPE = '#page, #prov';
  const SKIP = '.nt-panel, .step-jump, .step-pill, .dstack-count, .dstack-bar, .dcard-head, .src-link, .prov-line, .tags, .topbar, .foot, .home, .guide-knob, .light > span, .hb > span, .art, [data-art], .stage-head, .cyc > b';
  const STATIONS = [['xl', 'Master workbook', '--nt-xl'], ['py', 'Python model', '--nt-py'], ['snap', 'Saved snapshot', '--nt-snap'], ['js', 'Studio formula', '--nt-js'], ['ui', 'Screen', '--nt-ui']];
  const RM_ = () => MOTION.reduce;

  /* ── Finding a number in text ── */
  const NUM = String.raw`(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?`;
  const AFTER = String.raw`(?![\p{L}])`;
  const TOKEN = new RegExp(String.raw`(?<![\p{L}\p{N}.,_/])(?<!\d[-−])(?<!\p{L}[-−])(?:[−+-]\s?)?(?:(?:RM|USD)\s?[−-]?${NUM}(?:\s?(?:mn|bn|billion)${AFTER})?(?:\s?\/\s?(?:t|bbl|tonne)${AFTER})?|${NUM}(?:-(?:month|year)${AFTER}|\s?%|×|\s?mn t${AFTER}|\s?bn L${AFTER}|\s?mn${AFTER}|\s?(?:months?|mo|years?)${AFTER})?)(?![\p{L}\p{N}])`, 'gu');
  // "Objective 2", "Step 3", "Lag 1" are names, not numbers.
  const NAMED = /(?:Objectives?|OBJ|Steps?|steps?|Cards?|Checks?|check|Lags?|Rank|Case)\s$/;
  const isDate = t => /^(19|20)\d\d$/.test(t) || /^(19|20)\d\d-\d\d$/.test(t);
  const canon = t => String(t).replace(/[\s   ]/g, '').replace(/−/g, '-').toLowerCase();
  function tokensIn(text) {
    const out = [];
    for (const m of String(text).matchAll(TOKEN)) { const t = m[0].trim(); if (isDate(t) || (/^\d+$/.test(t) && NAMED.test(String(text).slice(Math.max(0, m.index - 12), m.index)))) continue; out.push({ text: t, start: m.index, end: m.index + m[0].length }); }
    return out;
  }
  function parseToken(t) {
    const s = canon(t);
    const m = s.match(/^([+-]?)(?:rm|usd)?([+-]?)(\d[\d,]*)(\.\d+)?(.*)$/);
    if (!m) return null;
    const sign = m[1] === '-' || m[2] === '-' ? -1 : 1;
    const d = m[4] ? m[4].length - 1 : 0;
    return { v: sign * Number(m[3].replace(/,/g, '') + (m[4] ?? '')), abs: Number(m[3].replace(/,/g, '') + (m[4] ?? '')), d, unit: m[5], pct: m[5].startsWith('%'), money: /^[+-]?(rm|usd)/.test(s), isUsd: /^[+-]?usd/.test(s), signed: /^[+-]/.test(s) };
  }

  /* ── Small builders, same card shapes as the audio guide ── */
  const e = s => String(s ?? '').replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]);
  const raw = v => v == null || v === '' ? '' : typeof v === 'number' ? v.toLocaleString('en-MY', { maximumFractionDigits: 12 }) : String(v);
  const term = (l, v, s = '', a = null, t = '') => ({ l, v, s, a, t });
  const calc = (title, terms, ops, res, work = '') => ({ type: 'calc', title, terms, ops, res, work });
  const note = (head, body, tone = 'info') => ({ type: 'note', head, body, tone });
  const table = (title, head, rows, hl = null, foot = '') => ({ type: 'table', title, head, rows, hl, foot });
  const wbRow = n => MONTH_ROWS.find(m => m.row === n);
  const lastRow = () => MONTH_ROWS.at(-1);
  // A window of MONTHLY DATA, shown like the sheet itself.
  function sheet(cols, rows, hl = [], { title = '', total = null, rg = [] } = {}) {
    const found = rows.map(wbRow).filter(Boolean);
    if (!found.length) return null;
    return { type: 'cells', sheet: 'MONTHLY DATA', title: title || WB.file, cols: ['A', ...cols], names: ['Month', ...cols.map(c => WB.headers[c] ?? c)],
      rows: found.map(m => ({ r: m.row, v: [m.p, ...cols.map(c => raw(m.v[c]))] })), hl, rg, total };
  }
  const settingCell = (sheetName, cell, label, what) => {
    const rec = WB.settings?.[sheetName]?.[cell];
    return rec ? { type: 'cells', sheet: sheetName, title: what, cols: ['B', 'C'], names: ['Setting', 'Value'], rows: [{ r: cell.slice(1), v: [label, raw(rec.value)] }], hl: [`C${cell.slice(1)}`], rg: [], total: null } : null;
  };
  const lastN = (n, col) => MONTH_ROWS.slice(-n).reduce((sum, m) => sum + Number(m.v[col] ?? 0), 0);
  const rowsN = n => MONTH_ROWS.slice(-n).map(m => m.row);
  const twelve = (col, what) => {
    const rows = rowsN(12);
    if (!rows.length) return null;
    return sheet([col], rows, [], { title: what, rg: rows.map(r => `${col}${r}`), total: { label: 'Σ', cells: { [col]: raw(lastN(12, col)) } } });
  };
  const usedFiles = id => (Q[id]?.source?.files ?? []).join(', ');
  const ex = (o) => ({ kind: 'live', rail: ['ui'], cards: [], links: [], src: [], ...o });

  /* ── How each saved table was made ── */
  const MADE = {
    model_assumptions: 'Settings of the saved runs, from v3_config.py and the back-test.',
    decision_snapshot: 'The last row of MONTHLY DATA, rounded to two decimals by the Python pipeline, with the proposed fund and BSL defaults.',
    rq1_coefficients: 'An OLS fit with HAC errors of column I (PME cost) on last month\'s CPO, methanol and glycerol.',
    rq1_breakeven: 'A straight line fitted to all months turns Brent into a diesel price. The cost equation is then set equal to that price and solved for CPO, with methanol and glycerol at their latest values.',
    rq1_monthly: 'Columns D, H, I and J of MONTHLY DATA, month by month.',
    rq1_johansen: 'A Johansen trace test on real public export-value, CPO and Brent (MYR) data, run at each lag setting.',
    rq1_apmbio_diagnostic: 'The fitted cost equation split into its terms for the latest month.',
    rq1_proposal_tests: 'Cointegration and structural-break checks saved by the RQ1 model.',
    rq2_scenarios_9m: 'simulate_bsf runs the fund month by month over 10,000 simulated price paths on B20. The result is the share of paths where the fund stays above zero.',
    rq2_scenarios_60m: 'simulate_bsf runs the fund month by month over 10,000 simulated price paths on B20. The result is the share of paths where the fund stays above zero.',
    rq2_capture: 'The same fund simulation, repeated with a smaller share of savings paid in.',
    rq2_seed: 'Tries starting money from RM 0 upward in steps of RM 25 mn up to RM 5,000 mn, on the same price paths, and stops at the first amount that passes. If none passes it returns the limit.',
    rq2_fund_grid: 'The same fund simulation for every saved mix of case, period, savings share, BSL and starting money.',
    rq3_financing: 'Each source is scored on money raised (last 12 months), income swings (CV of yearly income) and cost to growers.',
    rq3_bsl: 'BSL rate × CPO production over the last 12 months, column K, at 90%, 100% and 110% of that production.',
    rq3_competitiveness: 'The levy\'s burden on producers against an assumed margin, compared with the Indonesia levy.',
    rq3_wpl: 'WPL law values from the WPL SETTINGS sheet of the master workbook. A baseline reference only.',
    rq4_summary: 'The back-test runs the rule on every month, with the same money as the fund test. Fixed-blend costs are the rule\'s own cost series scaled by the blend ratio.',
    rq4_matrix: 'One saved 5-year simulation for each mix of energy level, geopolitical run and highest blend allowed.',
    rq4_map: 'The viability gap for a grid of CPO and Brent prices.',
    b30_impact: 'Worked out from the last 12 months of the master workbook: columns J, Q and M.',
    model_registry: 'Written when the pipeline runs.',
  };
  const madeNote = id => {
    const so = Q[id]?.source;
    if (!so) return null;
    return note(so.label ?? id, `<p>${e(MADE[id] ?? 'Saved by the Python model.')}</p><p class="small">Made by ${e((so.files ?? []).join(', ') || 'the pipeline')} · saved as <b>${e(id)}</b> in the snapshot.</p>`);
  };
  const stationsOf = id => {
    const f = usedFiles(id);
    return [...(/Master|xlsx/i.test(f) || ['rq1_coefficients', 'rq1_breakeven', 'rq1_apmbio_diagnostic', 'rq3_financing', 'rq3_bsl', 'rq4_summary', 'b30_impact', 'rq2_scenarios_9m', 'rq2_scenarios_60m', 'rq2_capture', 'rq2_seed', 'rq2_fund_grid', 'rq4_matrix'].includes(id) ? ['xl'] : []), ...(/\.py/.test(f) ? ['py'] : []), 'snap', 'ui'];
  };
  const ROW_COL = { mopsRmT: 'H', pmeRmT: 'I', cpoRmT: 'D', viabilityGapRmT: 'J' };

  /* ── Live sums: true for the settings on screen now ── */
  const rowNow = () => lastRow()?.row ?? 0;
  const PRICE_ROWS = () => [rowNow() - 1, rowNow()];
  const isDefault = key => same(S[key], DEFAULTS[key]);
  const mopsFact = (value, onPage) => (onPage || !same(value, DEFAULTS.mops))
    ? ex({ kind: 'setting', what: `The diesel price you entered. The snapshot value is ${rmT(DEFAULTS.mops, 2)}.`, rail: ['ui'], cards: [sheet(['H'], PRICE_ROWS(), [`H${rowNow()}`], { title: 'The value it replaces' })] })
    : ex({ kind: 'workbook', what: `MOPS diesel for ${SNAP_MONTH}. It is read from cell H${rowNow()} of the master workbook and rounded to two decimals. It stays a simulated proxy until a licensed MOPS price is supplied.`, rail: ['xl', 'py', 'snap', 'ui'], src: ['decision_snapshot'],
      cards: [sheet(['H'], PRICE_ROWS(), [`H${rowNow()}`])], links: [[`cell:H${rowNow()}`, 'spot:out', 'fly']] });
  const fitTerms = () => ({ k: coef('const'), a: coef('cpo_lag1'), b: coef('meoh_rm'), g: coef('gly_rm') });
  const fittedFact = () => {
    const { k, a, b, g } = fitTerms(); const r = rowNow();
    const atStart = isDefault('cpoLag') && isDefault('methanol') && isDefault('glycerol');
    return ex({ what: `The fitted APM-Bio cost equation, worked out live from ${atStart ? 'the reviewed master inputs' : 'your ingredient prices'}.`, rail: atStart ? ['xl', 'py', 'snap', 'js', 'ui'] : ['py', 'js', 'ui'], src: ['rq1_coefficients'], cards: [
      atStart ? sheet(['D', 'E', 'F'], PRICE_ROWS(), [`D${r - 1}`, `E${r}`, `F${r}`]) : null,
      calc('APM-Bio cost equation', [term('constant', k.toFixed(4), 'fitted'), term(`${a.toFixed(4)} × CPO(t−1)`, fx(S.cpoLag, 2), atStart ? `Excel D${r - 1}` : 'your slider', 'cpo'), term(`${b.toFixed(4)} × methanol`, fx(S.methanol, 2), atStart ? `Excel E${r}` : 'your slider', 'me'), term(`${Math.abs(g).toFixed(4)} × glycerol`, fx(S.glycerol, 2), atStart ? `Excel F${r}` : 'your slider', 'gl')],
        ['+', '+', '−'], term('Fitted PME cost', rmT(fittedPme(COEF, { cpoLag: S.cpoLag, methanol: S.methanol, glycerol: S.glycerol }), 2), 'model.js · fittedPme', 'res'))],
      links: atStart ? [[`cell:D${r - 1}`, 't:cpo'], [`cell:E${r}`, 't:me'], [`cell:F${r}`, 't:gl'], ['t:res', 'spot:out', 'fly']] : [['t:res', 'spot:out', 'fly']] });
  };
  const pmeFact = (c, value, onPage) => {
    if (onPage) return ex({ kind: 'setting', what: `The biodiesel cost you entered on this page. The snapshot value is ${rmT(DEFAULTS.pme, 2)}.`, rail: ['ui'] });
    if (S.pmeMode === 'formula') return fittedFact();
    if (!same(value, DEFAULTS.pme)) return ex({ kind: 'setting', what: `The biodiesel cost you entered. The snapshot value is ${rmT(DEFAULTS.pme, 2)}.`, rail: ['ui'], cards: [sheet(['I'], PRICE_ROWS(), [`I${rowNow()}`], { title: 'The value it replaces' })] });
    return ex({ kind: 'workbook', what: `PME cost for ${SNAP_MONTH}. It is read from cell I${rowNow()} of the master workbook and rounded to two decimals. It is a simulated cost proxy, not an observed price.`, rail: ['xl', 'py', 'snap', 'ui'], src: ['decision_snapshot'], cards: [sheet(['I'], PRICE_ROWS(), [`I${rowNow()}`])], links: [[`cell:I${rowNow()}`, 'spot:out', 'fly']] });
  };
  const gapFact = (mops, pme, gap) => ex({ what: 'The viability gap is the diesel price minus the biodiesel cost. Above zero, blending saves money. Below zero, biodiesel costs more and support may be needed.', rail: ['js', 'ui'], src: ['decision_snapshot'], cards: [
    calc('Viability gap', [term('Diesel price (MOPS)', rmT(mops, 2), same(mops, DEFAULTS.mops) ? `Excel H${rowNow()}` : 'your value', 'm'), term('Biodiesel cost (PME)', rmT(pme, 2), same(pme, DEFAULTS.pme) ? `Excel I${rowNow()}` : 'your value', 'p')], ['−'], term('Viability gap', signedRmT(gap), 'model.js · policyState', 'res', gap >= 0 ? 'good' : 'bad'))], links: [['t:res', 'spot:out', 'fly']] });
  const K_SUM = () => lastN(12, 'K') / 1000, L_SUM = () => lastN(12, 'L') / 1000;
  const prodCard = () => (Math.abs(K_SUM() - num(A.annualCpoProductionMt)) < 1e-6 ? twelve('K', `CPO production · ${PROD_PERIOD}`) : null);
  const productionFact = c => ex({ what: `The base is the sum of CPO production over the last 12 months, column K, in thousand tonnes. The slider then takes ${S.productionPct}% of it.`, rail: ['xl', 'py', 'snap', 'js', 'ui'], src: ['model_assumptions'], cards: [prodCard(),
    calc('CPO production', [term('Base', `${num(A.annualCpoProductionMt).toFixed(3)} mn t`, 'Σ column K ÷ 1,000', 'k'), term('Share of base', `${S.productionPct}%`, 'your slider')], ['×'], term('Production', `${c.f.productionMt.toFixed(3)} mn t`, 'fundingAmounts', 'res'))], links: [['tot:K', 't:k', '', 'sum of 12 months']] });
  const bslFact = (c, f = c.f, rate = sharedControls().bslRate) => ex({ what: 'BSL income is the rate per tonne of CPO times the tonnes produced in a year.', rail: ['xl', 'py', 'snap', 'js', 'ui'], src: ['rq3_bsl'], cards: [prodCard(),
    calc('BSL income', [term('BSL rate', rmT(rate), rate === DEFAULTS.bslRate ? 'MODEL SETTINGS C11' : 'your value'), term('CPO production', `${f.productionMt.toFixed(3)} mn t`, 'column K', 'k')], ['×'], term('BSL income a year', rmMn(f.bslRevenue, 1), 'fundingAmounts', 'res'))], links: [['tot:K', 't:k', '', 'sum of 12 months']] });
  const savingsAnnualFact = () => ex({ what: 'For each month, the positive part of the viability gap (column J) times the monthly B20 tonnes. The yearly totals are averaged over all calendar years in the data.', kind: 'saved', rail: ['xl', 'py', 'snap', 'ui'], src: ['rq3_financing'], cards: [madeNote('rq3_financing')] });
  const savingsFact = (c, f = c.f, share = S.capture) => ex({ what: 'The share of savings paid in, times the modelled yearly savings.', rail: ['py', 'snap', 'js', 'ui'], src: ['rq3_financing'], cards: [
    calc('Savings paid in', [term('Share paid in', pct(share, 0), same(share, BASE_CAPTURE) ? 'MODEL SETTINGS C12' : 'your value'), term('Modelled yearly savings', rmMn(SAVINGS_ANNUAL, 2), 'rq3_financing')], ['×'], term('Savings paid in', rmMn(f.paidSavings, 1), 'fundingAmounts', 'res'))] });
  const exportFact = () => {
    const ok = Math.abs(L_SUM() * FIXED_RATE - FIXED_EXPORT) < 0.01;
    return ex({ what: 'The export-point levy charges the placeholder rate on palm oil exports over the last 12 months, column L. It is counted as already in place.', kind: 'saved', rail: ['xl', 'py', 'snap', 'ui'], src: ['rq3_financing'], cards: ok ? [twelve('L', `Palm oil exports · ${PROD_PERIOD}`),
      calc('Export-point levy', [term('Placeholder rate', rmT(FIXED_RATE), 'v3_config.py'), term('Exports', `${L_SUM().toFixed(3)} mn t`, 'column L', 'l')], ['×'], term('Export-point levy a year', rmMn(FIXED_EXPORT, 1), 'rq3_financing.py', 'res'))] : [madeNote('rq3_financing')], links: ok ? [['tot:L', 't:l', '', 'sum of 12 months']] : [] });
  };
  const prodTaxFact = c => ex({ what: `The production tax charges the placeholder rate on CPO production. It is counted as already in place, and moves with the production slider (${S.productionPct}% now).`, rail: ['xl', 'py', 'snap', 'js', 'ui'], src: ['rq3_financing'], cards: [prodCard(),
    calc('Production tax', [term('Saved at base production', rmMn(FIXED_PROD, 1), 'rq3_financing'), term('Share of base', `${S.productionPct}%`, 'your slider')], ['×'], term('Production tax a year', rmMn(fixedNow(S) - FIXED_EXPORT, 1), 'app.js · fixedNow', 'res'))] });
  const moneyCard = (dc, f, withSeed) => calc(withSeed ? 'One year of money plus starting money' : 'Money in each year',
    [term('Export-point levy', rmMn(FIXED_EXPORT, 1), 'rq3_financing'), term('Production tax', rmMn(fixedNow(dc) - FIXED_EXPORT, 1), 'rq3_financing'), term('BSL', rmMn(f.bslRevenue, 1), 'rate × production'), term('Savings paid in', rmMn(f.paidSavings, 1), 'share × savings'), ...(withSeed ? [term('Starting money', rmMn(dc.governmentSeed), 'paid once')] : [])],
    withSeed ? ['+', '+', '+', '+'] : ['+', '+', '+'], term(withSeed ? 'Total' : 'Money in each year', rmMn(fixedNow(dc) + (withSeed ? f.withStartingMoney : f.fundingEstimate), 1), 'app.js · fixedNow + fundingAmounts', 'res'));
  const moneyFact = (c, withSeed) => ex({ what: withSeed ? 'One year of every source, plus the starting money paid once. It is not cash in hand.' : 'The four sources that come in every year. Starting money is shown apart because it is paid once.', rail: ['xl', 'py', 'snap', 'js', 'ui'], src: ['rq3_financing'], cards: [moneyCard(sharedControls(), c.f, withSeed)] });
  const decMoneyFact = c => ex({ what: 'The four sources that come in every year, at the values on this page. It does not change the blend.', rail: ['xl', 'py', 'snap', 'js', 'ui'], src: ['rq3_financing'], cards: [moneyCard(c.dc, c.df, false)] });
  const seedFact = (value, el) => ex({ what: same(value, num(A.seedCapitalRmMn)) ? 'The proposed starting money, set in v3_config.py and saved as seedCapitalRmMn. It is a proposal, not a model result, and the fund does not exist yet.' : el && !pressed(el) && !el.matches?.('select') ? `A saved starting amount. ${CHOICE}` : 'The starting money you chose. It picks a saved run; it does not rerun the model.', kind: same(value, num(A.seedCapitalRmMn)) ? 'fixed' : el && !pressed(el) && !el.matches?.('select') ? 'choice' : 'setting', rail: same(value, num(A.seedCapitalRmMn)) ? ['py', 'snap', 'ui'] : ['ui'], src: ['model_assumptions'] });
  const pressed = el => el?.closest?.('[aria-pressed]')?.getAttribute('aria-pressed') === 'true';
  const CHOICE = 'One of the saved choices. Pressing it picks a saved result; it does not rerun the model.';
  const rateFact = (value, el) => ex({ what: same(value, DEFAULTS.bslRate) ? 'The default BSL rate, recorded in MODEL SETTINGS cell C11. It is a proposed rate. The saved runs use RM 20, 25 and 30 per tonne.' : el && !pressed(el) ? `A saved BSL rate. ${CHOICE}` : 'The BSL rate you chose.', kind: same(value, DEFAULTS.bslRate) ? 'fixed' : el && !pressed(el) ? 'choice' : 'setting', rail: same(value, DEFAULTS.bslRate) ? ['xl', 'py', 'snap', 'ui'] : ['ui'], src: ['decision_snapshot'], cards: [same(value, DEFAULTS.bslRate) ? settingCell('MODEL SETTINGS', 'C11', 'Default BSL rate', 'The record of the reviewed settings') : null] });
  const shareFact = value => ex({ what: same(value, BASE_CAPTURE) ? 'The default share of savings paid in, recorded in MODEL SETTINGS cell C12.' : 'The share of savings paid in that you chose.', kind: same(value, BASE_CAPTURE) ? 'fixed' : 'setting', rail: same(value, BASE_CAPTURE) ? ['xl', 'py', 'snap', 'ui'] : ['ui'], cards: [same(value, BASE_CAPTURE) ? settingCell('MODEL SETTINGS', 'C12', 'Default savings share', 'The record of the reviewed settings') : null] });
  const fundFact = (value, onPage) => ex({ what: onPage || !same(value, DEFAULTS.fund) ? 'The fund balance you entered. It is not calculated from Objective 2.' : 'The proposed starting money, used as the opening fund balance because the fund does not exist yet. It is not calculated from Objective 2.', kind: onPage || !same(value, DEFAULTS.fund) ? 'setting' : 'fixed', rail: onPage || !same(value, DEFAULTS.fund) ? ['ui'] : ['py', 'snap', 'ui'], src: ['decision_snapshot'], cards: [calc('Check 2 · fund', [term('Fund balance', rmMn(value), onPage ? 'this page' : 'slider'), term('Limit', rmMn(FUND_LIMIT, 2), 'multiple × drawdown')], ['must be above'], term(value > FUND_LIMIT ? 'Pass' : 'Fail', value > FUND_LIMIT ? 'Above the limit' : 'Not above the limit', 'strictly greater', 'res', value > FUND_LIMIT ? 'good' : 'bad'))] });
  const limitFact = () => ex({ what: 'The limit is the fund safety multiple times the recent average monthly drawdown from the back-test. It stays fixed until a reviewed refresh.', kind: 'saved', rail: ['xl', 'py', 'snap', 'js', 'ui'], src: ['model_assumptions'], cards: [settingCell('MODEL SETTINGS', 'C15', 'Fund safety multiple', 'The record of the reviewed settings'),
    calc('The fund limit', [term('Fund safety multiple', String(num(A.fundSafetyMultiple)), 'MODEL SETTINGS C15'), term('Recent average drawdown', rmMn(A.rolling12AvgB20DrawdownRmMn, 2), 'rq4 back-test')], ['×'], term('Fund limit', rmMn(FUND_LIMIT, 2), 'model.js · policyState', 'res'))] });
  const drawdownFact = () => ex({ what: 'The saved average monthly support over the last 12 months of the back-test. It is computed in rq4_mandate_rule.py and saved as rolling12AvgB20DrawdownRmMn.', kind: 'saved', rail: ['xl', 'py', 'snap', 'ui'], src: ['model_assumptions'], cards: [madeNote('model_assumptions')] });
  const runFact = (id, label, key) => {
    const pick = fundPick(id);
    if (!pick.row) return ex({ what: 'This mix of money has no saved run, so no result is shown. Results are never interpolated.', rail: ['ui'] });
    const count = Math.round(num(pick[key]) * num(A.mcPaths));
    const grid = pick.queryId === 'rq2_fund_grid';
    const rows = grid ? [['Case', id], ['Months', S.horizon], ['BSL', fx(bslNow(), 0)], ['Savings share', pct(S.capture, 0)], ['Starting money', fx(S.governmentSeed, 0)], ['Whole period', pct(pick.solvency, 2)], ['First 6 months', pct(pick.survival6m, 2)]]
      : [['Case', pick.row.Scenario], ['Whole period', pct(pick.row.solvency_prob, 2)], ['First 6 months', pct(pick.row.p6_months, 2)]];
    return ex({ what: `${label}. It is a count: the fund stayed above zero in ${count.toLocaleString('en-MY')} of the ${num(A.mcPaths).toLocaleString('en-MY')} simulated price paths, all on B20. Your choices only pick this saved run; nothing reruns here.`, kind: 'saved', rail: ['xl', 'py', 'snap', 'js', 'ui'], src: [pick.queryId], cards: [
      calc(label, [term('Paths that lasted', count.toLocaleString('en-MY'), pick.queryId), term('All paths', num(A.mcPaths).toLocaleString('en-MY'), 'MODEL SETTINGS C8')], ['÷'], term(label, pct(pick[key], 1), `${periodLabel(S.horizon)} · ${scenarioName(id)}`, 'res')),
      table(`Saved run · ${pick.queryId}`, ['Column', 'Value'], rows.map(([a, b]) => [e(a), e(b)])), madeNote(pick.queryId)] });
  };
  const statFact = (c, what, column) => ex({ what, kind: 'saved', rail: ['xl', 'py', 'snap', 'ui'], src: [c.e.queryId], cards: [table(`Saved run · ${c.e.queryId}`, ['Column', 'Value'], Object.entries(c.e.row ?? {}).map(([a, b]) => [e(a), e(typeof b === 'number' ? fx(b, Math.abs(b) < 2 ? 4 : 1) : b)]), Object.keys(c.e.row ?? {}).indexOf(column)), madeNote(c.e.queryId)] });
  const MX_WORDS = { mean: 'For each of the 2,000 price paths, the support paid in all 60 months is added up. The totals are then averaged.', p95: '95% of the paths cost less than this. It is the bad-case cost.', sigma: 'The standard deviation of the 2,000 path costs: how widely they spread.', end: 'The middle fund balance after month 60, across the 2,000 paths.', cpo: 'The biodiesel tonnes used over the 5 years, averaged over the paths.', switches: 'How often the blend changes on a path, averaged over the paths and divided by 5 years.', brent: 'The average Brent price over all months of all paths.' };
  const MX_COL = { mean: 'Net fiscal cost 5y (RM mn, mean)', p95: 'Net fiscal cost 5y (RM mn, p95)', sigma: 'Fiscal cost sigma (RM mn)', end: 'End fund median (RM mn)', cpo: 'CPO absorbed (mn t/5y)', switches: 'Switches per year', brent: 'Brent mean (USD/bbl)' };
  const mxFact = (row, key) => {
    if (!row) return ex({ what: 'This mix has no saved run. It is never replaced by another run.', rail: ['ui'] });
    return ex({ what: MX_WORDS[key], kind: 'saved', rail: ['xl', 'py', 'snap', 'ui'], src: ['rq4_matrix'], cards: [table(`Saved run · ${row.energy} · ${row.geo} · ${row.ceiling}`, ['Result', 'Value'], Object.keys(MX_COL).map(k => [e(MX_COL[k]), fx(row[k], k === 'switches' || k === 'cpo' ? 2 : 1)]), Object.keys(MX_COL).indexOf(key)), madeNote('rq4_matrix')] });
  };
  const beFact = c => {
    const { k, a, b, g } = fitTerms(); const r = rowNow();
    const solved = (c.be.mops - k - b * INGREDIENTS.methanol - g * INGREDIENTS.glycerol) / a;
    const ok = Math.abs(solved - c.be.cpo) < 0.5;
    return ex({ what: `The highest CPO price at which biodiesel still costs no more than diesel, at Brent USD ${c.be.brent}. The cost equation is set equal to the diesel price and solved for CPO. Methanol and glycerol stay at their ${SNAP_MONTH} values.`, kind: 'saved', rail: ['xl', 'py', 'snap', 'ui'], src: ['rq1_breakeven'], cards: [
      ok ? calc('Solve cost = diesel for CPO', [term('Diesel at this Brent', fx(c.be.mops, 1), 'rq1_breakeven'), term('constant', k.toFixed(4), 'fitted'), term(`${b.toFixed(4)} × methanol`, fx(INGREDIENTS.methanol, 2), `Excel E${r}`), term(`${Math.abs(g).toFixed(4)} × glycerol`, fx(INGREDIENTS.glycerol, 2), `Excel F${r}`)], ['−', '−', '+'], term(`then ÷ ${a.toFixed(4)}, the CPO coefficient`, rmT(c.be.cpo, 1), 'rq1_apm_bio.py', 'res')) : null, madeNote('rq1_breakeven')] });
  };
  const wplFact = (zone, c) => {
    const w = zone === 'Pen' ? c.wPen : c.wEast; const t = zone === 'Pen' ? WPL.WPL_THRESHOLD_PEN_RM_T : WPL.WPL_THRESHOLD_EAST_RM_T;
    return ex({ what: 'A baseline reference only, never a recommended source. The excess is the CPO price above the threshold, per tonne of FFB-equivalent. It is not added to the fund.', rail: ['xl', 'snap', 'js', 'ui'], src: ['rq3_wpl'], cards: [
      calc('WPL', [term('CPO price', rmT(S.wplCpo, 1), 'slider'), term('Threshold', rmT(t), 'WPL SETTINGS')], ['−'], term('Excess', rmT(w.excess, 2), 'model.js · wplImpact', 'res'), `${fx(w.excess, 2)} × ${fx(S.wplRate, 1)}% = ${fx(w.selected, 2)}\n${fx(w.excess, 2)} × ${fx(num(WPL.WPL_BASELINE_RATE) * 100, 1)}% = ${fx(w.baseline, 2)} at baseline`)] });
  };
  const gapStats = () => { const g = MONTHLY.map(r => num(r.viabilityGapRmT)); return { g, positive: g.filter(v => v > 0).length, deep: g.filter(v => v < num(A.b15GapFloor)).length, lo: Math.min(...g), hi: Math.max(...g) }; };
  const monthFact = (row, col, what) => {
    const rec = MONTH_ROWS.find(m => m.p === row.period);
    return ex({ what, kind: 'workbook', rail: ['xl', 'snap', 'ui'], src: ['rq1_monthly'], cards: rec ? [sheet([col], [rec.row - 1, rec.row, rec.row + 1], [`${col}${rec.row}`])] : [] });
  };
  const fitPart = (label, coefText, input, from, val) => ex({ what: `One term of the fitted cost equation: ${label}.`, rail: ['py', 'snap', 'js', 'ui'], src: ['rq1_coefficients'], cards: [
    calc(label, [term('Coefficient', coefText, 'rq1_coefficients'), term('Price', fx(input, 2), from)], ['×'], term(label, val, 'app.js', 'res'))] });

  /* Every live or derived number on the page, with the ways it can be written. */
  const mf = v => {
    const n = num(v), out = [];
    for (const d of [0, 1, 2]) { out.push(rm(n, d), rmT(n, d), rmMn(n, d), rm(Math.abs(n), d), rmT(Math.abs(n), d), rmMn(Math.abs(n), d)); if (d || Math.abs(n) >= 100) out.push(fx(n, d)); }
    out.push(signedRmT(n), fx(n, 4));
    return out;
  };
  const x_step = c => c.__step ?? S.step[S.tab];
  function facts(c) {
    const F = []; const add = (id, forms, make, opt = {}) => F.push({ id, forms: forms.map(canon), make, ...opt });
    add('mops', mf(S.mops), () => mopsFact(S.mops), { out: ['mops', 'mopsSub'] });
    add('mopsDec', mf(c.dc.mops), () => mopsFact(c.dc.mops, Object.hasOwn(S.dec, 'mops')), { tabs: ['decision'] });
    add('pme', mf(c.pme), () => pmeFact(c, c.pme), { out: ['pme', 'pmeSource'] });
    add('pmeDec', mf(c.dc.pme), () => pmeFact(c, c.dc.pme, Object.hasOwn(S.dec, 'pme')), { tabs: ['decision'] });
    add('pmeSnap', mf(DEFAULTS.pme), () => pmeFact(c, DEFAULTS.pme));
    add('mopsSnap', mf(DEFAULTS.mops), () => mopsFact(DEFAULTS.mops));
    add('gap', mf(c.p.gap), () => gapFact(S.mops, c.pme, c.p.gap), { out: ['gap', 'gapShort', 'gapSentence'] });
    add('gapDec', mf(c.dp.gap), () => gapFact(c.dc.mops, c.dc.pme, c.dp.gap), { out: ['dGap', 'dGapShort'], tabs: ['decision'] });
    add('fitTotal', mf(fittedPme(COEF, { cpoLag: S.cpoLag, methanol: S.methanol, glycerol: S.glycerol })), fittedFact, { out: ['fitTotal'] });
    add('fitConst', [rmT(coef('const'), 2), coef('const').toFixed(4)], () => fitPart('the constant', coef('const').toFixed(4), 1, 'fixed', rmT(coef('const'), 2)), { out: ['fitConst'] });
    add('fitCpo', mf(coef('cpo_lag1') * S.cpoLag), () => fitPart('CPO term', coef('cpo_lag1').toFixed(4), S.cpoLag, isDefault('cpoLag') ? `Excel D${rowNow() - 1}` : 'your slider', rmT(coef('cpo_lag1') * S.cpoLag, 2)), { out: ['fitCpo'] });
    add('fitMeoh', mf(coef('meoh_rm') * S.methanol), () => fitPart('methanol term', coef('meoh_rm').toFixed(4), S.methanol, isDefault('methanol') ? `Excel E${rowNow()}` : 'your slider', rmT(coef('meoh_rm') * S.methanol, 2)), { out: ['fitMeoh'] });
    add('fitGly', mf(coef('gly_rm') * S.glycerol), () => fitPart('glycerol term', coef('gly_rm').toFixed(4), S.glycerol, isDefault('glycerol') ? `Excel F${rowNow()}` : 'your slider', signedRmT(coef('gly_rm') * S.glycerol)), { out: ['fitGly'] });
    const fit = fittedPme(COEF, { cpoLag: S.cpoLag, methanol: S.methanol, glycerol: S.glycerol });
    add('fitResid', [signedRmT(DEFAULTS.pme - fit)], () => ex({ what: 'The master-series cost minus the fitted cost. The equation predicts the cost series; it does not copy it.', rail: ['js', 'ui'], cards: [calc('Residual', [term('Master-series PME', rmT(DEFAULTS.pme, 2), `Excel I${rowNow()}`), term('Fitted PME', rmT(fit, 2), 'model.js · fittedPme')], ['−'], term('Residual', signedRmT(DEFAULTS.pme - fit), 'app.js', 'res'))] }));
    add('diagFit', mf(diag('Fitted')), () => ex({ what: 'The fitted cost with unrounded coefficients, saved by the Python model. The small difference from the live sum is coefficient rounding.', kind: 'saved', rail: ['xl', 'py', 'snap', 'ui'], src: ['rq1_apmbio_diagnostic'], cards: [madeNote('rq1_apmbio_diagnostic')] }));
    add('slCpo', mf(S.cpoLag), () => ex({ kind: isDefault('cpoLag') ? 'workbook' : 'setting', what: isDefault('cpoLag') ? `Last month's CPO price, cell D${rowNow() - 1} of the master workbook.` : 'The CPO price you entered.', rail: isDefault('cpoLag') ? ['xl', 'ui'] : ['ui'], cards: [sheet(['D'], PRICE_ROWS(), [`D${rowNow() - 1}`])] }));
    add('slMeoh', mf(S.methanol), () => ex({ kind: isDefault('methanol') ? 'workbook' : 'setting', what: isDefault('methanol') ? `Methanol cost for ${SNAP_MONTH}, cell E${rowNow()} of the master workbook.` : 'The methanol price you entered.', rail: isDefault('methanol') ? ['xl', 'ui'] : ['ui'], cards: [sheet(['E'], PRICE_ROWS(), [`E${rowNow()}`])] }));
    add('slGly', mf(S.glycerol), () => ex({ kind: isDefault('glycerol') ? 'workbook' : 'setting', what: isDefault('glycerol') ? `Crude glycerine price for ${SNAP_MONTH}, cell F${rowNow()} of the master workbook.` : 'The glycerol price you entered.', rail: isDefault('glycerol') ? ['xl', 'ui'] : ['ui'], cards: [sheet(['F'], PRICE_ROWS(), [`F${rowNow()}`])] }));
    add('latestCpo', mf(LATEST_CPO), () => ex({ kind: 'workbook', what: `The real CPO price in ${SNAP_MONTH}, cell D${rowNow()} of the master workbook.`, rail: ['xl', 'snap', 'ui'], src: ['rq1_monthly'], cards: [sheet(['D'], PRICE_ROWS(), [`D${rowNow()}`])] }));
    add('beCpo', mf(c.be.cpo), () => beFact(c), { out: ['beCpo'] });
    add('beMops', mf(c.be.mops), () => ex({ what: `A straight line fitted to all ${MONTHLY.length} months turns Brent into a diesel price. At USD ${c.be.brent} it gives this value.`, kind: 'saved', rail: ['xl', 'py', 'snap', 'ui'], src: ['rq1_breakeven'], cards: [madeNote('rq1_breakeven')] }));
    add('beDiff', mf(Math.abs(c.be.cpo - LATEST_CPO)), () => ex({ what: `The break-even price compared with the real ${SNAP_MONTH} CPO price.`, rail: ['xl', 'py', 'snap', 'js', 'ui'], src: ['rq1_breakeven'], cards: [calc('Compare with CPO', [term('CPO now', rmT(LATEST_CPO, 1), `Excel D${rowNow()}`), term('Break-even CPO', rmT(c.be.cpo, 1), 'rq1_breakeven')], ['−'], term('Difference', rm(Math.abs(LATEST_CPO - c.be.cpo), 1), 'app.js', 'res', LATEST_CPO <= c.be.cpo ? 'good' : 'bad'))] }), { out: ['beWord'] });
    add('brentChip', BREAK_EVEN.flatMap(b => [`USD ${b.brent}`, `USD ${b.brent}/bbl`]), () => ex({ what: 'A Brent price in the saved break-even grid. It picks a row; it does not rerun the model.', kind: 'choice', rail: ['py', 'snap', 'ui'], src: ['rq1_breakeven'], cards: [madeNote('rq1_breakeven')] }), { when: () => S.tab === 'obj1' });
    add('bsl', mf(c.f.bslRevenue), () => bslFact(c), { out: ['bslRevenue', 'stackBslT', 'legBsl'] });
    add('bslDec', mf(c.df.bslRevenue), () => bslFact(c, c.df, c.dc.bslRate), { out: ['dBsl'], tabs: ['decision'] });
    add('prod', [`${c.f.productionMt.toFixed(3)} mn t`, `${num(c.f.productionMt).toFixed(6)} mn t`], () => productionFact(c), { out: ['production', 'eqProd'] });
    add('prodBase', [`${num(A.annualCpoProductionMt).toFixed(3)} mn t`, `${num(A.annualCpoProductionMt).toFixed(6)} mn t`], () => productionFact(c));
    add('prodPct', [`${S.productionPct}%`], () => ex({ what: 'The share of base production on the slider. It changes the sums on the money pages only; the saved fund runs stay on base production.', kind: 'setting', rail: ['ui'] }), { tabs: ['obj2', 'decision'], when: x => /production|of base/i.test(`${x.label} ${x.near}`) });
    add('sav', mf(c.f.paidSavings), () => savingsFact(c), { out: ['paidSavings', 'stackSavT', 'legSav'] });
    add('savDec', mf(c.df.paidSavings), () => savingsFact(c, c.df, c.dc.capture), { out: ['dSav'], tabs: ['decision'] });
    add('savAll', mf(SAVINGS_ANNUAL), savingsAnnualFact);
    add('export', mf(FIXED_EXPORT), exportFact, { out: ['stackExpT', 'legExp'] });
    add('prodTax', mf(fixedNow(S) - FIXED_EXPORT), () => prodTaxFact(c), { out: ['stackProdT', 'legProd', 'prodYearT'], when: x => /Production tax/.test(`${x.label} ${x.near}`) });
    add('moneyYear', mf(fixedNow(S) + c.f.fundingEstimate), () => moneyFact(c, false), { out: ['moneyYear', 'moneyYearT'] });
    add('moneyDec', mf(fixedNow(c.dc) + c.df.fundingEstimate), () => decMoneyFact(c), { out: ['dFunding'], tabs: ['decision'] });
    add('combined', mf(fixedNow(S) + c.f.withStartingMoney), () => moneyFact(c, true), { out: ['combined'] });
    add('seed', mf(S.governmentSeed), () => seedFact(S.governmentSeed), { out: ['legSeedShort', 'stackSeedT', 'legSeed', 'combinedSub'] });
    add('seedDefault', mf(A.seedCapitalRmMn), () => seedFact(num(A.seedCapitalRmMn)));
    add('seedDec', mf(c.dc.governmentSeed), () => seedFact(c.dc.governmentSeed), { out: ['dSeed'], tabs: ['decision'] });
    add('rate', [rmT(S.bslRate), rm(S.bslRate), fx(S.bslRate, 0)], () => rateFact(S.bslRate), { out: ['eqRate'] });
    add('rateDec', [rmT(c.dc.bslRate)], () => rateFact(c.dc.bslRate), { tabs: ['decision'] });
    add('share', [pct(S.capture, 0)], () => shareFact(S.capture), { out: ['eqShare', 'savingsSub'] });
    add('shareDec', [pct(c.dc.capture, 0)], () => shareFact(c.dc.capture), { tabs: ['decision'] });
    add('fixedRate', [rmT(FIXED_RATE)], () => ex({ what: 'A placeholder rate for the export-point levy and the production tax, set in v3_config.py. It is not the actual rate.', kind: 'fixed', rail: ['py', 'snap', 'ui'], src: ['rq3_financing'], cards: [madeNote('rq3_financing')] }), { when: x => /placeholder/i.test(x.near) });
    add('fund', mf(S.fund), () => fundFact(S.fund), { out: ['fundT'] });
    add('fundDec', mf(c.dc.fund), () => fundFact(num(c.dc.fund), Object.hasOwn(S.dec, 'fund')), { out: ['dFund', 'dFundShort'], tabs: ['decision'] });
    add('limit', [...mf(FUND_LIMIT)], limitFact);
    add('multiple', [String(num(A.fundSafetyMultiple))], limitFact, { when: x => x.el.closest?.('.code, .out-sub') });
    add('drawdown', [...mf(A.rolling12AvgB20DrawdownRmMn)], drawdownFact);
    for (const id of SCENARIOS) {
      const p = fundPick(id);
      if (p.row) {
        add(`run_${id}`, [pct(p.solvency, 1), pct(p.solvency, 2)], () => runFact(id, 'Lasts the whole period', 'solvency'), { out: [`mcv_${id}`], scoped: true });
        add(`six_${id}`, [pct(p.survival6m, 1), pct(p.survival6m, 2)], () => runFact(id, 'Lasts the first 6 months', 'survival6m'), { out: [`m6v_${id}`], scoped: true });
      }
    }
    add('s6', [], () => runFact(S.scenario, 'Lasts the first 6 months', 'survival6m'), { out: ['s6'] });
    add('sol', [], () => runFact(S.scenario, 'Lasts the whole period', 'solvency'), { out: ['sol', 'rq2Short'] });
    if (c.e.row) {
      if (fullStats(c)) {
        add('var', [], () => statFact(c, 'The cut-off: 95% of the simulated paths need no more total support than this over the period.', 'var95_rm_m'), { out: ['stVar'] });
        add('cvar', [], () => statFact(c, 'The average total support in the paths at or beyond that 95% cut-off.', 'cvar95_rm_m'), { out: ['stCvar'] });
        add('med', [], () => statFact(c, 'The middle final balance across all simulated paths.', 'median_end'), { out: ['stMed'] });
      }
    }
    for (const [name, row] of [['', c.m], ['cmp20_', c.mB20], ['cmp30_', c.mB30]]) {
      if (!row) continue;
      const outs = k => (name ? [`${name}${k}`] : { mean: ['mMean'], p95: ['mP95'], end: ['mEnd'], cpo: ['mCpo'], switches: ['mSwitch'], brent: ['mBrent'], sigma: ['mSigma'] }[k] ?? []);
      for (const k of Object.keys(MX_COL)) add(`mx${name}${k}`, [], () => mxFact(row, k), { out: outs(k) });
    }
    for (const [zone, w] of [['Pen', c.wPen], ['East', c.wEast]]) {
      add(`wpl${zone}`, [], () => wplFact(zone, c), { out: [`w${zone}Sel`, `w${zone}Ex`, `w${zone}Base`] });
    }
    add('wplPen', [rm(WPL.WPL_THRESHOLD_PEN_RM_T)], () => wplFact('Pen', c));
    add('wplEast', [rm(WPL.WPL_THRESHOLD_EAST_RM_T)], () => wplFact('East', c));
    add('wplAlloc', [rmMn(WPL.WPL_BSF_ALLOCATION ?? 0)], () => ex({ what: 'WPL is a baseline reference only, so none of it is allocated to the fund.', kind: 'saved', rail: ['xl', 'snap', 'ui'], src: ['rq3_wpl'], cards: [madeNote('rq3_wpl')] }));
    add('slWplRate', [`${num(S.wplRate).toFixed(1)}%`], () => ex({ what: 'The WPL rate on the slider. It starts at the saved scenario rate in the WPL SETTINGS sheet.', kind: 'fixed', rail: ['xl', 'snap', 'ui'], src: ['rq3_wpl'], cards: [madeNote('rq3_wpl')] }));
    add('slWplCpo', mf(S.wplCpo), () => ex({ what: 'The CPO price used for the WPL reference. It starts at the saved scenario price.', kind: 'fixed', rail: ['xl', 'snap', 'ui'], src: ['rq3_wpl'], cards: [madeNote('rq3_wpl')] }));
    // Result words: every Pass, Fail and blend on the page has its reason too
    const isDec = S.tab === 'decision';
    const pol = isDec ? c.dp : c.p, gapNow = pol.gap, fundNow = isDec ? num(c.dc.fund) : S.fund, authNow = isDec ? Boolean(c.dc.b30Auth) : S.b30Auth;
    const priceWhy = () => ex({ what: `Check 1 of 3. The viability gap must be above ${rmT(A.b30GapThreshold)} for B30. It is ${signedRmT(gapNow)}, so this check ${pol.pricePass ? 'passes' : 'fails'}. Equal to the limit is not a pass.`, rail: ['js', 'ui'], src: ['model_assumptions'], cards: [calc('Check 1 · viability gap', [term('Viability gap', signedRmT(gapNow), 'diesel − biodiesel'), term('Limit', rmT(A.b30GapThreshold), 'MODEL SETTINGS C13')], ['must be above'], term(pol.pricePass ? 'Pass' : 'Fail', pol.pricePass ? 'Above the limit' : 'Not above the limit', 'model.js · policyState', 'res', pol.pricePass ? 'good' : 'bad'))] });
    const fundWhy = () => fundFact(fundNow, isDec && Object.hasOwn(S.dec, 'fund'));
    const authWhy = () => ex({ what: `Check 3 of 3. A government decision, so the snapshot keeps it off. This switch only tests the rule. It is ${authNow ? 'on' : 'off'} now.`, rail: ['snap', 'ui'], src: ['decision_snapshot'] });
    const ruleWhy = () => { const m = pol.mandate; return ex({ what: `The rule gives ${m}.`, lines: [
        { say: `The rule gives ${m}, from three checks. The viability gap is ${pol.pricePass ? 'above' : 'not above'} its limit, the fund is ${pol.fundSafe ? 'above' : 'not above'} its limit, and B30 approval is ${authNow ? 'on' : 'off'}.`, card: 0, rail: ['js', 'ui'] },
        { say: `B30 needs all three checks to pass. B15 applies only if the gap is below ${rmT(A.b15GapFloor)} and the fund is not safe, and it is a proposed safeguard only. Anything else stays at B20.`, card: 1, rail: ['js', 'ui'] }],
      rail: ['xl', 'py', 'snap', 'js', 'ui'], src: ['model_assumptions'], cards: [
        table('The three checks', ['Check', 'Now', 'Result'], [['Viability gap', signedRmT(gapNow), pol.pricePass ? 'Pass' : 'Fail'], ['Fund balance', rmMn(fundNow), pol.fundSafe ? 'Pass' : 'Fail'], ['B30 approval', authNow ? 'On' : 'Off', authNow ? 'Pass' : 'Fail']]),
        table('The rule, in order', ['If', 'Then'], [['All three checks pass', 'B30'], [`Gap below ${rmT(A.b15GapFloor)} and fund not safe`, 'B15 (proposed safeguard only)'], ['Otherwise', 'B20']], ['B30', 'B15', 'B20'].indexOf(m))] }); };
    const gapWhy = () => gapFact(isDec ? c.dc.mops : S.mops, isDec ? c.dc.pme : c.pme, gapNow);
    const headWhy = () => { const p6 = num(c.e.survival6m), so = num(c.e.solvency); return ex({ what: !c.e.row ? 'This mix of money has no saved run, so there is no answer.' : `The studio's rule: lasting the first 6 months needs 90%, and lasting the whole ${periodLabel(S.horizon)} needs ${pct(A.solvencyTarget, 0)}. A pass means the fund lasts on B20. It is not a move to B30.`, kind: 'saved', rail: ['xl', 'py', 'snap', 'js', 'ui'], src: c.e.queryId ? [c.e.queryId] : [], cards: c.e.row ? [table('The two tests', ['Test', 'Result', 'Target', ''], [['First 6 months', pct(p6, 1), '90%', p6 >= 0.9 ? 'Pass' : 'Fail'], [`Whole ${periodLabel(S.horizon)}`, pct(so, 1), pct(A.solvencyTarget, 0), so >= num(A.solvencyTarget) ? 'Pass' : 'Fail']])] : [] }); };
    add('wPrice', [], priceWhy, { out: ['priceWord', 'dPriceWord'] });
    add('wFund', [], fundWhy, { out: ['fundWord', 'dFundWord'] });
    add('wAuth', [], authWhy, { out: ['approvalWord', 'dApprovalWord'] });
    add('wRule', [], ruleWhy, { out: ['mandate', 'dMandate', 'mandateTag', 'dMandateTag', 'reason', 'dReason'] });
    add('wGap', [], gapWhy, { out: ['gapWord'] });
    add('wHead', [], headWhy, { out: ['rq2Head'] });
    add('wS6', [], () => runFact(S.scenario, 'Lasts the first 6 months', 'survival6m'), { out: ['s6word'] });
    add('wSol', [], () => runFact(S.scenario, 'Lasts the whole period', 'solvency'), { out: ['solword'] });
    add('wStep', [], () => { const short = tabById(S.tab).steps[x_step(c)]?.short ?? ''; const f = /viability gap/.test(short) ? gapWhy : /fund balance|check the fund/.test(short) ? fundWhy : /approval/.test(short) ? authWhy : /apply the rule|decide the blend/.test(short) ? ruleWhy : null; return f ? f() : ex({ what: `The short answer of this step: ${short}.`, kind: 'saved', rail: ['ui'] }); }, { out: ['__chip'] });
    // Counts and summaries the studio works out from saved rows
    const gs = gapStats();
    const countFact = (what, query) => () => ex({ what, kind: 'saved', rail: stationsOf(query), src: [query], cards: [madeNote(query)] });
    add('gapPos', [String(gs.positive), String(gs.g.length)], countFact(`Counted in the studio from rq1_monthly: ${gs.positive} of the ${gs.g.length} months have a positive viability gap.`, 'rq1_monthly'), { when: x => /Months with savings/.test(x.label) });
    add('gapDeep', [`${gs.deep} months`], countFact(`Counted in the studio from rq1_monthly: ${gs.deep} months have a gap below the B15 floor of ${rmT(A.b15GapFloor)}.`, 'rq1_monthly'), { when: x => /B15 floor/.test(x.label) });
    const loRow = MONTHLY.find(r => num(r.viabilityGapRmT) === gs.lo), hiRow = MONTHLY.find(r => num(r.viabilityGapRmT) === gs.hi);
    add('gapLo', [signedRmT(gs.lo)], () => monthFact(loRow, 'J', `The lowest viability gap in column J: ${monthLabel(loRow.period)}.`));
    add('gapHi', [signedRmT(gs.hi)], () => monthFact(hiRow, 'J', `The highest viability gap in column J: ${monthLabel(hiRow.period)}.`));
    add('joh', [String(JOH_REJ), String(JOH0.length)], countFact(`Counted in the studio from rq1_johansen: rank zero is rejected at ${JOH_REJ} of the ${JOH0.length} lag settings.`, 'rq1_johansen'), { when: x => /reject|Rank zero|lag settings/i.test(`${x.near} ${x.label}`) });
    add('johRank', [String(RANK_COUNT(1)), String(RANK_COUNT(2))], countFact('Counted in the studio from rq1_johansen: lag settings by selected rank.', 'rq1_johansen'), { when: x => /^Rank/.test(x.label) });
    add('johLags', [String(Math.min(...JOH.map(r => num(r.kArDiff)))), String(Math.max(...JOH.map(r => num(r.kArDiff))))], countFact('The lowest and highest lag settings saved in rq1_johansen.', 'rq1_johansen'), { when: x => /Lags tested/.test(x.label) });
    add('short', [String(SHORT_PASS), String(SHORT.length)], countFact(`Counted in the studio from rq2_scenarios_9m: ${SHORT_PASS} of ${SHORT.length} nine-month cases meet the 90% six-month target.`, 'rq2_scenarios_9m'), { when: x => /nine-month|six-month/i.test(x.near) });
    add('shortMin', [pct(SHORT_MIN)], countFact('The lowest six-month result across the nine-month cases, rq2_scenarios_9m.', 'rq2_scenarios_9m'));
    add('longMax', [pct(LONG_MAX)], countFact('The highest five-year result across the cases, rq2_scenarios_60m.', 'rq2_scenarios_60m'));
    add('fivePass', [String(fiveYearPasses), String(LONG.length), `${LONG.length} cases`], countFact(`Counted in the studio from rq2_scenarios_60m: ${fiveYearPasses} of ${LONG.length} cases last 5 years in at least ${pct(A.solvencyTarget, 0)} of paths.`, 'rq2_scenarios_60m'), { when: x => /cases|Five-year|survival/i.test(x.near) });
    add('checks', [], () => ex({ what: 'The rule\'s three checks: the viability gap, the fund balance and B30 approval. B30 needs all three.', rail: ['js', 'ui'], cards: [table('The three checks', ['Check', 'Result'], [['Viability gap', c.dp.pricePass ? 'Pass' : 'Fail'], ['Fund balance', c.dp.fundSafe ? 'Pass' : 'Fail'], ['B30 approval', c.dc.b30Auth ? 'On' : 'Off']])] }), { out: ['dChecks'] });
    add('seedMax', mf(SEED_MAX), () => ex({ what: 'The largest amount the starting-money search tested. It is not a confirmed minimum.', kind: 'saved', rail: ['xl', 'py', 'snap', 'ui'], src: ['rq2_seed'], cards: [madeNote('rq2_seed')] }));
    add('seedDiff', [rmMn(0)], () => ex({ what: 'B30 minus B20 in the starting-money search. Both sit at the largest amount tested, so this zero does not mean B30 needs no extra money.', kind: 'saved', rail: ['py', 'snap', 'js', 'ui'], src: ['rq2_seed'], cards: [calc('B30 minus B20', [term('B30 · low oil', rmMn(SEED_MAX), 'rq2_seed'), term('B20 · low oil', rmMn(SEED_MAX), 'rq2_seed')], ['−'], term('Difference', rmMn(0), 'app.js', 'res'))] }));
    add('seedBn', [`RM ${(SEED_MAX / 1000).toLocaleString('en-MY')}`, `RM ${(SEED_MAX / 1000).toLocaleString('en-MY')} billion`], () => ex({ what: 'The largest amount tested, written in billions.', kind: 'saved', rail: ['snap', 'ui'], src: ['rq2_seed'] }));
    add('red30', [pct(RQ4.reduction_vs_b30, 1), pct(RQ4.reduction_vs_b30)], () => reductionFact('B30', num(RQ4.vol_b30), num(RQ4.reduction_vs_b30)));
    add('red20', [pct(REDUCTION_VS_B20, 1), pct(REDUCTION_VS_B20)], () => reductionFact('B20', num(RQ4.vol_b20), REDUCTION_VS_B20), { when: x => /B20/.test(`${x.near} ${x.label}`) });
    const impact = p => Q.b30_impact.rows.find(r => String(r.dimension).startsWith(p));
    const impactFact = (p, words) => () => { const row = impact(p); return ex({ what: `${words} ${row?.interpretation ?? ''}`, kind: 'saved', rail: ['xl', 'py', 'snap', 'ui'], src: ['b30_impact'], cards: [table('Saved row · b30_impact', ['Column', 'Saved value'], Object.entries(row ?? {}).map(([a, b]) => [e(a), e(fmtCell(b))]), Object.keys(row ?? {}).indexOf('value')), twelve('Q', `Diesel use · ${PROD_PERIOD}`), madeNote('b30_impact')] }); };
    add('impCpo', [`${num(impact('Industry')?.value).toFixed(2)} mn t`], impactFact('Industry', 'The extra 10% of blend on the average diesel use in column Q, times 12 months, in tonnes.'));
    add('impOps', [`${num(impact('Operations')?.value).toFixed(2)}×`], impactFact('Operations', 'The B30 tonnes divided by the biodiesel output over the last 12 months, column M.'));
    add('impGreen', [`${num(impact('Green')?.value).toFixed(2)} bn L`], impactFact('Green', 'The average diesel use in column Q, times 12 months, times the extra 10% of blend.'));
    add('beGridDiff', BREAK_EVEN.map(b => fx(b.cpo - b.mops, 1)), () => { const b = BREAK_EVEN.find(r => canon(fx(r.cpo - r.mops, 1)) === canon(c.__token)); return ex({ what: 'Break-even CPO minus diesel at this Brent, worked out in the studio. It is the distance between the two lines, not the live viability gap.', kind: 'saved', rail: ['py', 'snap', 'js', 'ui'], src: ['rq1_breakeven'], cards: b ? [calc(`At Brent USD ${b.brent}`, [term('Break-even CPO', fx(b.cpo, 1), 'rq1_breakeven'), term('Diesel (MOPS)', fx(b.mops, 1), 'rq1_breakeven')], ['−'], term('Difference', fx(b.cpo - b.mops, 1), 'app.js', 'res'))] : [] }); });
    // Named constants
    const K = (id, forms, what, opt = {}) => add(id, forms, () => ex({ kind: 'fixed', what, rail: opt.rail ?? ['snap', 'ui'], src: opt.src ?? [], cards: opt.cards ?? [] }), opt);
    K('prodRange', ['90%', '110%'], 'The tested range for CPO production: the 10% band around base production in the saved levy grid.', { rail: ['py', 'snap', 'ui'], src: ['rq3_bsl'], when: x => /Tested range/.test(x.label) });
    K('t90', ['90%'], 'The six-month target. It comes from H2 in the accepted proposal: the fund must sustain deficits for at least 6 months under the 90th percentile Monte Carlo shock.', { rail: ['ui'], when: x => !/Tested range/.test(x.label) });
    K('q95', ['95%'], 'A fixed level in the tail results and the coefficient table: the 95th percentile, or a 95% confidence interval.', { rail: ['py', 'ui'] });
    K('worst5', ['5%'], 'The worst 5% of simulated paths: those at or beyond the 95th percentile cut-off.', { rail: ['py', 'ui'], when: x => /worst/.test(`${x.near} ${x.label}`) });
    K('t85', [pct(A.solvencyTarget, 0)], 'The full-period target, saved as solvencyTarget. The accepted proposal asks that the fund stays above zero in at least this share of simulations. The proposal gives no formula; it is a policy choice.', { src: ['model_assumptions'], rail: ['py', 'snap', 'ui'] });
    K('t25', ['25%'], 'The H4 target in the accepted proposal: the rule should cut cost swings by at least 25%.', { rail: ['ui'], when: x => /target|H4|at least 25%/.test(x.near) });
    K('crit5', ['5%'], 'The Johansen test\'s 5% significance level. The trace statistic must exceed its critical value to reject rank zero.', { src: ['rq1_johansen'], when: x => /critical|Trace|crit/i.test(`${x.near} ${x.label}`) });
    K('concern5', ['5%'], 'The studio\'s line for a competitive concern: a levy that takes more than 5% of the producer margin.', { src: ['rq3_competitiveness'], when: x => /concern/i.test(x.near) });
    K('crit', [fx(JOH0[0].critical5Pct, 2)], 'The 5% critical value of the Johansen trace test at rank zero.', { src: ['rq1_johansen'], rail: ['py', 'snap', 'ui'] });
    K('line500', ['RM 500 mn', rmMn(500)], 'The yearly support line in the proposal. The levy grid marks the cells that reach it.', { rail: ['ui'] });
    K('thresh', [rmT(A.b30GapThreshold), String(num(A.b30GapThreshold))], 'The B30 check: the viability gap must be above this, saved as b30GapThreshold and recorded in MODEL SETTINGS cell C13.', { src: ['model_assumptions'], rail: ['xl', 'py', 'snap', 'ui'], cards: [settingCell('MODEL SETTINGS', 'C13', 'B30 gap threshold', 'The record of the reviewed settings')].filter(Boolean), when: x => /VG|gap/i.test(`${x.near} ${x.label}`) });
    K('never0', ['RM 0'], 'A missing WPL value stays “not estimated”. It is never shown as zero, because the master holds no WPL revenue series.', { rail: ['ui'], when: x => /never RM 0/.test(x.near) });
    K('floor', [rmT(A.b15GapFloor), String(num(A.b15GapFloor))], 'The B15 floor, saved as b15GapFloor and recorded in MODEL SETTINGS cell C14. B15 is a proposed safeguard only.', { src: ['model_assumptions'], rail: ['xl', 'py', 'snap', 'ui'], cards: [settingCell('MODEL SETTINGS', 'C14', 'B15 gap floor', 'The record of the reviewed settings')].filter(Boolean) });
    K('paths', [num(A.mcPaths).toLocaleString('en-MY')], 'The number of simulated price paths in each saved run, set in v3_config.py and recorded in MODEL SETTINGS cell C8.', { src: ['model_assumptions'], rail: ['xl', 'py', 'snap', 'ui'], cards: [settingCell('MODEL SETTINGS', 'C8', 'Simulated paths', 'The record of the reviewed settings')].filter(Boolean) });
    K('h9', [`${A.headlineMonths} months`, `${A.headlineMonths}-month`, String(A.headlineMonths)], 'The short test: H2\'s six-month check plus three months. Recorded in MODEL SETTINGS cell C9.', { src: ['model_assumptions'], rail: ['xl', 'py', 'snap', 'ui'], cards: [settingCell('MODEL SETTINGS', 'C9', 'Short test (months)', 'The record of the reviewed settings')].filter(Boolean), when: x => /period|test|Months|Short|months/i.test(`${x.near} ${x.label}`) });
    K('h60', [`${A.robustnessMonths} months`, String(A.robustnessMonths), '5 years', '5-year'], 'The long test, from the Objective 4 horizon in the accepted proposal. Recorded in MODEL SETTINGS cell C10.', { src: ['model_assumptions'], rail: ['xl', 'py', 'snap', 'ui'], cards: [settingCell('MODEL SETTINGS', 'C10', 'Long test (months)', 'The record of the reviewed settings')].filter(Boolean) });
    K('sample', [`${TRACE.rows.length - 1} months`], 'The latest rows of MONTHLY DATA in the master workbook, shown as a sample for checking. The month before supplies the CPO lag.', { rail: ['xl', 'ui'] });
    K('oneX', ['1×'], 'The line where the PME needed equals recent output. Above it, current output is short.', { rail: ['ui'] });
    K('dp', ['2'], 'The fitted equation is shown to two decimal places on screen.', { rail: ['ui'], when: x => /decimal/.test(x.near) });
    K('maxZero', ['0'], 'The balance cannot fall below zero. A month that would end below zero closes at zero, and unpaid support is not carried forward.', { rail: ['py', 'ui'], when: x => /max\(0/.test(x.near) });
    K('rmZero', ['RM 0'], 'The balance cannot fall below zero. A month that would end below zero closes at zero, and unpaid support is not carried forward.', { rail: ['py', 'ui'], when: x => /fall below/.test(x.near) });
    K('six', ['6 months', '6-month'], 'H2\'s six-month survival check in the accepted proposal. It is read from month 6 of the same saved runs.', { rail: ['ui'] });
    K('twelve', ['12 months', '12-month'], `The last 12 rows of the master workbook, ${PROD_PERIOD}. The money and the fund model use the same 12 months.`, { rail: ['xl', 'ui'] });
    K('nineteen', [`${MONTHLY.length}`, `${MONTHLY.length} months`], `The number of months in rq1_monthly: ${MONTHLY[0].period} to ${MONTHLY.at(-1).period}.`, { src: ['rq1_monthly'], rail: ['xl', 'snap', 'ui'], when: x => /month/i.test(x.near) });
    for (const id of SCENARIOS) {
      const s = rq2CaseSettings[id];
      const what = `A setting of case ${id}, ${s.name}, in v3_config.py SCENARIOS. The cases are selected, not forecasts.`;
      K(`case${id}`, [`USD ${s.brentTarget}/bbl`, `USD ${s.brentTarget}`, `${s.volatility.toFixed(2)}×`, ...(s.jump ? [`${s.jump}%`, `+${s.jump}%`] : []), ...(s.dropTo ? [`USD ${s.dropTo}/bbl`, `USD ${s.dropTo}`] : []), ...(s.reversionMonths ? [`${s.reversionMonths} mo`] : []), ...(s.cpoRise ? [`${s.cpoRise > 0 ? '+' : '−'}${Math.abs(s.cpoRise)}%`, `${Math.abs(s.cpoRise)}%`] : [])], what, { rail: ['py', 'js', 'ui'], when: x => S.tab === 'obj3' && (x.label.includes(s.name) || x.near.includes(s.name) || (id === 'E' && /crash/i.test(x.near))) });
    }
    return F;
  }
  const reductionFact = (blend, vol, value) => ex({ what: `How much smaller the rule's monthly cost swing is than fixed ${blend}. In the pipeline the fixed-blend series is the rule's own cost series scaled by the blend ratio.`, kind: 'saved', rail: ['xl', 'py', 'snap', 'js', 'ui'], src: ['rq4_summary'], cards: [
    calc(`Against fixed ${blend}`, [term('1'), term('The rule\'s swing', fx(RQ4.vol_dual, 2), 'rq4_summary'), term(`Fixed ${blend} swing`, fx(vol, 2), 'rq4_summary')], ['−', '÷'], term('Smaller by', pct(value, 1), 'rq4_mandate_rule.py', 'res'))] });

  /* ── Reverse lookup: which saved value is this? ── */
  const leading = cell => {
    if (typeof cell === 'number') return cell;
    if (typeof cell !== 'string' || cell.trim() === '') return NaN;
    const m = cell.trim().match(/^-?[\d,]*\.?\d+(?=\s*[A-Za-z]{0,3}$)/);
    return m ? Number(m[0].replace(/,/g, '')) : NaN;
  };
  const near = (cell, p, col = '') => {
    const n = leading(cell);
    if (Number.isNaN(n)) return false;
    if (p.abs === 0 && p.d === 0) return n === 0;
    if (p.pct) return Math.abs(round(Math.abs(n * 100), p.d) - p.abs) < 1e-9 || (/%|pct|percent/i.test(col) && Math.abs(round(Math.abs(n), p.d) - p.abs) < 1e-9);
    return Math.abs(round(Math.abs(n), p.d) - p.abs) < 1e-9;
  };
  // A price is never read from a count, and a dollar figure never from a ringgit column.
  const colOk = (col, p) => {
    if (p.pct) return true;
    if (p.isUsd) return /USD|Brent/i.test(col);
    if (p.money) return !/month|period|paths|lag|rank|count|USD|Brent|prob|p6_|capture|Coefficient|%/i.test(col);
    if (/bn l|mn t|×|^months?$/.test(p.unit)) return false;
    return true;
  };
  const round = (x, d) => { const f = 10 ** d; return Math.round((x + Number.EPSILON * Math.sign(x)) * f) / f; };
  const fmtCell = v => typeof v === 'number' ? v.toLocaleString('en-MY', { maximumFractionDigits: 6 }) : String(v ?? '');
  function savedRow(id, row, col, p) {
    const entries = Object.entries(row).filter(([, v]) => v !== null && typeof v !== 'object').slice(0, 12);
    const hl = entries.findIndex(([k]) => k === col);
    const cards = [];
    if (id === 'rq1_monthly' && ROW_COL[col] && row.period) {
      const rec = MONTH_ROWS.find(m => m.p === row.period);
      if (rec) cards.push(sheet([ROW_COL[col]], [rec.row - 1, rec.row, rec.row + 1], [`${ROW_COL[col]}${rec.row}`]));
    }
    cards.push(table(`Saved row · ${id}`, ['Column', 'Saved value'], entries.map(([k, v]) => [e(k), e(fmtCell(v))]), hl));
    cards.push(madeNote(id));
    return ex({ what: `Saved value. Column “${col}” of the snapshot table ${id}. ${MADE[id] ?? ''}`, kind: 'saved', rail: stationsOf(id), src: [id], cards });
  }
  const HEADER_COL = { '6 months': /p6|survive/i, 'Full period': /solvency/i, Share: /capture/i, Months: /horizon/i, Trace: /statistic/i, '5% crit.': /critical/i, Lags: /kArDiff/i, Null: /nullRank/i, Rank: /selectedRank/i, Mean: /mean\)/i, P95: /p95/i, 'σ': /sigma/i, 'Sw/yr': /switches/i, 'CPO': /CPO/i, 'End fund': /end fund/i, Brent: /brent/i, 'Coef.': /coefficient/i, p: /p-value/i, '95% CI': /^CI/i, Revenue: /revenue/i, CV: /cv/i, Burden: /burden/i, Rate: /rate/i, 'Amount tested': /F0/i, Levy: /BSL|levy/i, 'Median end': /median_end/i, 'CVaR 95%': /cvar/i, Value: /^value$/i, 'RM/t': /rmTonne/i, 'Money raised': /revenue/i, 'Income swings (CV, lower is steadier)': /cv/i, 'Cost to growers': /burden/i, 'Diesel (MOPS)': /mops/i, 'Break-even CPO': /break-even/i, 'MOPS': /mops/i, 'PME': /pme/i, 'Gap': /viability/i, 'CPO price': /cpo/i };
  const matchCol = (row, p, token, x = {}) => {
    const keys = Object.keys(row);
    const hits = keys.filter(k => colOk(k, p) && near(row[k], p, k));
    const asText = keys.find(k => typeof row[k] === 'string' && x.cellText && canon(row[k]) === canon(x.cellText));
    if (asText) return asText;
    const want = HEADER_COL[x.header] ?? { 'Fixed B20': /b20/i, 'Fixed B30': /b30/i, 'The rule': /dual/i }[x.label];
    if (want) { const k = hits.find(h => want.test(h)); if (k) return k; }
    return hits[0] ?? keys.find(k => typeof row[k] === 'string' && canon(row[k]).includes(canon(token)));
  };
  // Only the table this number sits in: its row, then the tables its card names.
  function rowLookup(p, x) {
    if (x.row) { const col = matchCol(x.row.row, p, x.text, x); if (col) return savedRow(x.row.id, x.row.row, col, p); }
    if (x.rowIdx != null) for (const id of x.queries) {
      const rows = Q[id]?.rows ?? [];
      if (rows.length === x.rowCount && rows[x.rowIdx]) { const col = matchCol(rows[x.rowIdx], p, x.text, x); if (col) return savedRow(id, rows[x.rowIdx], col, p); }
    }
    for (const id of x.queries) for (const row of Q[id]?.rows ?? []) { const col = matchCol(row, p, x.text, x); if (col) return savedRow(id, row, col, p); }
    return null;
  }
  function savedLookup(p, x) {
    const own = rowLookup(p, x);
    if (own) return own;
    // A bare small number could match anything, so it is searched only in the table the card names.
    if (!(p.d > 0 || p.abs >= 100 || p.pct || p.money)) return null;
    for (const id of Object.keys(Q).filter(k => k !== 'rq2_fund_grid' && !x.queries.includes(k))) for (const row of Q[id]?.rows ?? []) { const col = matchCol(row, p, x.text, x); if (col) return savedRow(id, row, col, p); }
    return null;
  }

  /* ── The guide's checked lines ── */
  const WORDS = [[/(\d[\d,.]*) million ringgit/g, 'RM $1 mn'], [/(\d[\d,.]*) ringgit per tonne/g, 'RM $1/t'], [/(\d[\d,.]*) ringgit/g, 'RM $1'], [/(\d[\d,.]*) percent/g, '$1%'], [/(\d[\d,.]*) US dollars a barrel/g, 'USD $1/bbl'], [/(\d[\d,.]*) dollars/g, 'USD $1'], [/(\d[\d,.]*) million tonnes/g, '$1 mn t'], [/(\d[\d,.]*) billion litres/g, '$1 bn L'], [/(\d[\d,.]*) times\b/g, '$1×'], [/(\d+) month\b/g, '$1 months'], [/(\d+) year\b/g, '$1 years']];
  const plain = s => { let t = String(s).replace(/<[^>]+>/g, ' '); for (const [a, b] of WORDS) t = t.replace(a, b); return t; };
  const cardText = c => {
    if (!c) return '';
    const parts = [];
    const walk = v => { if (typeof v === 'string') parts.push(v); else if (Array.isArray(v)) v.forEach(walk); else if (v && typeof v === 'object') Object.entries(v).forEach(([k, x]) => { if (!['type', 'a', 'hl', 'rg', 'cols', 'names', 'tone', 'file', 'start'].includes(k)) walk(x); }); };
    walk(c);
    return plain(parts.join(' \n '));
  };
  const INDEX = new Map();
  const tokenSet = text => new Set(tokensIn(text).map(t => canon(t.text)));
  for (const sc of SCENES) { let held = null; sc.beats.forEach(b => { held = b.shot ?? held; b._shot = held === sc.shot ? null : held; }); }
  for (const sc of SCENES) sc.beats.forEach(b => { b._say = tokenSet(plain(b.say)); b._card = tokenSet(cardText(b.card)); b._res = b.card?.type === 'calc' ? canon(b.card.res?.v ?? '') : ''; });
  const scene = (tab, step) => SCENES.find(s => s.id === `${tab}-${step + 1}`);
  function bestBeat(sc, key) {
    let best = -1, bestScore = 0;
    sc.beats.forEach((b, i) => {
      const inSay = b._say.has(key), inCard = b._card.has(key), isRes = b._res === key;
      if (!inSay && !isRes) return;
      const type = b.card?.type;
      const score = (inSay ? 4 : 0) + (b.spot && inSay ? 1 : 0) + (isRes ? 5 : 0) + (inCard ? 2 : 0) + (type === 'cells' ? 3 : type === 'calc' ? 2 : type ? 1 : 0) - (type === 'code' ? 2 : 0);
      if (score > bestScore) { best = i; bestScore = score; }
    });
    return best;
  }
  function guideHit(sc, key) {
    if (!sc) return null;
    const best = bestBeat(sc, key);
    if (best < 0) return null;
    let first = sc.beats.findIndex(b => b._say.has(key));
    if (first < 0 || best - first > 3 || sc.beats[first]._shot !== sc.beats[best]._shot) first = best;
    const picked = [];
    for (let k = first; k <= best; k++) picked.push(k);
    // The lines that carry on from it: while the spotlight stays on this number, or until the working has been shown.
    const anchor = sc.beats[best].spot;
    const hasWorking = () => picked.some(k => ['cells', 'calc'].includes(sc.beats[k].card?.type));
    for (let k = best + 1; k < sc.beats.length && picked.length < 5; k++) {
      const n = sc.beats[k];
      const sameSpot = Boolean(n.spot && n.spot === anchor);
      if (n._shot !== sc.beats[best]._shot) break;
      if (n.spot && !sameSpot) break;
      if (!n.card && !sameSpot) break;
      if (!sameSpot && !n._say.has(key) && hasWorking()) break;
      picked.push(k);
      if (n.card?.type === 'code') break;
    }
    const links = picked.flatMap(k => sc.beats[k].links ?? []);
    const raw = [];
    picked.forEach(k => { const c = sc.beats[k].card; if (c && !raw.includes(c)) raw.push(c); });
    // A sum that threads back to workbook cells needs that sheet card too: it may have been laid down by an earlier line.
    const missing = links.map(l => l[0]).filter(a => a.startsWith('cell:') || a.startsWith('tot:')).filter(a => !raw.some(c => c.type === 'cells' && hasAnchor(c, a)));
    for (const a of missing) for (let k = first - 1; k >= 0; k--) { const c = sc.beats[k].card; if (c?.type === 'cells' && hasAnchor(c, a)) { if (!raw.includes(c)) raw.unshift(c); break; } }
    const cards = raw.map(c => (c.type === 'cells' ? focusSheet(c, links, key) : c));
    const lines = picked.map(k => { const b = sc.beats[k]; return { say: b.say, card: b.card ? raw.indexOf(b.card) : -1, rail: [...new Set([...(b.rail ?? []), 'ui'])] }; });
    return { kind: 'guide', what: lines.map(l => l.say).join(' '), lines, cards, links, rail: [...new Set(lines.flatMap(l => l.rail))], src: [] };
  }
  function focusSheet(c, links, key) {
    const linked = links.map(l => l[0]).filter(a => a.startsWith('cell:')).map(a => a.slice(5)).filter(ref => c.hl?.includes(ref));
    const p = parseToken(key);
    const byValue = (c.hl ?? []).filter(ref => { const m = ref.match(/^([A-Z]+)(\d+)$/); const row = c.rows.find(r => String(r.r) === m[2]); const v = row?.v[c.cols.indexOf(m[1])]; return p && v != null && near(String(v).replace(/,/g, ''), p); });
    const hl = linked.length ? linked : byValue.length ? byValue : c.hl ?? [];
    const keep = c.cols.filter((col, i) => i === 0 || hl.some(ref => ref.startsWith(col) && /^\d+$/.test(ref.slice(col.length))) || c.total?.cells?.[col] != null || (c.rg ?? []).some(ref => ref.startsWith(col) && /^\d+$/.test(ref.slice(col.length))));
    const useCols = keep.length > 1 ? keep : c.cols;
    const idx = useCols.map(col => c.cols.indexOf(col));
    return { ...c, hl, cols: useCols, names: c.names ? idx.map(i => c.names[i]) : c.names, rows: c.rows.map(r => ({ r: r.r, v: idx.map(i => r.v[i]) })) };
  }
  const hasAnchor = (c, a) => {
    const [kind, ref] = a.split(':');
    if (kind === 'tot') return Boolean(c.total?.cells?.[ref]);
    const m = ref.match(/^([A-Z]+)(\d+)$/);
    return m && c.cols.includes(m[1]) && c.rows.some(r => String(r.r) === m[2]);
  };

  /* ── What is the number called? ── */
  function context(el, text) {
    const q = sel => el.closest?.(sel);
    const txt = (root, sel) => root?.querySelector?.(sel)?.textContent?.trim() ?? '';
    const x = { el, text, near: '', label: '', queries: [], rowIdx: null, rowCount: null, step: S.step[S.tab], out: q('[data-out]')?.dataset?.out };
    if (!parseToken(text) && q('[data-chip]')) x.out = '__chip';
    const card = q('.dcard'); const td = q('td');
    const chip = q('[data-chip]'); if (chip) x.step = Number(chip.dataset.chip);
    if (td) {
      const table = td.closest('table'); const tr = td.closest('tr');
      const th = table.tHead?.rows?.[0]?.cells?.[td.cellIndex]?.textContent?.trim() ?? td.dataset.label ?? '';
      const first = (tr.cells[0]?.querySelector('b')?.textContent ?? tr.cells[0]?.textContent ?? '').trim().split('\n')[0];
      x.label = [first, th].filter(Boolean).join(' · ');
      x.header = (th.split('\n')[0] || '').replace(/\s+[A-Z_]+$/, '').trim() || th; x.cellText = td.textContent.trim();
      if (td.dataset.label) x.header = td.dataset.label;
      const body = table.tBodies[0]; if (body) { x.rowIdx = [...body.rows].indexOf(tr); x.rowCount = body.rows.length; }
    } else if (q('.compare th[scope="row"]')) {
      x.label = txt(q('th'), 'b');
    } else if (q('dd')) x.label = q('dd').parentElement.querySelector('dt')?.textContent?.trim() ?? '';
    else if (q('dt')) x.label = q('dt').textContent.trim();
    else if (q('.kcard')) x.label = txt(q('.kcard'), 'span');
    else if (q('.out')) x.label = txt(q('.out'), '.out-label');
    else if (q('.eq-term')) x.label = txt(q('.eq-term'), 'span');
    else if (q('.gauge')) x.label = q('.gauge-top')?.querySelector('span')?.textContent?.trim() ?? txt(q('.gauge'), '.gauge-top span');
    else if (q('.light')) x.label = txt(q('.light'), 'span');
    else if (q('.build > div')) x.label = txt(q('.build > div'), 'span');
    else if (q('.control')) x.label = txt(q('.control'), 'label');
    else if (q('.vbar')) x.label = txt(q('.vbar'), 'span');
    else if (q('.hb')) x.label = txt(q('.hb'), 'span');
    else if (q('.mini-case')) x.label = txt(q('.mini-case'), 'span');
    else if (q('.sum')) x.label = `${txt(q('.sum'), 'span')} · ${txt(q('.sum'), 'small')}`;
    else if (q('.bc')) { x.label = 'Saved levy grid'; const m = q('.bc').dataset.hl?.match(/_(\d+)$/); const row = m && Q.rq3_bsl.rows[Number(m[1])]; if (row) x.row = { id: 'rq3_bsl', row }; }
    else if (q('.moneyin-row')) x.label = txt(q('.moneyin-row'), 'b');
    else if (q('.cyc')) x.label = txt(q('.cyc'), 'strong');
    else if (q('[data-chip]')) x.label = tabById(S.tab).steps[x.step]?.short ?? '';
    else if (q('.choice')) x.label = q('.choice').querySelector('strong')?.textContent?.trim() ?? '';
    if (!x.label) x.label = card ? txt(card, '.dcard-t b') : tabById(S.tab).steps[S.step[S.tab]]?.short ?? '';
    const fin = q('.compare tbody tr');
    if (fin) { const name = txt(fin, 'th b'); const row = Q.rq3_financing.rows.find(r => String(r.Instrument).startsWith(name)); if (row) x.row = { id: 'rq3_financing', row }; if (!x.queries.length) x.queries.push('rq3_financing'); }
    const para = q('p, li, small, .out-sub, .note, .code, .alert, th, td, dd, dt, em, b, span') ?? el;
    x.near = (para.closest?.('p, li, .out, .kcard, .alert, .hbars, .code, tr, dl > div') ?? para).textContent ?? '';
    if (card) {
      const srcText = txt(card, '.dcard-t code');
      x.queries = String(srcText).split(/\s*·\s*|\s+/).filter(id => Q[id]);
      if (/rq2_scenarios/.test(srcText)) x.queries.push(`rq2_scenarios_${S.horizon}m`, 'rq2_scenarios_9m', 'rq2_scenarios_60m');
      if (/^model_assumptions/.test(srcText) && !x.queries.length) x.queries.push('model_assumptions');
      if (srcText === 'Saved results') x.queries.push(...({ obj1: ['rq1_johansen'], obj2: ['rq3_financing', 'rq3_competitiveness', 'rq3_bsl'], obj3: ['rq2_scenarios_9m', 'rq2_scenarios_60m', 'rq2_seed'], obj4: ['rq4_summary'] }[S.tab] ?? []));
    }
    if (q('#prov')) { const id = $('#prov-body [data-prov-active]')?.dataset.provActive ?? provOpen(); if (id && Q[id]) x.queries.push(id); }
    return x;
  }
  const provOpen = () => { const m = ($('#prov-title')?.textContent ?? '').match(/^\s*(\w+)/); return m && Q[m[1]] ? m[1] : Object.keys(Q).find(id => ($('#prov-body')?.textContent ?? '').includes(id)); };

  // A word in a saved table: Reject or Keep, a blend on the price map, or a text column.
  function wordInTable(token, el, x) {
    if (el.closest('.map .cell')) {
      const m = x.label.match(/RM ([\d,]+) · USD (\d+)/); if (!m) return null;
      const row = Q.rq4_map.rows.find(r => num(r['CPO (RM/t)']) === Number(m[1].replace(/,/g, '')) && num(r['Brent (USD/bbl)']) === Number(m[2])); if (!row) return null;
      return ex({ what: `At CPO ${m[1]} and Brent USD ${m[2]} the viability gap is ${signedRmT(row['VG (RM/t)'])}. This map uses only the viability gap check.`, kind: 'saved', rail: stationsOf('rq4_map'), src: ['rq4_map'], cards: [calc('Viability gap at this point', [term('MOPS diesel', rmT(row['MOPS (RM/t)'], 1), 'rq4_map'), term('PME cost', rmT(row['PME (RM/t)'], 1), 'rq4_map')], ['−'], term(String(row.Mandate), signedRmT(row['VG (RM/t)']), 'rq4_map', 'res', num(row['VG (RM/t)']) > 0 ? 'good' : 'bad')), madeNote('rq4_map')] });
    }
    if (/^(Reject|Keep)$/.test(token) && x.queries.includes('rq1_johansen')) {
      const row = Q.rq1_johansen.rows[x.rowIdx]; if (!row) return null;
      return ex({ what: `The trace statistic must be above the 5% critical value to reject this rank. Here it ${num(row.statistic) > num(row.critical5Pct) ? 'is above, so it rejects' : 'is not above, so it keeps'}.`, kind: 'saved', rail: stationsOf('rq1_johansen'), src: ['rq1_johansen'], cards: [calc(`Lag ${row.kArDiff} · ${row.nullRank}`, [term('Trace statistic', fx(row.statistic, 3), 'rq1_johansen'), term('5% critical value', fx(row.critical5Pct, 3), 'rq1_johansen')], ['must be above'], term(token, row.rejectAt5Pct ? 'Rejected' : 'Kept', 'rq1_johansen', 'res', row.rejectAt5Pct ? 'good' : '')), madeNote('rq1_johansen')] });
    }
    let row = x.row?.row, id = x.row?.id;
    if (!row) for (const q of x.queries) { const rows = Q[q]?.rows ?? []; if (x.rowIdx != null && rows.length === x.rowCount && rows[x.rowIdx]) { row = rows[x.rowIdx]; id = q; break; } }
    if (!row) return null;
    const want = canon(token);
    const col = Object.keys(row).find(k => typeof row[k] === 'string' && canon(row[k]) === want) ?? Object.keys(row).find(k => typeof row[k] === 'string' && (canon(row[k]).includes(want) || want.includes(canon(row[k]))));
    if (!col) return ex({ what: `This is how the saved row in ${id} reads. Missing values stay as they are and are never replaced by RM 0.`, kind: 'saved', rail: stationsOf(id), src: [id], cards: [madeNote(id)] });
    return savedRow(id, row, col);
  }

  /* ── The lookup itself ── */
  const OP_WORD = { '+': 'plus', '−': 'minus', '×': 'times', '÷': 'divided by', '=': 'equals' };
  // A sum read aloud: "Diesel price RM 3,000.00/t minus Biodiesel cost RM 4,650.94/t equals −RM 1,650.94/t."
  const sumWords = c => `${c.terms.map((t, i) => `${t.l}${t.v ? ` ${t.v}` : ''}${i < c.terms.length - 1 ? ` ${OP_WORD[c.ops[i]] ?? c.ops[i] ?? 'and'}` : ''}`).join(' ')}, equals ${c.res.v}.`;
  // Steps only the Developer level has. The other steps are on the User level, numbered without these.
  const DEV_ONLY = { obj1: [4], obj3: [5], obj4: [4] };
  function whereShown(el) {
    if (el.closest?.('#prov')) return 'Sources and provenance';
    const card = el.closest?.('.dcard');
    if (card) {
      // The User level shows these two on the step itself; here they sit in a Detail card.
      const title = card.querySelector('.dcard-t b')?.textContent?.trim() ?? '';
      const onUser = { 'obj4:3': 'Price map', 'decision:1': 'Money coming in' }[`${S.tab}:${S.step[S.tab]}`] === title;
      if (!onUser) return 'Developer level only · Detail card';
    }
    if (el.closest?.('.dstack') && !card) return 'Developer level only · Detail card';
    const chip = el.closest?.('[data-chip]');
    const step = chip ? Number(chip.dataset.chip) : S.step[S.tab];
    const skipped = DEV_ONLY[S.tab] ?? [];
    if (skipped.includes(step)) return 'Developer level only';
    return `Also on the User level · ${tabById(S.tab).label} step ${step + 1 - skipped.filter(k => k < step).length}`;
  }
  function finish(info, el) {
    const cards = (info.cards ?? []).filter(Boolean);
    let lines = info.lines;
    if (!lines) {
      const kept = cards;
      lines = [{ say: info.what ?? '', card: -1, rail: info.rail }];
      const sheet = kept.findIndex(c => c.type === 'cells' && c.hl?.length);
      if (sheet >= 0 && !/\bcell\b/i.test(info.what ?? '')) { const hl = kept[sheet].hl; lines.push({ say: `It starts at ${hl.length > 1 ? 'cells' : 'cell'} ${hl.join(', ')} of the ${kept[sheet].sheet} sheet.`, card: sheet, rail: ['xl', 'ui'], spokenOnly: true }); }
      const sum = kept.findIndex(c => c.type === 'calc');
      if (sum >= 0) lines.push({ say: sumWords(kept[sum]), card: sum, rail: info.rail, spokenOnly: true });
    }
    info = { ...info, where: whereShown(el) };
    const quiet = el.closest?.('.control-meta, .chart, [data-chart]') || (el.closest?.('.dstack') && el.closest?.('td') && ['saved', 'workbook'].includes(info.kind)) || info.kind === 'unknown';
    return { ...info, cards, lines, auto: !quiet };
  }
  const resolve = (token, el) => finish(lookup(token, el), el);
  function lookup(token, el) {
    const x = context(el, token);
    const p = parseToken(token);
    const key = canon(token);
    const c = compute(); c.__token = token; c.__step = x.step;
    const F = facts(c);
    const named = base => ({ value: token, name: x.label, ...base });
    // A word, not a number: its reason, or the saved row it was read from.
    if (!p) {
      const byOut = x.out ? F.find(f => f.out?.includes(x.out)) : null;
      if (byOut) return named(byOut.make());
      const word = wordInTable(token, el, x);
      return named(word ?? ex({ kind: 'unknown', what: '', rail: ['ui'] }));
    }
    // 1. A cell reference printed next to the number
    const refEl = el.closest?.('td')?.querySelector?.('small');
    const ref = refEl?.textContent?.trim().match(/^([A-Z]+)(\d+)$/);
    if (ref && wbRow(Number(ref[2]))) {
      const n = Number(ref[2]);
      return named(ex({ what: `Cell ${ref[0]} of the MONTHLY DATA sheet: ${WB.headers[ref[1]] ?? ref[1]}.`, kind: 'workbook', rail: ['xl', 'ui'], cards: [sheet([ref[1]], [n - 1, n, n + 1].filter(wbRow), [ref[0]])] }));
    }
    const stacked = Boolean(el.closest?.('.dstack'));
    // 2. A row of a Detail table
    const ownOut = stacked && x.out ? F.find(f => f.out?.includes(x.out)) : null;
    if (ownOut) return named(ownOut.make());
    if (p && stacked && (x.rowIdx != null || x.row) && (x.queries.length || x.row)) { const hit = rowLookup(p, x); if (hit) return named(hit); }
    // Special places on the page
    if (el.closest?.('.control-meta')) return named(ex({ what: 'A limit of this slider, set in the studio (app.js). It is not a result. Values outside it are refused.', kind: 'fixed', rail: ['js', 'ui'] }));
    if (el.closest?.('[data-set="capture"], [data-select="capture"]')) return named(ex({ what: `A saved share of savings paid in. ${CHOICE} Untested shares are never interpolated.`, kind: 'choice', rail: ['py', 'snap', 'ui'], src: ['rq2_capture'], cards: [madeNote('rq2_capture')] }));
    if (el.closest?.('.chart, [data-chart]')) return named(ex({ what: 'A chart axis label: the chart\'s scale, not a result. Click the chart to see the saved values for a month.', kind: 'fixed', rail: ['js', 'ui'] }));
    if (el.closest?.('.chips, .seg, .choice-grid, select') && /^rm/.test(key) && !x.out) {
      if (el.closest('[data-set="bslRate"]')) return named(rateFact(p.abs, el));
      if (el.closest('[data-set="governmentSeed"], [data-select="governmentSeed"]')) return named(seedFact(p.abs, el));
    }
    // The funding table: an amount the guide does not read out still has its saved row.
    if (p && x.row && !guideHit(scene(S.tab, x.step), key)) { const col = matchCol(x.row.row, p, token); if (col) return named(savedRow(x.row.id, x.row.row, col, p)); }
    // 3. The guide's checked line for this step. Live figures in the same line keep it true only at matching values.
    const sc = scene(S.tab, x.step);
    const fact = pickFact(F, key, x);
    const bareSmall = p && !p.money && !p.pct && !p.unit && p.d === 0 && p.abs < 100;
    const inGuide = stacked || (bareSmall && (fact || !/\sof\s/.test(x.near))) ? null : guideHit(sc, key) ?? null;
    if (inGuide && (inGuide.cards.length || !fact)) return named(inGuide);
    // 4. A live sum for the settings on screen
    if (fact) { const made = fact.make(); return named(inGuide ? { ...made, what: inGuide.what, lines: inGuide.lines, kind: 'guide' } : made); }
    // 5. Any saved value, then the rest of this tab's guide lines
    if (p) { const hit = savedLookup(p, x); if (hit) return named(hit); }
    for (const other of SCENES.filter(s => s.tab === S.tab)) { const hit = guideHit(other, key); if (hit) return named(hit); }
    return named(ex({ kind: 'unknown', what: 'No recorded origin for this number yet. Use Sources and provenance for the files behind this step.', rail: ['ui'] }));
  }
  function pickFact(F, key, x) {
    if (x.out) { const byOut = F.filter(f => f.out?.includes(x.out)); const f = byOut.find(f => !f.forms.length || f.forms.includes(key)) ?? (byOut.length === 1 ? byOut[0] : null); if (f) return f; }
    const all = F.filter(f => f.forms.includes(key));
    if (!all.length) return null;
    const passes = f => !f.when || f.when(x);
    return all.find(f => f.when && passes(f)) ?? all.find(f => f.tabs?.includes(S.tab) && passes(f)) ?? all.find(f => !f.scoped && !f.tabs && passes(f)) ?? all.find(passes) ?? null;
  }

  /* ── Drawing the cards ── */
  function renderCard(c) {
    const card = document.createElement('div');
    card.className = `nt-card ${c.type}${c.tone ? ` ${c.tone}` : ''}`;
    if (c.type === 'calc') {
      let h = `<h3>${e(c.title)}</h3><div class="nt-eq">`;
      c.terms.forEach((t, i) => {
        h += `<div class="nt-term"${t.a ? ` data-a="t:${t.a}"` : ''}><span>${e(t.l)}</span>${t.v ? `<b>${e(t.v)}</b>` : ''}${t.s ? `<em>${e(t.s)}</em>` : ''}</div>`;
        if (i < c.terms.length - 1 || c.terms.length === 1) { const op = c.ops[i] || '='; h += `<i class="nt-op${op.length > 2 && !op.startsWith('&') ? ' word' : ''}">${op}</i>`; }
      });
      if (c.terms.length > 1) h += '<i class="nt-op">=</i>';
      const r = c.res;
      h += `<div class="nt-term nt-res ${r.t || ''}"${r.a ? ` data-a="t:${r.a}"` : ''}><span>${e(r.l)}</span><b>${e(r.v)}</b>${r.s ? `<em>${e(r.s)}</em>` : ''}</div></div>`;
      if (c.work) h += `<pre class="nt-work">${c.work.split('\n').map(l => `<span>${e(l)}</span>`).join('')}</pre>`;
      card.innerHTML = h;
    } else if (c.type === 'note') {
      card.innerHTML = `<h3>${e(c.head)}</h3>${c.body}${c.work ? `<pre class="nt-work">${c.work.split('\n').map(l => `<span>${e(l)}</span>`).join('')}</pre>` : ''}`;
    } else if (c.type === 'verdict') {
      card.innerHTML = `<div class="nt-verdict" data-a="t:verdict">${e(c.big)}</div>${c.sub ? `<small>${e(c.sub)}</small>` : ''}`;
    } else if (c.type === 'table') {
      card.innerHTML = `<h3>${e(c.title)}</h3><table class="nt-t"><thead><tr>${c.head.map(x => `<th>${x}</th>`).join('')}</tr></thead><tbody>${c.rows.map((r, i) => `<tr data-a="row:${i}"${i === c.hl ? ' class="hl"' : ''}>${r.map(x => `<td>${x}</td>`).join('')}</tr>`).join('')}</tbody></table>${c.foot ? `<p class="nt-cap">${c.foot}</p>` : ''}`;
    } else if (c.type === 'cells') {
      const nm = c.names ? `<tr class="nm"><th></th>${c.names.map(x => `<th>${e(x)}</th>`).join('')}</tr>` : '';
      const rg = c.rg || [];
      const tot = c.total ? `<tr class="tot"><th>${e(c.total.label)}</th>${c.cols.map(col => c.total.cells[col] == null ? '<td></td>' : `<td class="on" data-a="tot:${col}">${e(c.total.cells[col])}</td>`).join('')}</tr>` : '';
      const fold = c.rows.length > 5;
      const moreRow = fold ? `<tr class="nt-more"><th>⋮</th><td colspan="${c.cols.length}"><button type="button" data-nt-more>Show all ${c.rows.length} rows</button></td></tr>` : '';
      card.innerHTML = `<div class="nt-sheet"><b>${e(c.sheet)}</b><span>${e(c.title)}</span></div><div class="nt-xl"><table><tr><th></th>${c.cols.map(x => `<th>${x}</th>`).join('')}</tr>${nm}${c.rows.map((r, n) => `${fold && n === 2 ? moreRow : ''}<tr${fold && n >= 2 && n < c.rows.length - 2 ? ' class="nt-fold" hidden' : ''}><th>${r.r}</th>${r.v.map((v, i) => { const ref = c.cols[i] + r.r; const cls = c.hl?.includes(ref) ? 'hl' : rg.includes(ref) ? 'rg' : ''; return `<td data-a="cell:${ref}"${cls ? ` class="${cls}"` : ''}>${e(v)}</td>`; }).join('')}</tr>`).join('')}${tot}</table></div>`;
    } else if (c.type === 'bars') {
      card.innerHTML = `<h3>${e(c.title)}</h3>${c.items.map((b, i) => `<div class="nt-bar" data-a="bar:${i}"><span>${e(b.l)}</span><div class="nt-track"><div class="nt-fill ${b.t || ''}" style="transform:scaleX(${b.p})"></div>${i === 0 && c.line ? `<div class="nt-mark" style="left:${c.line.p * 100}%"></div>` : ''}</div><b>${e(b.v)}</b></div>`).join('')}${c.foot ? `<p class="nt-cap">${c.foot}</p>` : ''}`;
    } else if (c.type === 'code') {
      card.innerHTML = `<h3>${e(c.file)} · line ${c.start}</h3><pre class="nt-code">${c.lines.map((l, i) => `<div${c.hl?.includes(i) ? ' class="hl"' : ''}><i>${c.start + i}</i>${e(l)}</div>`).join('')}</pre>`;
    }
    return card;
  }

  /* ── The panel ── */
  const panel = Object.assign(document.createElement('div'), { className: 'nt-panel', id: 'nt-panel' });
  panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', 'Where this number comes from');
  panel.innerHTML = `<div class="nt-inner"><div class="nt-head"><span class="nt-val"></span><span class="nt-name"></span><button type="button" class="nt-close" aria-label="Close">×</button></div>
    <ol class="nt-rail">${STATIONS.map(([id, label, color]) => `<li data-st="${id}" style="--c:var(${color})"><i></i>${label}</li>`).join('')}</ol>
    <div class="nt-player" role="group" aria-label="Voice"><button type="button" class="nt-play" aria-label="Play the explanation"></button><button type="button" class="nt-voice" aria-pressed="true"></button><button type="button" class="nt-rate" aria-label="Voice speed">1×</button><select class="nt-narr" aria-label="Choose the narrator"></select></div>
    <p class="nt-hint" hidden>Click anywhere once to let the browser play the voice.</p>
    <div class="nt-scroll"><div class="nt-tags"><span class="nt-kind"></span><span class="nt-where"></span></div><div class="nt-say"></div><div class="nt-cards"></div><svg class="nt-threads" aria-hidden="true"></svg></div>
    <div class="nt-foot"><div class="nt-tour" hidden><button type="button" data-nt-prev>‹ Back</button><b></b><button type="button" data-nt-next>Next ›</button></div><span>Simulated, not official MPOB figures.</span><em class="nt-sources" style="font-style:normal"></em><button type="button" class="nt-off">Turn off</button></div></div>`;
  const over = Object.assign(document.createElement('div'), { className: 'nt-over', innerHTML: '<div class="nt-ring" hidden></div><svg class="nt-wire" aria-hidden="true"></svg>' });
  const POP = 'showPopover' in HTMLElement.prototype;
  if (POP) { panel.setAttribute('popover', 'manual'); over.setAttribute('popover', 'manual'); }
  document.body.append(over, panel);
  const ring = over.querySelector('.nt-ring'), wire = over.querySelector('.nt-wire');
  const NS = 'http://www.w3.org/2000/svg';
  const shown = el => { if (POP && !el.matches(':popover-open')) el.showPopover(); else if (!POP) el.style.display = 'block'; };
  const unshown = el => { if (POP && el.matches(':popover-open')) el.hidePopover(); else if (!POP) el.style.display = 'none'; };
  if (!POP) { panel.style.display = 'none'; over.style.display = 'none'; }

  let openNow = false, current = null, pinned = false, lastClosed = 0, pointer = null;
  const KEY = 'mpob-number-origins';
  const store = { read(k) { try { return localStorage.getItem(k); } catch { return null; } }, write(k, v) { try { localStorage.setItem(k, v); } catch { /* the setting just lasts for this visit */ } } };
  let enabled = store.read(KEY) !== 'off';
  const toggleBtn = document.getElementById('nt-toggle');
  const paintToggle = () => { toggleBtn.textContent = `Number origins: ${enabled ? 'on' : 'off'}`; toggleBtn.setAttribute('aria-pressed', String(enabled)); };
  paintToggle();
  const setEnabled = on => { enabled = on; store.write(KEY, on ? 'on' : 'off'); paintToggle(); if (!on) close(true); };

  const setRail = lit => panel.querySelectorAll('.nt-rail li').forEach(li => li.classList.toggle('on', lit.has(li.dataset.st)));

  /* ── The voice: the same browser voices as the audio guide, English only ── */
  const synth = 'speechSynthesis' in window ? window.speechSynthesis : null;
  const VOICE_KEY = `${KEY}-voice`, NARR_KEY = `${KEY}-narrator`, RATE_KEY = `${KEY}-rate`;
  const RATES = [1, 1.25, 1.5, 2];
  let voices = [], speaking = false, speakTok = 0, rate = RATES.includes(Number(store.read(RATE_KEY))) ? Number(store.read(RATE_KEY)) : 1, voiceOn = store.read(VOICE_KEY) !== 'off', closeAfter = 0;
  const isNatural = v => /natural|online|neural/i.test(v.name);
  const prettyName = v => v.name.replace(/^Microsoft\s+/i, '').replace(/\s+Online\s*\(Natural\)/i, '').replace(/\s+-\s+.*$/, '').replace(/\(Natural\)/i, '').trim();
  function defaultVoice() {
    const pref = ['en-MY', 'en-SG', 'en-GB', 'en-AU', 'en-US', 'en-IN', 'en'];
    const score = v => { const l = v.lang.replace('_', '-').toLowerCase(); let n = 0; const i = pref.findIndex(x => l.startsWith(x.toLowerCase())); if (i >= 0) n += 100 - i * 5; if (isNatural(v)) n += 60; if (/luna/i.test(v.name)) n += 5; if (/multilingual/i.test(v.name)) n -= 10; return n; };
    return [...voices].sort((a, b) => score(b) - score(a))[0] ?? null;
  }
  const currentVoice = () => voices.find(v => v.voiceURI === store.read(NARR_KEY)) ?? defaultVoice();
  function loadVoices() {
    voices = synth ? synth.getVoices().filter(v => v.lang.toLowerCase().startsWith('en')) : [];
    const sel = panel.querySelector('.nt-narr'), now = currentVoice();
    sel.innerHTML = [...voices].sort((a, b) => Number(isNatural(b)) - Number(isNatural(a)) || a.lang.localeCompare(b.lang)).map(v => `<option value="${e(v.voiceURI)}"${v === now ? ' selected' : ''}>${e(prettyName(v))} · ${e(v.lang.split(/[-_]/)[1] ?? v.lang)}</option>`).join('');
    panel.querySelector('.nt-player').hidden = !voices.length;
  }
  if (synth) { loadVoices(); synth.addEventListener?.('voiceschanged', loadVoices); } else panel.querySelector('.nt-player').hidden = true;
  const toSpeech = t => String(t)
    .replace(/([−+])?\s?RM\s?[−-](\d[\d,]*(?:\.\d+)?)(\/t)?/g, (m, sg, a, pt) => `minus ${a} ringgit${pt ? ' per tonne' : ''}`)
    .replace(/([−+])?\s?RM\s?([\d,]+(?:\.\d+)?)\s?(mn|bn)?(\/t)?/g, (m, sg, a, u, pt) => `${sg === '−' ? 'minus ' : sg === '+' ? 'plus ' : ''}${a}${u ? (u === 'mn' ? ' million' : ' billion') : ''} ringgit${pt ? ' per tonne' : ''}`)
    .replace(/USD\s?([\d,]+(?:\.\d+)?)(\/bbl)?/g, (m, a, b) => `${a} US dollars${b ? ' a barrel' : ''}`)
    .replace(/([\d.,]+)\s?mn t\b/g, '$1 million tonnes').replace(/([\d.,]+)\s?bn L\b/g, '$1 billion litres').replace(/(\d)%/g, '$1 percent')
    .replace(/\s−\s/g, ' minus ').replace(/−(?=\d)/g, 'minus ').replace(/(\d)×/g, '$1 times').replace(/×/g, ' times ').replace(/÷/g, ' divided by ')
    .replace(/\s=\s/g, ' equals ').replace(/\bVG\b/g, 'V G').replace(/\bOBJ\s?(\d)/g, 'Objective $1').replace(/\bmn\b/g, 'million').replace(/\/t\b/g, ' per tonne')
    .replace(/\bP95\b/g, 'P 95').replace(/\.js\b/g, ' dot J S').replace(/\.py\b/g, ' dot P Y').replace(/_/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/\s·\s/g, ', ').replace(/[“”]/g, '');
  const activated = () => navigator.userActivation?.hasBeenActive ?? true;
  const voiceWanted = () => voiceOn && !SOUND.muted;
  const ICON_PLAY = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13l11-6.5z"/></svg>', ICON_STOP = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="7" y="7" width="10" height="10" rx="1.5"/></svg>';
  function paintPlayer() {
    const play = panel.querySelector('.nt-play');
    play.innerHTML = speaking ? ICON_STOP : ICON_PLAY;
    play.setAttribute('aria-label', speaking ? 'Stop the voice' : 'Play the explanation');
    play.title = speaking ? 'Stop the voice' : 'Play the explanation';
    const v = panel.querySelector('.nt-voice');
    v.textContent = voiceWanted() ? 'Voice on' : 'Voice off';
    v.setAttribute('aria-pressed', String(voiceWanted()));
    panel.querySelector('.nt-rate').textContent = `${rate}×`;
    panel.querySelector('.nt-hint').hidden = activated() || !voiceWanted() || !voices.length || !current?.info?.auto;
  }
  function clearPlayback() {
    panel.querySelectorAll('.nt-now, .nt-dim, .nt-seq, .past').forEach(n => n.classList.remove('nt-now', 'nt-dim', 'nt-seq', 'past'));
    if (current?.info?.railAll) setRail(current.info.railAll);
  }
  function stopVoice() {
    speakTok++; clearTimeout(closeAfter);
    if (speaking && synth) synth.cancel();
    speaking = false; clearPlayback(); paintPlayer();
  }
  function speakLine(text, tok, onProgress) {
    return new Promise(resolve => {
      const said = toSpeech(text), v = currentVoice();
      let ended = false, watchdog = 0;
      const done = err => { if (ended) return; ended = true; clearTimeout(watchdog); resolve(err); };
      if (!synth || !v) return done('no-voice');
      const u = new SpeechSynthesisUtterance(said);
      u.voice = v; u.lang = v.lang; u.rate = rate; u.pitch = 1;
      u.onboundary = ev => { if (tok === speakTok) onProgress((ev.charIndex + (ev.charLength || 1)) / said.length); };
      u.onend = () => done(); u.onerror = ev => done(ev.error ?? 'error');
      watchdog = setTimeout(() => done(), Math.max(2600, said.split(/\s+/).length * 400 / rate) * 2.4 + 8000); // some engines drop onend
      synth.cancel(); synth.speak(u);
    });
  }
  function showLine(info, i) {
    const line = info.lines[i];
    panel.querySelectorAll('.nt-line').forEach(p => { const n = Number(p.dataset.line); p.classList.toggle('nt-now', n === i); p.classList.toggle('nt-dim', n !== i && !line.spokenOnly); if (n !== i) p.querySelectorAll('.w').forEach(w => w.classList.toggle('past', n < i)); });
    const cardEls = [...panel.querySelectorAll('.nt-cards .nt-card')];
    const on = line.card >= 0 ? cardEls[line.card] : null;
    if (on) { cardEls.forEach(c => { c.classList.toggle('nt-now', c === on); c.classList.toggle('nt-dim', c !== on); }); on.scrollIntoView({ block: 'nearest', behavior: RM_() ? 'auto' : 'smooth' }); on.querySelectorAll('.nt-xl td.hl').forEach(td => { if (!RM_()) td.animate([{ outlineWidth: '2px' }, { outlineWidth: '5px', backgroundColor: 'var(--nt-origin)' }, { outlineWidth: '2px' }], { duration: 900, easing: 'ease-out' }); }); }
    else { const p = panel.querySelector(`.nt-line[data-line="${i}"]`); p?.scrollIntoView({ block: 'nearest', behavior: RM_() ? 'auto' : 'smooth' }); }
    if (line.rail?.length) setRail(new Set([...line.rail, 'ui']));
    const eq = on?.classList.contains('calc') ? on.querySelector('.nt-eq') : null;
    if (eq) eq.classList.add('nt-seq');
    const parts = eq ? [...eq.children] : [];
    const words = [...(panel.querySelector(`.nt-line[data-line="${i}"]`)?.querySelectorAll('.w') ?? [])];
    words.forEach(w => w.classList.remove('past'));
    return p => {
      const k = Math.ceil(Math.min(1, p) * parts.length);
      parts.forEach((x, n) => x.classList.toggle('past', n < k));
      const w = Math.ceil(Math.min(1, p) * words.length);
      words.forEach((x, n) => x.classList.toggle('past', n < w));
    };
  }
  async function narrate(info, delay = 0) {
    const tok = ++speakTok;
    clearTimeout(closeAfter);
    if (speaking && synth) synth.cancel();
    speaking = true; paintPlayer();
    if (delay) { await new Promise(r => setTimeout(r, delay)); if (tok !== speakTok) return; }
    for (let i = 0; i < info.lines.length; i++) {
      const progress = showLine(info, i);
      const err = await speakLine(info.lines[i].say, tok, progress);
      if (tok !== speakTok) return;
      progress(1);
      if (err === 'not-allowed') break;
      await new Promise(r => setTimeout(r, 130 / rate));
      if (tok !== speakTok) return;
    }
    speaking = false; clearPlayback(); paintPlayer();
    if (tour?.auto) { tourTimer = setTimeout(() => tourGo(tour.i + 1), 450 / rate); return; }
    // Finished, and the cursor has moved away: the card goes too.
    closeAfter = setTimeout(() => { if (!pinned && openNow && pointer) { const top = document.elementFromPoint(pointer.x, pointer.y); if (!top?.closest('.nt-panel') && !sameHit(hitAt(pointer.x, pointer.y), current)) close(); } }, 1400);
  }

  function fill(info) {
    panel.querySelector('.nt-val').textContent = info.value;
    panel.querySelector('.nt-name').textContent = info.name ?? '';
    const lit = new Set(info.rail);
    if (info.cards.some(c => c.type === 'cells')) lit.add('xl');
    if (info.cards.some(c => c.type === 'code' && /\.py/.test(c.file ?? ''))) lit.add('py');
    if (info.cards.some(c => c.type === 'code' && /\.js/.test(c.file ?? ''))) lit.add('js');
    lit.add('ui');
    info.railAll = lit;
    setRail(lit);
    const kind = panel.querySelector('.nt-kind');
    const changed = sharedEdits().length > 0 || decEdits().length > 0;
    const label = { guide: 'Checked line from the audio guide', live: changed ? 'Worked out live from your settings' : 'Worked out in the app, at the snapshot values', saved: 'Saved result', workbook: 'Read from the master workbook', setting: 'Your setting', choice: 'A saved choice', fixed: 'Fixed setting or target', unknown: 'No recorded origin' }[info.kind];
    kind.textContent = label; kind.className = `nt-kind${info.kind === 'live' ? ' live' : ''}`;
    panel.querySelector('.nt-where').textContent = info.where ?? '';
    const say = panel.querySelector('.nt-say'); say.innerHTML = '';
    info.lines.forEach((l, i) => {
      if (l.spokenOnly) return;
      const p = document.createElement('p'); p.className = 'nt-line'; p.dataset.line = i;
      l.say.split(/(\s+)/).forEach(w => { const sp = document.createElement('span'); sp.textContent = w; if (/\S/.test(w)) sp.className = 'w'; p.appendChild(sp); });
      say.appendChild(p);
    });
    const box = panel.querySelector('.nt-cards'); box.innerHTML = '';
    info.cards.forEach(c => box.appendChild(renderCard(c)));
    panel.querySelector('.nt-sources').innerHTML = (info.src ?? []).filter(id => Q[id]).slice(0, 2).map(id => `<button type="button" data-prov="${id}">Open ${id}</button>`).join(' ');
    panel.querySelector('.nt-scroll').scrollTop = 0;
  }
  function place(rect) {
    const iw = innerWidth, ih = innerHeight, W = panel.offsetWidth, H = panel.offsetHeight;
    if (iw <= 640) return { x: 8, y: ih - H - 8, side: 'sheet' };
    const gap = 26;
    let x, side;
    if (rect.right + gap + W <= iw - 10) { x = rect.right + gap; side = 'right'; }
    else if (rect.left - gap - W >= 10) { x = rect.left - gap - W; side = 'left'; }
    if (x !== undefined) return { x, y: Math.max(10, Math.min(ih - H - 10, rect.top + rect.height / 2 - 48)), side };
    x = Math.max(10, Math.min(iw - W - 10, rect.left + rect.width / 2 - W / 2));
    const below = rect.bottom + gap + H <= ih - 10;
    return { x, y: below ? rect.bottom + gap : Math.max(10, rect.top - gap - H), side: below ? 'below' : 'above' };
  }
  function drawRing(rect) {
    ring.hidden = false;
    ring.style.width = `${rect.width + 4}px`; ring.style.height = `${rect.height + 2}px`;
    ring.style.transform = `translate(${rect.left - 2}px, ${rect.top - 1}px)`;
  }
  // The thread from the number on screen to the card, drawn the way the guide draws them.
  function drawWire(rect, pos) {
    wire.innerHTML = '';
    if (pos.side === 'sheet') return;
    const W = panel.offsetWidth;
    const from = pos.side === 'right' ? { x: rect.right + 3, y: rect.top + rect.height / 2 } : pos.side === 'left' ? { x: rect.left - 3, y: rect.top + rect.height / 2 } : { x: rect.left + rect.width / 2, y: pos.side === 'below' ? rect.bottom + 2 : rect.top - 2 };
    const to = pos.side === 'right' ? { x: pos.x, y: pos.y + 26 } : pos.side === 'left' ? { x: pos.x + W, y: pos.y + 26 } : { x: pos.x + W / 2, y: pos.side === 'below' ? pos.y : pos.y + panel.offsetHeight };
    const horizontal = pos.side === 'right' || pos.side === 'left';
    const dx = (to.x - from.x) * .5, dy = (to.y - from.y) * .5;
    const d = horizontal ? `M${from.x},${from.y} C${from.x + dx},${from.y} ${to.x - dx},${to.y} ${to.x},${to.y}` : `M${from.x},${from.y} C${from.x},${from.y + dy} ${to.x},${to.y - dy} ${to.x},${to.y}`;
    thread(wire, d, [from], !RM_());
  }
  function thread(svg, d, dots, animate) {
    const path = document.createElementNS(NS, 'path'); path.setAttribute('d', d); path.setAttribute('class', 't'); svg.appendChild(path);
    const flow = document.createElementNS(NS, 'path'); flow.setAttribute('d', d); flow.setAttribute('class', 'flow'); svg.appendChild(flow);
    dots.forEach(p => { const c = document.createElementNS(NS, 'circle'); c.setAttribute('cx', p.x); c.setAttribute('cy', p.y); c.setAttribute('r', 3.5); svg.appendChild(c); });
    if (animate) { const len = path.getTotalLength(); flow.style.opacity = 0; path.style.strokeDasharray = len; path.animate([{ strokeDashoffset: len }, { strokeDashoffset: 0 }], { duration: 300, easing: 'cubic-bezier(.77,0,.175,1)' }).finished.then(() => { path.style.strokeDasharray = ''; flow.style.opacity = ''; }).catch(() => {}); }
    return path;
  }
  // Threads inside the card: workbook cell to sum term, as the guide links them.
  function drawInner(info, animate) {
    const svg = panel.querySelector('.nt-threads'); svg.innerHTML = '';
    const scroll = panel.querySelector('.nt-scroll'); const base = scroll.getBoundingClientRect();
    svg.style.height = `${scroll.scrollHeight}px`;
    const point = r => ({ x: r.left - base.left + scroll.scrollLeft, y: r.top - base.top + scroll.scrollTop });
    (info.links ?? []).forEach(([from, to, , own], i) => {
      if (String(to).startsWith('spot:') || String(from).startsWith('spot:')) return;
      const a = scroll.querySelector(`[data-a="${CSS.escape(from)}"]`), b = scroll.querySelector(`[data-a="${CSS.escape(to)}"]`);
      if (!a || !b) return;
      const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
      const p1 = point({ left: ra.left + ra.width / 2, top: ra.bottom }), p2 = point({ left: rb.left + rb.width / 2, top: rb.top });
      const dy = (p2.y - p1.y) * .5;
      thread(svg, `M${p1.x},${p1.y} C${p1.x},${p1.y + dy} ${p2.x},${p2.y - dy} ${p2.x},${p2.y}`, [p1, p2], animate);
      const label = own || (from.startsWith('cell:') ? `origin · cell ${from.slice(5)}` : from.startsWith('tot:') ? `origin · column ${from.slice(4)}` : '');
      if (label) {
        const g = document.createElementNS(NS, 'g'); g.setAttribute('class', 'tag');
        const tx = document.createElementNS(NS, 'text'); tx.textContent = label; g.appendChild(tx); svg.appendChild(g);
        const mid = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 + (i % 2 ? 8 : -2) };
        const bb = tx.getBBox(); tx.setAttribute('x', mid.x - bb.width / 2); tx.setAttribute('y', mid.y + 3);
        const rc = document.createElementNS(NS, 'rect'); rc.setAttribute('x', mid.x - bb.width / 2 - 5); rc.setAttribute('y', mid.y - 7); rc.setAttribute('width', bb.width + 10); rc.setAttribute('height', 14); rc.setAttribute('rx', 7);
        g.insertBefore(rc, tx);
      }
    });
  }
  function enter(animate, pos) {
    if (RM_() || !animate) return;
    const inner = panel.querySelector('.nt-inner');
    inner.style.transformOrigin = pos.side === 'left' ? '100% 26px' : pos.side === 'right' ? '0 26px' : '50% 100%';
    inner.animate([{ opacity: 0, transform: 'scale(.94)' }, { opacity: 1, transform: 'none' }], { duration: 240, easing: 'cubic-bezier(.34,1.3,.64,1)' });
    // The sum lights up term by term, the way the guide does it in time with the voice.
    panel.querySelectorAll('.nt-cards .nt-term, .nt-cards .nt-op').forEach((p, i) => p.animate([{ opacity: .15, transform: 'translateY(5px)' }, { opacity: 1, transform: 'none' }], { duration: 220, delay: 70 + i * 40, easing: 'cubic-bezier(.23,1,.32,1)', fill: 'backwards' }));
    panel.querySelectorAll('.nt-res').forEach(p => p.animate([{ transform: 'scale(.94)' }, { transform: 'none' }], { duration: 300, delay: 120, easing: 'cubic-bezier(.34,1.56,.64,1)' }));
  }
  function show(hit, info, now = false) {
    const host = document.getElementById('prov')?.open ? document.getElementById('prov') : document.body;
    if (panel.parentNode !== host) { unshown(panel); unshown(over); host.append(over, panel); openNow = false; }
    const sliding = openNow && !RM_();
    stopVoice();
    current = hit; current.info = info;
    shown(over); shown(panel);
    fill(info);
    panel.classList.toggle('no-slide', !sliding);
    const rect = hit.rect();
    const pos = place(rect);
    panel.style.transform = `translate(${pos.x}px, ${pos.y}px)`;
    drawRing(rect); drawWire(rect, pos);
    requestAnimationFrame(() => drawInner(info, !RM_()));
    enter(!sliding && performance.now() - lastClosed > 300, pos);
    openNow = true;
    paintPlayer();
    hideCoach();
    // It speaks once the cursor has settled, so sweeping across numbers stays quiet.
    if (info.auto && voiceWanted() && voices.length && activated()) narrate(info, now ? 0 : 340);
  }
  function close(force = false) {
    if (!openNow) return;
    if (pinned && !force) return;
    stopVoice();
    clearTimeout(tourTimer); tour = null; paintTour();
    pinned = false; openNow = false; current = null; lastClosed = performance.now();
    ring.hidden = true; wire.innerHTML = '';
    unshown(panel); unshown(over);
    document.documentElement.classList.remove('nt-hit');
  }

  /* ── Explain: walk through every number and result word on this step, with the voice ── */
  let tour = null, ignoreScrollUntil = 0;
  function tourItems() {
    const root = document.querySelector('.stage:not(.is-leaving) .stage-body');
    if (!root) return [];
    const items = [], seen = new Set();
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let next = walker.nextNode(); next; next = walker.nextNode()) {
      const node = next;
      const owner = node.parentElement;
      if (!owner || owner.closest(SKIP) || owner.closest('.control-meta, [hidden], [inert], option, style, script')) continue;
      const tokens = tokensIn(node.data);
      for (const t of tokens) {
        const key = canon(t.text);
        if (seen.has(key)) continue;
        seen.add(key);
        const range = document.createRange(); range.setStart(node, t.start); range.setEnd(node, t.end);
        if (!range.getBoundingClientRect().width) continue;
        items.push({ el: owner, text: t.text, node, id: `${t.start}:${t.text}`, rect: () => (node.isConnected ? range.getBoundingClientRect() : new DOMRect(-99, -99, 0, 0)) });
      }
      const out = owner.closest('[data-out]');
      if (!tokens.length && out && WORD_OUT.has(out.dataset.out) && node.data.trim() && !seen.has(out.dataset.out)) {
        seen.add(out.dataset.out);
        if (out.getBoundingClientRect().width) items.push({ el: out, text: out.textContent.trim(), id: `word:${out.dataset.out}`, word: true, rect: () => (out.isConnected ? out.getBoundingClientRect() : new DOMRect(-99, -99, 0, 0)) });
      }
    }
    return items;
  }
  function paintTour() {
    const box = panel.querySelector('.nt-tour');
    box.hidden = !tour;
    if (!tour) return;
    box.querySelector('b').textContent = `${tour.i + 1} of ${tour.items.length} on this step`;
    box.querySelector('[data-nt-prev]').disabled = tour.i === 0;
    box.querySelector('[data-nt-next]').textContent = tour.i === tour.items.length - 1 ? 'Finish' : 'Next ›';
  }
  let tourTimer = 0;
  function tourGo(i) {
    clearTimeout(tourTimer);
    if (!tour) return;
    if (i < 0 || i >= tour.items.length) { close(true); return; }
    tour.i = i;
    const item = tour.items[i];
    ignoreScrollUntil = performance.now() + 400;
    item.el.scrollIntoView({ block: 'center', behavior: 'instant' });
    pinned = false; open(item, true); pinned = true;
    paintTour();
    // Nothing to read aloud here: move on after a pause long enough to read the card.
    if (!speaking && tour.auto) tourTimer = setTimeout(() => tourGo(tour.i + 1), 3500);
  }
  function startTour() {
    if (!enabled) setEnabled(true);
    if (!voiceOn) { voiceOn = true; store.write(VOICE_KEY, 'on'); }
    if (SOUND.muted) SOUND.enable();
    const items = tourItems();
    if (!items.length) return;
    tour = { items, i: 0, auto: true };
    tourGo(0);
  }

  /* ── What is under the pointer? ── */
  const WORD_OUT = new Set(['priceWord', 'dPriceWord', 'fundWord', 'dFundWord', 'approvalWord', 'dApprovalWord', 'mandate', 'dMandate', 'mandateTag', 'dMandateTag', 'reason', 'dReason', 'gapWord', 'rq2Head', 's6word', 'solword']);
  function hitAt(x, y) {
    const el = document.elementFromPoint(x, y);
    if (!el || !enabled || S.tab === 'home' || !el.closest(SCOPE) || el.closest(SKIP)) return null;
    if (el.closest('.nt-panel')) return null;
    if (el.matches?.('input[data-num]')) return el.value && /\d/.test(el.value) ? { el, text: tokensIn(el.value)[0]?.text ?? el.value, id: `input:${el.id}:${el.value}`, rect: () => el.getBoundingClientRect() } : null;
    if (el.matches?.('select[data-select]')) { const text = el.options[el.selectedIndex]?.textContent ?? ''; const t = tokensIn(text)[0]; return t ? { el, text: t.text, id: `select:${el.dataset.select}:${text}`, rect: () => el.getBoundingClientRect() } : null; }
    let node = null, offset = 0;
    if (document.caretPositionFromPoint) { const pos = document.caretPositionFromPoint(x, y); node = pos?.offsetNode; offset = pos?.offset ?? 0; }
    else if (document.caretRangeFromPoint) { const pos = document.caretRangeFromPoint(x, y); node = pos?.startContainer; offset = pos?.startOffset ?? 0; }
    if (el.namespaceURI === NS && el.tagName.toLowerCase() === 'text') { const t = tokensIn(el.textContent)[0]; return t ? { el, text: t.text, id: `svg:${el.textContent}:${el.getAttribute('x')}:${el.getAttribute('y')}`, rect: () => el.getBoundingClientRect() } : null; }
    if (!node || node.nodeType !== 3) return null;
    const owner = node.parentElement;
    if (!owner?.closest(SCOPE) || owner.closest(SKIP)) return null;
    const tokens = tokensIn(node.data);
    const t = tokens.find(k => offset >= k.start && offset <= k.end);
    if (!t) {
      // No number here. A result word still has a reason.
      const out = owner.closest('[data-out]');
      const box = (out && WORD_OUT.has(out.dataset.out) && out) || owner.closest('[data-chip], .pill, .map .cell, .compare td, .dstack td');
      if (!box || box.closest(SKIP)) return null;
      const text = box.matches('.map .cell') ? box.firstChild?.textContent?.trim() : box.textContent.trim();
      if (!text || text.length > 160) return null;
      const range = document.createRange(); range.selectNodeContents(node);
      const r = range.getBoundingClientRect();
      if (x < r.left - 3 || x > r.right + 3 || y < r.top - 3 || y > r.bottom + 3) return null;
      return { el: box, text, id: `word:${text}`, word: true, rect: () => (box.isConnected ? box.getBoundingClientRect() : new DOMRect(-99, -99, 0, 0)) };
    }
    const range = document.createRange(); range.setStart(node, t.start); range.setEnd(node, t.end);
    const rect = () => (node.isConnected ? range.getBoundingClientRect() : new DOMRect(-99, -99, 0, 0));
    const r = rect();
    if (x < r.left - 3 || x > r.right + 3 || y < r.top - 3 || y > r.bottom + 3) return null;
    return { el: owner, text: t.text, node, id: `${t.start}:${t.text}`, rect };
  }
  const sameHit = (a, b) => a && b && a.el === b.el && a.id === b.id && (a.node ?? null) === (b.node ?? null);
  const interactive = el => el.closest('button, a, input, select, summary, label, [role="switch"]');

  /* ── Hover ── */
  let raf = 0, restTimer = 0, hideTimer = 0, waiting = null;
  const REST = 110; // the card opens once the cursor rests, so sweeping across a table does not flash cards
  function onMove(ev) {
    if (ev.pointerType === 'touch' || ev.buttons) return;
    pointer = { x: ev.clientX, y: ev.clientY };
    if (raf) return;
    raf = requestAnimationFrame(() => { raf = 0; check(); });
  }
  function check() {
    if (!pointer || !enabled) return;
    if (current && !current.el.isConnected) close(true);
    const top = document.elementFromPoint(pointer.x, pointer.y);
    if (top?.closest('.nt-panel')) { clearTimeout(hideTimer); clearTimeout(restTimer); waiting = null; return; }
    const hit = hitAt(pointer.x, pointer.y);
    document.documentElement.classList.toggle('nt-hit', Boolean(hit));
    if (hit) clearTimeout(hideTimer);
    if (S.tab !== 'home') showCoachOnce();
    if (pinned) return;
    if (hit && sameHit(hit, current)) { clearTimeout(restTimer); waiting = null; return; }
    if (hit) {
      if (!sameHit(hit, waiting)) waiting = hit;
      clearTimeout(restTimer);
      restTimer = setTimeout(() => { if (waiting && sameHit(waiting, hit)) { open(hit); waiting = null; } }, openNow ? 90 : REST);
      return;
    }
    waiting = null; clearTimeout(restTimer);
    // While the voice is talking, the cursor can wander without cutting it off.
    if (openNow && !speaking) { clearTimeout(hideTimer); hideTimer = setTimeout(() => { if (!speaking) close(); }, 260); }
  }
  function open(hit, now = false) {
    try { const info = resolve(hit.text, hit.el); if (hit.word && info.kind === 'unknown') return; show(hit, info, now); }
    catch (err) { console.warn(`Number origins could not trace ${hit.text}: ${err.message}`); }
  }
  document.addEventListener('pointermove', onMove, { passive: true });
  document.addEventListener('scroll', event => {
    if (panel.contains(event.target) || performance.now() < ignoreScrollUntil) return;
    if (pinned && current) { const r = current.rect(); drawRing(r); wire.innerHTML = ''; return; }
    close();
  }, { passive: true, capture: true });
  window.addEventListener('resize', () => close(true));
  document.addEventListener('keydown', ev => { if (ev.key === 'Escape' && openNow) { ev.stopPropagation(); close(true); } }, true);
  document.addEventListener('input', () => { if (!panel.contains(document.activeElement)) close(true); }, true);
  panel.querySelector('.nt-narr').addEventListener('change', ev => { store.write(NARR_KEY, ev.target.value); if (current?.info) narrate(current.info); });
  document.addEventListener('pointerdown', ev => {
    if (panel.contains(ev.target)) return;
    if (ev.target.closest?.('select')) { close(true); return; }
    if (ev.target.closest?.('input[type="range"]')) close(true);
  }, true);

  /* ── Click: keep it open. Touch: tap a number. ── */
  document.addEventListener('click', ev => {
    if (panel.contains(ev.target)) {
      if (ev.target.closest('.nt-close')) return close(true);
      if (ev.target.closest('.nt-off')) return setEnabled(false);
      if (ev.target.closest('[data-prov]')) return close(true);
      if (ev.target.closest('[data-nt-next]')) return tourGo(tour.i + 1);
      if (ev.target.closest('[data-nt-prev]')) return tourGo(tour.i - 1);
      if (ev.target.closest('.nt-play')) { if (speaking) { stopVoice(); clearTimeout(tourTimer); if (tour) tour.auto = false; } else if (current?.info) { if (tour) tour.auto = true; narrate(current.info); } return; }
      if (ev.target.closest('.nt-voice')) {
        if (voiceWanted()) { voiceOn = false; store.write(VOICE_KEY, 'off'); stopVoice(); }
        else { voiceOn = true; store.write(VOICE_KEY, 'on'); if (SOUND.muted) SOUND.enable(); if (current?.info) narrate(current.info); }
        return paintPlayer();
      }
      if (ev.target.closest('.nt-rate')) { rate = RATES[(RATES.indexOf(rate) + 1) % RATES.length]; store.write(RATE_KEY, String(rate)); return paintPlayer(); }
      const more = ev.target.closest('[data-nt-more]');
      if (more) { const table = more.closest('table'); table.querySelectorAll('.nt-fold').forEach(tr => { tr.hidden = false; }); more.closest('tr').remove(); if (current?.info) drawInner(current.info, false); }
      return;
    }
    if (ev.target === toggleBtn) return setEnabled(!enabled);
    if (ev.target.closest?.('#nt-explain')) return startTour();
    const chart = ev.target.closest?.('[data-chart]');
    if (chart && enabled && ev.pointerType !== 'touch' && CH[chart.dataset.chart]) return openChart(chart, ev);
    if (!enabled || S.tab === 'home') return;
    if (String(getSelection?.() ?? '').length) return;
    const hit = hitAt(ev.clientX, ev.clientY);
    if (hit && !interactive(hit.el)) {
      if (openNow && sameHit(hit, current)) { pinned = true; if (!speaking && current.info?.auto && voiceWanted() && voices.length) narrate(current.info); return; }
      clearTimeout(tourTimer); tour = null; paintTour();
      pinned = false; open(hit, true); pinned = true; return;
    }
    if (openNow) close(true);
  });
  // Changing step or tab removes the number the card is about.
  addEventListener('hashchange', () => close(true));

  /* ── A point on a chart ── */
  function openChart(wrap, ev) {
    const cfg = CH[wrap.dataset.chart];
    const row = cfg.rows[cfg.idx ?? 0]; if (!row) return;
    const rec = MONTH_ROWS.find(m => m.p === row.period);
    const cols = cfg.series.map(s => ROW_COL[s.k]).filter(Boolean);
    const stack = wrap.closest('.dcard');
    const id = stack?.querySelector('.dcard-t code')?.textContent?.trim();
    const info = { auto: false, value: cfg.tipX(row), name: stack?.querySelector('.dcard-t b')?.textContent?.trim() ?? '', kind: 'saved', rail: rec && cols.length ? ['xl', 'snap', 'ui'] : ['py', 'snap', 'ui'], src: Q[id] ? [id] : [], links: [],
      what: `The saved values behind this point of the chart${Q[id] ? `, from ${id}` : ''}.`,
      cards: [rec && cols.length ? sheet(cols, [rec.row - 1, rec.row, rec.row + 1].filter(wbRow), cols.map(col => `${col}${rec.row}`)) : table(`Saved row${Q[id] ? ` · ${id}` : ''}`, ['Series', 'Saved value'], cfg.series.map(s => [e(s.label), e(cfg.yFmt(row[s.k]))])), Q[id] ? madeNote(id) : null] };
    const x = ev.clientX, y = ev.clientY;
    pinned = false; show({ el: wrap, id: `chart:${cfg.idx}`, text: info.value, rect: () => new DOMRect(x - 4, y - 4, 8, 8) }, { ...finish(info, wrap), auto: false }); pinned = true;
    hideTip();
  }

  /* ── First-time hint ── */
  let coach = null, coachTimer = 0;
  function showCoachOnce() {
    if (coach || store.read(`${KEY}-seen`)) return;
    store.write(`${KEY}-seen`, '1');
    coach = Object.assign(document.createElement('div'), { className: 'nt-coach', textContent: 'Press Explain at the top, or rest the cursor on any number, to hear where it comes from.' });
    coach.setAttribute('role', 'status');
    document.body.appendChild(coach);
    coachTimer = setTimeout(hideCoach, 6000);
  }
  function hideCoach() { if (coach && coach !== 'done') { clearTimeout(coachTimer); coach.remove(); coach = 'done'; } }

  return { tokensIn, resolve, isOpen: () => openNow, close: () => close(true), info: () => current?.info ?? null, hitAt, setEnabled, sceneCount: SCENES.length,
    speaking: () => speaking, tourAt: () => (tour ? [tour.i, tour.items.length] : null), voice: on => { voiceOn = on; if (!on) stopVoice(); }, toSpeech };
})();
