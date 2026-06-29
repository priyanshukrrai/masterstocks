// Quantitative analytics grounded in "Quantitative Finance For Dummies"
// (Steve Bell, 2016):
//   - Returns and log returns (Ch. 4: Sizing Up Interest Rates, Shares & Bonds)
//   - Volatility as the standard deviation of returns, annualised by the
//     square root of time (Ch. 7: Reading the Market's Mood: Volatility)
//   - The Sharpe ratio and maximum drawdown (Ch. 13-14: Risk & Portfolio)
//   - Parametric Value at Risk under the Gaussian model (Ch. 15: Value at Risk)
//
// Educational heuristics only -- not financial advice.

// Continuously-compounded (log) returns of a price series.
export function logReturns(series) {
  const out = [];
  for (let i = 1; i < series.length; i++) {
    const a = series[i - 1];
    const b = series[i];
    if (a > 0 && b > 0) out.push(Math.log(b / a));
  }
  return out;
}

export function mean(xs) {
  if (!xs.length) return 0;
  return xs.reduce((s, x) => s + x, 0) / xs.length;
}

// Sample standard deviation (n - 1 in the denominator).
export function stdev(xs) {
  const n = xs.length;
  if (n < 2) return 0;
  const m = mean(xs);
  const v = xs.reduce((s, x) => s + (x - m) * (x - m), 0) / (n - 1);
  return Math.sqrt(v);
}

// Standard normal CDF (Abramowitz & Stegun 7.1.26 approximation).
export function normCdf(x) {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989422804014327 * Math.exp((-x * x) / 2);
  let p =
    d *
    t *
    (0.31938153 +
      t *
        (-0.356563782 +
          t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  p = 1 - p;
  return x >= 0 ? p : 1 - p;
}

// Simple moving average of the last k points.
export function sma(series, k) {
  if (!series.length) return 0;
  if (series.length < k) return mean(series);
  return mean(series.slice(-k));
}

// Maximum drawdown as a (negative) fraction of the running peak.
export function maxDrawdown(series) {
  let peak = series[0] || 0;
  let mdd = 0;
  for (const p of series) {
    if (p > peak) peak = p;
    if (peak > 0) {
      const dd = (p - peak) / peak;
      if (dd < mdd) mdd = dd;
    }
  }
  return mdd;
}

// Full quant read for one asset, computed from its price series (sparkline).
// annualFactor = sqrt(bars per year) for the series' sampling interval, so
// annualised volatility = per-bar volatility x annualFactor (the square-root
// of time rule). barLabel names the interval ("day", "hour").
export function quantStats(asset) {
  const series =
    asset.spark && asset.spark.length > 2
      ? asset.spark
      : [asset.price, asset.price];
  const rets = logReturns(series);
  const af = asset.annualFactor || Math.sqrt(252);
  const barLabel = asset.barLabel || "bar";

  const muBar = mean(rets); // mean log return per bar
  const sigBar = stdev(rets); // volatility per bar
  const sigAnnual = sigBar * af; // annualised volatility
  const driftAnnual = muBar * af * af; // annualised mean return (x bars/year)

  // Sharpe ratio (risk-free rate taken as 0), annualised.
  const sharpe = sigBar > 0 ? (muBar / sigBar) * af : 0;

  const mdd = maxDrawdown(series);

  // Mean-reversion z-score: how many per-bar sigmas the price sits from its
  // own recent moving average.
  const k = Math.min(series.length, 20);
  const ref = sma(series, k);
  const z = sigBar > 0 && ref > 0 ? Math.log(asset.price / ref) / sigBar : 0;

  // Parametric (Gaussian) 1-bar Value at Risk, as a positive loss fraction.
  const Z95 = 1.6448536269514722;
  const Z99 = 2.326347874040841;
  const var95 = Z95 * sigBar - muBar;
  const var99 = Z99 * sigBar - muBar;

  // Cumulative momentum over the visible window.
  const mom = series.length > 1 ? asset.price / series[0] - 1 : 0;

  return {
    sigBar,
    sigAnnual,
    muBar,
    driftAnnual,
    sharpe,
    mdd,
    z,
    ref,
    var95,
    var99,
    mom,
    barLabel,
    n: rets.length,
  };
}
