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
