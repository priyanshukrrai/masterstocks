// ICT (Inner Circle Trader) read for an asset, derived from the recent price
// series (sparkline). This follows real ICT logic: market structure (BOS/CHoCH),
// draw on liquidity (BSL/SSL), premium/discount + equilibrium, OTE retracement
// (62-79%), order blocks, fair value gaps, liquidity sweeps and EST kill zones.
//
// The ICT read is then FUSED with the four book models so the numbers it returns
// are concept-driven, not cosmetic side panels:
//   - Quant (Bell)        -> stops/targets scaled by realised volatility (sigma
//                            of log returns) and a mean-reversion z-score guard.
//   - Bachelier (1900)    -> a genuine fair-game probability of reaching the
//                            target before the stop (gambler's-ruin geometry).
//   - Livermore (1940)    -> pivotal-point confirmation trigger + trend filter.
//   - Neuroeconomics 2008 -> Kelly sizing + loss-aversion discipline flag.
// The fair game is the neutral baseline (zero expectancy); ICT/Livermore/Quant
// confluence is what tilts the probability to create an edge over it.
//
// Educational heuristic ONLY. ICT is a probabilistic framework, not a guarantee
// \u2014 no method is truly \u201cno-loss\u201d. This is not financial advice.

import { quantStats } from "./quant";
import { ruinProb } from "./bachelier";
import { livermoreView } from "./livermore";
import { neuroView } from "./neuro";

const OTE_LEVELS = [0.62, 0.705, 0.79];
const PHASE_MAP = {
  Asia: "Accumulation (Asian range)",
  London: "Manipulation (Judas swing)",
  NY: "Distribution (expansion)",
  Off: "Off-session \u2014 patience",
};

const VOL_STOP_K = 1.5; // stop sits at least 1.5 per-bar sigma beyond liquidity
const Z_EXTENDED = 1.5; // |z| above this = price stretched from its mean
const MAX_TILT = 0.18; // most the confluence can move the fair-game probability

function clamp(x, lo, hi) {
  return Math.max(lo, Math.min(hi, x));
}

// Kill zones framed in New York time (EST, UTC-5; DST ignored for simplicity).
export function killZone(now = new Date()) {
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
  const est = new Date(utcMs - 5 * 3600000);
  const h = est.getUTCHours() + est.getUTCMinutes() / 60;
  if (h >= 2 && h < 5)
    return {
      on: true,
      name: "London Open (02:00-05:00 EST)",
      session: "London",
    };
  if (h >= 7 && h < 10)
    return { on: true, name: "New York AM (07:00-10:00 EST)", session: "NY" };
  if (h >= 10 && h < 12)
    return {
      on: true,
      name: "London Close (10:00-12:00 EST)",
      session: "London",
    };
  if (h >= 13.5 && h < 16)
    return { on: true, name: "New York PM (13:30-16:00 EST)", session: "NY" };
  if (h >= 20)
    return {
      on: false,
      name: "Asian range (20:00-00:00 EST)",
      session: "Asia",
    };
  return { on: false, name: "Outside primary kill zones", session: "Off" };
}

// Market structure read from two halves of the series: higher highs/lows = bullish
// BOS, lower highs/lows = bearish BOS, otherwise expansion or consolidation/CHoCH.
function readStructure(spark) {
  const n = spark.length;
  if (n < 4) return { dir: 0, label: "Insufficient data" };
  const mid = Math.floor(n / 2);
  const a = spark.slice(0, mid);
  const b = spark.slice(mid);
  const aHi = Math.max(...a);
  const aLo = Math.min(...a);
  const bHi = Math.max(...b);
  const bLo = Math.min(...b);
  if (bHi > aHi && bLo > aLo) return { dir: 1, label: "Bullish BOS (HH/HL)" };
  if (bHi < aHi && bLo < aLo) return { dir: -1, label: "Bearish BOS (LH/LL)" };
  if (bHi > aHi && bLo < aLo)
    return { dir: 0, label: "Expansion \u2014 liquidity grab both sides" };
  return { dir: 0, label: "Consolidation (CHoCH risk)" };
}

// Most recent significant 3-point displacement = fair value gap (imbalance).
function findFVG(spark, bullish) {
  const n = spark.length;
  if (n < 3) return null;
  let total = 0;
  let count = 0;
  for (let i = 1; i < n - 1; i++) {
    total += Math.abs(spark[i + 1] - spark[i - 1]);
    count++;
  }
  const avg = count ? total / count : 0;
  if (!avg) return null;
  for (let i = n - 2; i >= 1; i--) {
    const disp = spark[i + 1] - spark[i - 1];
    const ok = bullish ? disp > avg * 1.4 : disp < -avg * 1.4;
    if (ok) {
      const x = spark[i - 1];
      const y = spark[i + 1];
      return { lo: Math.min(x, y), hi: Math.max(x, y), mid: (x + y) / 2 };
    }
  }
  return null;
}

// Small wrapper so the factors array reads cleanly below.
function killZoneOn() {
  return killZone().on;
}

export function ictEdge(asset) {
  const spark =
    asset.spark && asset.spark.length
      ? asset.spark
      : [asset.price, asset.price];
  const n = spark.length;
  const hi = Math.max(...spark);
  const lo = Math.min(...spark);
  const eq = (hi + lo) / 2;
  const price = asset.price;
  const range = hi - lo || price * 0.01;

  // --- Bias from market structure, with 24h change as a tie-breaker ---
  const structure = readStructure(spark);
  let dir = structure.dir;
  if (dir === 0) dir = asset.chg >= 0 ? 1 : -1;
  const bias = dir >= 0 ? "Bullish" : "Bearish";
  const isLong = bias === "Bullish";

  // --- Premium / discount relative to equilibrium ---
  const zone = price >= eq ? "Premium" : "Discount";
  const inZone = (isLong && price <= eq) || (!isLong && price >= eq);

  // --- Draw on liquidity (BSL above highs, SSL below lows) ---
  const bsl = hi;
  const ssl = lo;
  const draw = isLong ? "Buy-side (old highs)" : "Sell-side (old lows)";

  // --- Liquidity sweep: opposing extreme formed late then reversed ---
  const iHi = spark.indexOf(hi);
  const iLo = spark.indexOf(lo);
  let sweep = "No fresh sweep \u2014 wait for the raid";
  if (isLong && iLo >= n * 0.6) sweep = "Sell-side swept \u2192 bullish intent";
  else if (!isLong && iHi >= n * 0.6)
    sweep = "Buy-side swept \u2192 bearish intent";
  const sweepPresent = !sweep.startsWith("No");

  // --- OTE retracement (62-79%) into discount (bull) / premium (bear) ---
  let ote;
  if (isLong) ote = OTE_LEVELS.map((f) => hi - range * f);
  else ote = OTE_LEVELS.map((f) => lo + range * f);
  const entry = ote[1];
  const t1 = eq;

  // ===================================================================
  // QUANT (Steve Bell) \u2014 realised volatility scales the risk geometry.
  // ===================================================================
  const q = quantStats(asset);
  const sigBar = q.sigBar; // per-bar volatility (sigma of log returns)
  const z = q.z; // mean-reversion z-score vs the recent average
  // Volatility cushion in price terms (\u2248 VOL_STOP_K per-bar sigmas).
  const volStop = sigBar > 0 ? price * (Math.exp(VOL_STOP_K * sigBar) - 1) : 0;
  // Stop = beyond the swing liquidity AND beyond market noise (whichever is
  // wider), so normal volatility does not stop you out prematurely.
  let stop;
  let t2;
  if (isLong) {
    stop = Math.min(lo - range * 0.05, entry - volStop);
    t2 = hi + range * 0.1;
  } else {
    stop = Math.max(hi + range * 0.05, entry + volStop);
    t2 = lo - range * 0.1;
  }
  // Over-extension guard: a fresh long into a stretched-up tape (or short into
  // a stretched-down tape) is exactly the trade Bell's mean-reversion warns on.
  const overExtended =
    (isLong && z > Z_EXTENDED) || (!isLong && z < -Z_EXTENDED);

  // --- Order block / FVG origin ---
  const fvg = findFVG(spark, isLong);
  let ob = entry;
  if (fvg) ob = isLong ? fvg.lo : fvg.hi;

  // --- Risk : reward to the liquidity target ---
  const risk = Math.abs(entry - stop) || range * 0.1;
  const reward = Math.abs(t2 - entry);
  const rrNum = reward / risk;
  const rr = rrNum.toFixed(2);

  // ===================================================================
  // LIVERMORE \u2014 pivotal-point confirmation + trend filter.
  // ===================================================================
  const lv = livermoreView(asset);
  const trendConfirmed = (isLong && lv.dir > 0) || (!isLong && lv.dir < 0);
  // The entry only "arms" once price confirms beyond the pivotal point.
  const trigger = isLong ? lv.longTrigger : lv.breakdown;

  // ===================================================================
  // BACHELIER \u2014 fair-game baseline, then tilt it with the ICT edge.
  // ===================================================================
  // Neutral, zero-expectancy probability of hitting the target before the stop.
  const probFair = ruinProb(entry, stop, t2);
  // Directional confluence that legitimately tilts the odds off 50/50.
  const factors = [
    structure.dir !== 0 && structure.dir > 0 === isLong, // structure confirms
    inZone, // entering from the right side of equilibrium
    sweepPresent, // liquidity has been taken
    trendConfirmed, // Livermore trend agrees
    killZoneOn(), // timing inside a kill zone
    !overExtended, // not stretched (quant)
  ];
  const agree = factors.filter(Boolean).length;
  const tilt = (agree / factors.length - 0.5) * 2 * MAX_TILT;
  const prob = clamp(probFair + tilt, 0.05, 0.95);
  const confidence = Math.round(prob * 100);

  // ===================================================================
  // NEUROECONOMICS \u2014 expectancy, Kelly sizing, loss-aversion discipline.
  // ===================================================================
  const nu = neuroView({ entry, stop, target: t2, winProb: prob });
  const expR = nu.evR; // expected value per unit risked, using the edge prob
  const kelly = nu.kelly; // fraction of capital Kelly would allocate
  const lossAversionGap = nu.lossAversionGap;

  // --- Fused setup grade: ICT confluence + the four book filters ---
  const kill = killZone();
  const phase = PHASE_MAP[kill.session] || PHASE_MAP.Off;
  let score = 0;
  if (kill.on) score++; // ICT timing
  if (inZone) score++; // ICT location
  if (sweepPresent) score++; // ICT liquidity
  if (structure.dir !== 0) score++; // ICT structure
  if (trendConfirmed) score++; // Livermore
  if (!overExtended) score++; // Quant
  if (expR > 0) score++; // Bachelier-baselined positive expectancy
  if (kelly > 0) score++; // Neuro: sizing is viable
  const scoreMax = 8;
  const grade =
    score >= 6
      ? "A \u2014 high-probability alignment"
      : score >= 4
        ? "B \u2014 partial alignment"
        : "C \u2014 wait for confluence";

  return {
    // --- original ICT fields (unchanged shape) ---
    zone,
    bias,
    isLong,
    structure: structure.label,
    inZone,
    draw,
    bsl,
    ssl,
    sweep,
    sweepPresent,
    phase,
    eq,
    ote,
    entry,
    ob,
    fvg,
    stop,
    t1,
    t2,
    rr,
    rrNum,
    grade,
    score,
    scoreMax,
    kill,
    // --- Quant (Bell) ---
    sigBar,
    sigAnnual: q.sigAnnual,
    z,
    overExtended,
    volStop,
    barLabel: q.barLabel,
    // --- Bachelier ---
    probFair,
    prob,
    confidence,
    tilt,
    agree,
    factorCount: factors.length,
    // --- Livermore ---
    trend: lv.trend,
    trendConfirmed,
    trigger,
    pivotAbove: lv.pivotAbove,
    pivotBelow: lv.pivotBelow,
    livermoreSignal: lv.signal,
    // --- Neuroeconomics ---
    expR,
    kelly,
    lossAversionGap,
  };
}
