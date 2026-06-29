// Jesse Livermore's method from "How to Trade in Stocks" (1940):
//
//   - Trade the Pivotal Point: round-number "century marks" (50, 100, 200, 300)
//     and fresh highs/lows are where a fast move tends to begin.
//   - Demand follow-through: Livermore required a stock to carry ~3 points
//     beyond the pivot to confirm; a failure to follow through is a
//     "danger signal" that must be heeded.
//   - Trade with the trend. He used "Upward Trend" / "Downward Trend" (not
//     "bullish/bearish"), followed the leading stocks, was patient enough to
//     wait for the pivot, sat tight through minor reactions, and never
//     averaged losses.
//
// Educational heuristics only -- not financial advice.

// A sensible "century mark" increment for the asset's price scale, so the
// idea of round-number pivots works for a $0.50 coin and a 23,000 index alike.
function pivotStep(price) {
  if (price >= 10000) return 1000;
  if (price >= 1000) return 500;
  if (price >= 100) return 50;
  if (price >= 20) return 10;
  if (price >= 5) return 5;
  if (price >= 1) return 1;
  if (price >= 0.1) return 0.1;
  if (price >= 0.01) return 0.01;
  return 0.001;
}

export function livermoreView(asset) {
  const series =
    asset.spark && asset.spark.length > 2
      ? asset.spark
      : [asset.price, asset.price];
  const P = asset.price;
  const n = series.length;
  const hi = Math.max(...series);
  const lo = Math.min(...series);

  // Trend from two halves of the window: higher highs + higher lows = Upward
  // Trend; lower highs + lower lows = Downward Trend; otherwise sideways.
  const mid = Math.floor(n / 2);
  const a = series.slice(0, mid);
  const b = series.slice(mid);
  const aHi = Math.max(...a);
  const aLo = Math.min(...a);
  const bHi = Math.max(...b);
  const bLo = Math.min(...b);
  let trend = "Sideways - no confirmed trend";
  let dir = 0;
  if (bHi > aHi && bLo > aLo) {
    trend = "Upward Trend";
    dir = 1;
  } else if (bHi < aHi && bLo < aLo) {
    trend = "Downward Trend";
    dir = -1;
  }

  // Round-number pivotal points bracketing the current price.
  const step = pivotStep(P);
  const pivotBelow = Math.floor(P / step) * step;
  const pivotAbove = pivotBelow + step;

  // Confirmation buffer. Livermore's literal rule was ~3 points beyond the
  // pivot, which on a ~100 stock is ~3%. We generalise to ~1% of price so the
  // rule scales across very different price levels.
  const buffer = Math.max(P * 0.01, step * 0.03);

  const longTrigger = pivotAbove + buffer; // confirmed break up
  const breakdown = pivotBelow - buffer; // confirmed break down
  const nearAbove = P >= pivotAbove - buffer && P < pivotAbove + buffer;
  const nearBelow = P <= pivotBelow + buffer && P > pivotBelow - buffer;

  const mom = series.length > 1 ? P / series[0] - 1 : 0;

  let signal;
  if (dir > 0 && P >= hi - buffer) {
    signal =
      "Upward Trend pressing old highs - the line of least resistance is up.";
  } else if (dir < 0 && P <= lo + buffer) {
    signal =
      "Downward Trend pressing old lows - the line of least resistance is down.";
  } else if (nearAbove) {
    signal =
      "At a pivotal point - wait for follow-through above the long trigger before acting.";
  } else if (nearBelow) {
    signal =
      "At a pivotal point - a clean break of the breakdown level is a danger signal.";
  } else {
    signal = "Between pivots - be patient and wait for the next pivotal point.";
  }

  return {
    trend,
    dir,
    pivotAbove,
    pivotBelow,
    buffer,
    longTrigger,
    breakdown,
    swingHigh: hi,
    swingLow: lo,
    mom,
    signal,
  };
}
