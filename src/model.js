// Calculation rules for the Developer-level studio (same rules as the User level).
// Copied line-for-line from the V3 app so the dashboards give identical numbers:
//   policyState, selectRq2, rq2CaptureChoices -> V3_DASHBOARD_APP/src/content/dashboard/evidence-model.mjs
//   fundingAmounts                            -> V3_DASHBOARD_APP/src/content/dashboard/funding-arithmetic.mjs
//   rq2CaseSettings                           -> V3_DASHBOARD_APP/src/content/dashboard/rq2-case-settings.mjs
//   wplImpact                                 -> V3_DASHBOARD_APP/src/content/dashboard/wpl-model.mjs
// Controls never rerun the research models; they read the reviewed snapshot.

export function rq2CaptureChoices(queries, horizon, baselineCapture = 1) {
  const values = (queries.rq2_capture?.rows ?? [])
    .filter(row => Number(row['Horizon (months)']) === Number(horizon))
    .map(row => Number(row['Savings capture']));
  if (queries[`rq2_scenarios_${horizon}m`]?.rows?.length) values.push(baselineCapture);
  return [...new Set(values)].sort((a, b) => a - b);
}

export function selectRq2(queries, horizon, scenario, capture, baselineCapture = 1) {
  const baselineId = `rq2_scenarios_${horizon}m`;
  const sameScenario = row => String(row.Scenario).trim().startsWith(scenario);
  if (Math.abs(Number(capture) - Number(baselineCapture)) < 1e-8) {
    const row = queries[baselineId]?.rows?.find(sameScenario);
    return { queryId: baselineId, row, solvency: row?.solvency_prob, survival6m: row?.p6_months,
      cvar: row?.cvar95_rm_m, median: row?.median_end };
  }
  const row = queries.rq2_capture?.rows?.find(row => sameScenario(row)
    && Number(row['Horizon (months)']) === Number(horizon)
    && Math.abs(Number(row['Savings capture']) - Number(capture)) < 1e-8);
  return { queryId: 'rq2_capture', row, solvency: row?.['Solvency prob'], survival6m: row?.['P(survive ≥6m)'],
    cvar: row?.cvar95_rm_m, median: row?.median_end };
}

export function policyState({ mops, pme, fund, b30Auth }, assumptions) {
  const gap = Number(mops) - Number(pme);
  const fundThreshold = Number(assumptions.fundSafetyMultiple) * Number(assumptions.rolling12AvgB20DrawdownRmMn);
  const fundSafe = Number(fund) > fundThreshold;
  const pricePass = gap > Number(assumptions.b30GapThreshold);
  let mandate = 'B20';
  let decisionReason = 'Keep B20: one or more B30 checks fail.';
  if (pricePass && fundSafe && b30Auth) {
    mandate = 'B30'; decisionReason = 'B30: price, fund and assumed approval checks all pass.';
  } else if (gap < Number(assumptions.b15GapFloor) && !fundSafe) {
    mandate = 'B15'; decisionReason = 'B15 is proposed because the price gap and fund balance are below their limits. Government approval is still needed.';
  } else if (pricePass && fundSafe && !b30Auth) {
    decisionReason = 'Keep B20: price and fund checks pass, but B30 approval is not assumed.';
  } else if (!pricePass) {
    decisionReason = 'Keep B20: the price gap is not above the B30 limit.';
  }
  return { gap, fundThreshold, fundSafe, pricePass, mandate, decisionReason };
}

export function fundingAmounts({ baseProductionMt, productionPct, bslRate, savingsEstimate, savingsShare, startingMoney }) {
  const productionMt = Number(baseProductionMt) * Number(productionPct) / 100;
  const bslRevenue = productionMt * Number(bslRate);
  const paidSavings = Number(savingsEstimate) * Number(savingsShare);
  const fundingEstimate = bslRevenue + paidSavings;
  return {
    productionMt,
    bslRevenue,
    paidSavings,
    fundingEstimate,
    withStartingMoney: fundingEstimate + Number(startingMoney),
  };
}

// WPL baseline reference only: per-tonne levy above the price threshold. Never added to the BSF.
export function wplImpact(price, threshold, ratePercent, enabled, volume, baselinePercent = 3) {
  const excess = Math.max(0, price - threshold);
  const baseline = excess * baselinePercent / 100;
  const selected = enabled ? excess * ratePercent / 100 : 0;
  const tonnes = volume === '' || volume === null ? null : Number(volume);
  const validVolume = tonnes !== null && Number.isFinite(tonnes) && tonnes >= 0;
  return { excess, baseline, selected, delta: selected - baseline,
    total: !enabled ? 0 : validVolume ? selected * tonnes : null,
    totalDelta: validVolume ? (selected-baseline)*tonnes : null };
}

// Read-only display copies of SCENARIOS in codex_pipeline/v3_config.py.
export const rq2CaseSettings = {
  A: { name: 'Low oil', brentTarget: 80, volatility: 0.90 },
  B: { name: 'Base', brentTarget: 105, volatility: 1.00 },
  C: { name: 'High oil', brentTarget: 135, volatility: 1.10 },
  D: { name: 'Geopolitical shock', brentTarget: 105, volatility: 1.25, jump: 40, reversionMonths: 5, cpoRise: 10 },
};

// Fitted APM-Bio cost equation (OLS-HAC, rq1_coefficients):
// PME_COST = const + b1·CPO(t−1) + b2·Methanol(t) + b3·Glycerol(t)
export function fittedPme(coefficients, { cpoLag, methanol, glycerol }) {
  const c = key => Number(coefficients.find(row => row.Variable === key)?.Coefficient);
  return c('const') + c('cpo_lag1') * Number(cpoLag) + c('meoh_rm') * Number(methanol) + c('gly_rm') * Number(glycerol);
}

// Formatters match V3 (en-MY grouping, "RM 4,004.93/t").
export const num = value => Number(value ?? 0);
export const rm = (value, digits = 0) => `RM ${num(value).toLocaleString('en-MY', { maximumFractionDigits: digits, minimumFractionDigits: digits })}`;
export const rmT = (value, digits = 0) => `${rm(value, digits)}/t`;
export const rmMn = (value, digits = 0) => `${rm(value, digits)} mn`;
export const pct = (value, digits = 1) => `${(num(value) * 100).toFixed(digits)}%`;
export const signedRmT = value => `${num(value) >= 0 ? '+' : '−'}${rm(Math.abs(num(value)), 2)}/t`;
export const scenarioName = value => ({ A: 'Low oil', B: 'Base', C: 'High oil', D: 'Geopolitical shock' })[String(value).trim()[0]] ?? value;
