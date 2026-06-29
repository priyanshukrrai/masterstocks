// Random-walk / fair-game model from Louis Bachelier's "Theorie de la
// speculation" (1900), as presented in *Speculation: Louis Bachelier and the
// Origins of Mathematical Finance* (Princeton University Press, 2006):
//
//   - "The mathematical expectation of the speculator is zero." The market is
//     a fair game (a martingale): today's price is the best estimate of the
//     future price -- Bachelier's "true price".
//   - Law of differences / square-root-of-time law: the spread of prices grows
//     in direct proportion to the square root of the elapsed time, so the
//     standard deviation over t bars is sigma * sqrt(t).
//   - Price deviations follow the Gaussian law ("radiation of probability").
//
// Educational heuristics only -- not financial advice.

import { logReturns, stdev, normCdf } from "./quant";

function sigmaPerBar(asset) {
  const series =
    asset.spark && asset.spark.length > 2
      ? asset.spark
      : [asset.price, asset.price];
  return stdev(logReturns(series));
}

// Expected price (fair game = current price) and the +/-1 and +/-2 sigma price
// cones t bars into the future, using the square-root-of-time law.
export function bachelierView(asset, horizonBars) {
  const sigBar = sigmaPerBar(asset);
  const P = asset.price;
  const t = horizonBars || 1;
  const sigT = sigBar * Math.sqrt(t); // square-root-of-time law
  return {
    sigBar,
    sigT,
    t,
    expected: P, // martingale: best estimate of future price is today's price
    up1: P * Math.exp(sigT),
    dn1: P * Math.exp(-sigT),
    up2: P * Math.exp(2 * sigT),
    dn2: P * Math.exp(-2 * sigT),
    probUp: 0.5, // zero-drift fair game
    barLabel: asset.barLabel || "bar",
  };
}

// Probability that, t bars out, the price ends ABOVE a target level K under
// the fair game (zero drift, lognormal): P(S_t > K) = N( ln(P/K) / (sigma*sqrt(t)) ).
export function probAbove(asset, K, horizonBars) {
  const sigBar = sigmaPerBar(asset);
  const t = horizonBars || 1;
  const sigT = sigBar * Math.sqrt(t);
  if (sigT <= 0) return asset.price > K ? 1 : 0;
  return normCdf(Math.log(asset.price / K) / sigT);
}

// Fair-game probability of reaching the target before the stop, from the
// gambler's-ruin result for a driftless (symmetric) random walk:
//   P(hit target first) = distanceToStop / (distanceToStop + distanceToTarget).
// This makes Bachelier's "expectation is zero" explicit: the edge must come
// from being right about direction, not from the payoff geometry alone.
export function ruinProb(entry, stop, target) {
  const dStop = Math.abs(entry - stop);
  const dTarget = Math.abs(target - entry);
  const denom = dStop + dTarget;
  if (denom <= 0) return 0.5;
  return dStop / denom;
}
