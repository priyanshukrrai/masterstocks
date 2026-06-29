// Trade decision engine.
//
// This does NOT invent a new signal -- it synthesises the four book-grounded
// reads now FUSED inside the ICT edge into one clear, honest verdict:
//   - ICT      : direction (bias), location (OTE / discount-premium), liquidity
//   - Livermore: trend agreement + a pivotal-point confirmation trigger
//   - Quant    : whether price is over-extended (mean-reversion z-score)
//   - Bachelier/Neuro: the fair-game baseline, the edge-tilted win probability
//                      and the resulting expectancy (an edge is required)
//
// It returns concrete price levels for WHERE to take an entry and explicit
// conditions for when NOT to. Educational heuristic only -- not financial advice.

function num(x, fallback = 0) {
  const n = Number(x);
  return isFinite(n) ? n : fallback;
}

export function tradePlan(asset, { edge, q, lv, ruin, nu }) {
  const price = asset.price;
  const isLong = edge.bias === "Bullish";
  const dir = isLong ? "Long" : "Short";
  const rr = num(edge.rr);
  const z = num(edge.z != null ? edge.z : q.z);
  const upTrend = /up/i.test(lv.trend);
  const downTrend = /down/i.test(lv.trend);

  // Edge-tilted win probability and expectancy from the fused ICT read, with
  // the neutral fair-game probability as a fallback.
  const winProb = edge.prob != null ? num(edge.prob, 0.5) : num(ruin, 0.5);
  const expR = edge.expR != null ? num(edge.expR) : num(nu && nu.evR);
  const kelly = edge.kelly != null ? num(edge.kelly) : num(nu && nu.kelly);

  // Optimal entry zone = the OTE / order-block pocket (discount for a long,
  // premium for a short).
  const zoneLo = Math.min(edge.entry, edge.ob);
  const zoneHi = Math.max(edge.entry, edge.ob);

  // Confirmation trigger from Livermore's pivotal points.
  const trigger =
    edge.trigger != null
      ? edge.trigger
      : isLong
        ? lv.longTrigger
        : lv.breakdown;
  const invalidation = edge.stop;

  // --- Confluence checklist (each true point strengthens the case) ---
  const checklist = [];
  const trendOk =
    edge.trendConfirmed != null
      ? edge.trendConfirmed
      : isLong
        ? upTrend
        : downTrend;
  checklist.push({
    ok: trendOk,
    label: trendOk
      ? "Livermore trend agrees with the ICT " +
        edge.bias.toLowerCase() +
        " bias"
      : "Trend conflicts with bias (" + lv.trend + " vs " + edge.bias + ")",
  });
  checklist.push({
    ok: edge.inZone,
    label: edge.inZone
      ? "Price is in the " + edge.zone.toLowerCase() + " zone (good location)"
      : "Price is in " +
        edge.zone +
        " \u2014 wrong side of equilibrium for entry",
  });
  const sweptOk = !edge.sweep.startsWith("No");
  checklist.push({
    ok: sweptOk,
    label: sweptOk
      ? edge.sweep
      : "No liquidity sweep yet \u2014 wait for the raid",
  });
  const rrOk = rr >= 2;
  checklist.push({
    ok: rrOk,
    label:
      "Risk:reward to Target 2 is 1:" +
      rr.toFixed(2) +
      (rrOk ? "" : " (below 1:2)"),
  });
  const extended =
    edge.overExtended != null ? edge.overExtended : isLong ? z > 1.5 : z < -1.5;
  checklist.push({
    ok: !extended,
    label: extended
      ? "Over-extended (z=" + z.toFixed(2) + ") \u2014 chasing risk"
      : "Not over-extended (z=" + z.toFixed(2) + ")",
  });
  const edgeOk = expR > 0;
  checklist.push({
    ok: edgeOk,
    label: edgeOk
      ? "Positive expectancy over a fair game (E=+" +
        expR.toFixed(2) +
        "R, win " +
        Math.round(winProb * 100) +
        "%)"
      : "No edge over a fair game (E=" + expR.toFixed(2) + "R)",
  });

  const score = checklist.filter((c) => c.ok).length;

  // --- Hard gates that override the score ---
  const invalidated = isLong ? price < invalidation : price > invalidation;
  const pastTarget = isLong ? price >= edge.t2 : price <= edge.t2;
  const pastT1 = isLong ? price >= edge.t1 : price <= edge.t1;

  let tone, action, headline;
  if (invalidated) {
    tone = "stop";
    action = "NO ENTRY \u2014 setup invalidated";
    headline =
      "Price has broken beyond the protective stop. The idea is dead; wait for a fresh setup.";
  } else if (pastTarget) {
    tone = "stop";
    action = "NO ENTRY \u2014 move is done";
    headline =
      "Price has already reached the liquidity target. Risk:reward is gone \u2014 do not chase.";
  } else if (pastT1) {
    tone = "wait";
    action = "WAIT \u2014 extended, let it pull back";
    headline =
      "Price is past equilibrium toward the target. Wait for a retracement into the entry zone.";
  } else if (!rrOk) {
    tone = "wait";
    action = "WAIT \u2014 reward not worth the risk";
    headline =
      "The risk:reward to target is under 1:2. Skip it or wait for a better location.";
  } else if (!edgeOk) {
    tone = "stop";
    action = "DO NOT ENTER \u2014 no edge over a fair game";
    headline =
      "Bachelier's fair game has zero expectancy, and the ICT confluence does not tilt the odds enough here. Stand aside.";
  } else if (score >= 5) {
    tone = "go";
    action = "TAKE THE ENTRY \u2014 strong confluence";
    headline =
      "Direction, location, liquidity, risk:reward and a positive edge all line up. Enter on confirmation, manage the stop.";
  } else if (score === 4) {
    tone = "caution";
    action = "TAKE WITH CAUTION \u2014 reduce size";
    headline =
      "Most signals agree but not all. If you take it, size down and demand confirmation at the trigger.";
  } else if (score === 3) {
    tone = "wait";
    action = "WAIT \u2014 needs more confluence";
    headline =
      "The setup is incomplete. Let price come into the zone and confirm before committing.";
  } else {
    tone = "stop";
    action = "DO NOT ENTER \u2014 signals conflict";
    headline =
      "There is no clean edge here. Stand aside \u2014 a fair game with no edge has zero expectancy.";
  }

  // --- Concrete "take when" / "avoid when" guidance ---
  const side = isLong ? "above" : "below";
  const opp = isLong ? "below" : "above";
  const takeWhen = [
    "Price retraces into the entry zone (the OTE / order-block pocket) \u2014 see levels below",
    "You get " +
      edge.bias.toLowerCase() +
      " confirmation: price reclaims/holds " +
      side +
      " the pivot trigger",
    "Liquidity has been swept first, and you're inside a kill zone (" +
      edge.kill.name +
      ")",
    "Expectancy stays positive with risk:reward at least 1:2, sized at or under Kelly (" +
      (Math.max(0, kelly) * 100).toFixed(0) +
      "%)",
  ];
  const avoidWhen = [
    "Price trades " +
      opp +
      " the invalidation \u2014 the setup is dead, do not average down",
    "Price has already run to Target 1 / Target 2 \u2014 you'd be chasing",
    "No liquidity sweep yet, or trend and bias disagree",
    "Expectancy is zero or negative, or you're outside a kill zone with only a C-grade read",
  ];

  return {
    dir,
    isLong,
    tone,
    action,
    headline,
    score,
    maxScore: checklist.length,
    rr,
    ruin,
    winProb,
    expR,
    kelly,
    trigger,
    zoneLo,
    zoneHi,
    invalidation,
    t1: edge.t1,
    t2: edge.t2,
    checklist,
    takeWhen,
    avoidWhen,
  };
}
