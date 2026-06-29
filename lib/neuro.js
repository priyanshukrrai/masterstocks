// Behavioural / decision-quality lens from *Neuroeconomics: Decision Making
// and the Brain* (Glimcher, Camerer, Poldrack & Fehr, 2008):
//
//   - Expected Utility theory and its documented violations (the Allais
//     paradox; Ellsberg's ambiguity aversion).
//   - Prospect Theory (Kahneman & Tversky, 1979): outcomes are judged as gains
//     and losses around a reference point, with diminishing sensitivity and
//     loss aversion -- "losses loom larger than gains". Tversky & Kahneman's
//     (1992) estimates: value curvature alpha = beta = 0.88 and loss-aversion
//     coefficient lambda ~= 2.25.
//   - Dopamine encodes a reward-prediction error (Schultz): the brain reacts
//     to outcomes relative to expectation, which is why chasing and revenge
//     trading are so tempting -- and why discipline must override impulse.
//
// Educational heuristics only -- not financial advice.

const ALPHA = 0.88; // diminishing sensitivity to gains
const BETA = 0.88; // diminishing sensitivity to losses
export const LAMBDA = 2.25; // loss-aversion coefficient

// Prospect-theory value function (Tversky & Kahneman, 1992).
export function ptValue(x) {
  if (x >= 0) return Math.pow(x, ALPHA);
  return -LAMBDA * Math.pow(-x, BETA);
}

// Decision read for a setup defined by entry / stop / target and a win
// probability (e.g. Bachelier's fair-game ruin probability).
export function neuroView({ entry, stop, target, winProb }) {
  const reward = Math.abs(target - entry);
  const risk = Math.abs(entry - stop) || reward * 0.5 || 1;
  const rr = reward / risk; // reward-to-risk in units of risk
  const p = Math.min(Math.max(winProb == null ? 0.5 : winProb, 0.01), 0.99);

  // Rational expected value per 1 unit risked.
  const evR = p * rr - (1 - p) * 1;

  // Loss-averse "felt" value of the same bet under prospect theory, measured
  // in units of risk: a win is valued v(rr), a loss is valued v(-1) = -lambda.
  const u = p * ptValue(rr) + (1 - p) * ptValue(-1);

  // Kelly fraction for sizing (never add to a loser -> floored at 0).
  const b = rr;
  const kelly = b > 0 ? Math.max(0, (p * (b + 1) - 1) / b) : 0;

  // When the bet is rationally positive but feels negative, loss aversion is
  // the thing standing between the trader and the plan.
  const lossAversionGap = evR > 0 && u < 0;

  return { rr, p, evR, u, kelly, lambda: LAMBDA, lossAversionGap };
}

// Risk-first position sizing: risk a fixed fraction of the account on the
// distance from entry to stop ("never average losses" -> size once, up front).
export function positionSize({ account, riskPct, entry, stop }) {
  const riskAmt = (account || 0) * ((riskPct || 0) / 100);
  const perUnit = Math.abs(entry - stop);
  if (perUnit <= 0) return { riskAmt, units: 0, notional: 0 };
  const units = riskAmt / perUnit;
  return { riskAmt, units, notional: units * entry };
}
