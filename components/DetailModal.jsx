"use client";
import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { fmtCur, fmtBig } from "@/lib/data";
import { ictEdge } from "@/lib/ict";
import { quantStats } from "@/lib/quant";
import { bachelierView, ruinProb } from "@/lib/bachelier";
import { livermoreView } from "@/lib/livermore";
import { neuroView } from "@/lib/neuro";
import { tradePlan } from "@/lib/signal";

// Verdict colour + glyph by tone.
const TONE = {
  go: { c: "#16c784", g: "\u2713" },
  caution: { c: "#f0a020", g: "!" },
  wait: { c: "#5b8cff", g: "\u23f3" },
  stop: { c: "#ea3943", g: "\u2715" },
};

const BACKDROP_A = { opacity: 1 };
const BACKDROP_I = { opacity: 0 };
const SHEET_I = { opacity: 0, y: 30, scale: 0.98 };
const SHEET_A = { opacity: 1, y: 0, scale: 1 };
const SHEET_T = { type: "spring", stiffness: 260, damping: 26 };
const NM_STYLE = { fontWeight: 700, fontSize: 20 };
const OK_C = "#16c784";
const NO_C = "#ea3943";

const pct = (x, d = 2) => (x >= 0 ? "+" : "") + (x * 100).toFixed(d) + "%";
const absPct = (x, d = 2) => (Math.abs(x) * 100).toFixed(d) + "%";
const MID = "\u00b7"; // middle dot
const NDASH = "\u2013"; // en dash
const ARROW = "\u2192"; // right arrow

export default function DetailModal({ asset, onClose }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <AnimatePresence>
      {asset && (
        <motion.div
          className="modal"
          initial={BACKDROP_I}
          animate={BACKDROP_A}
          exit={BACKDROP_I}
          onClick={onClose}
        >
          <motion.div
            className="sheet"
            initial={SHEET_I}
            animate={SHEET_A}
            exit={SHEET_I}
            transition={SHEET_T}
            onClick={(e) => e.stopPropagation()}
          >
            <ModalBody asset={asset} onClose={onClose} />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// A labelled section of stat tiles, with a tag, a one-line header and a
// footnote that attributes the model to its source book.
function EdgeBlock({ tag, header, stats, note }) {
  return (
    <div className="ict-edge">
      <div className="ict-hd">
        <span className="ict-tag">{tag}</span>
        <span>{header}</span>
      </div>
      <div className="dt-stats">
        {stats.map((s) => (
          <div className="dt-stat" key={s.l}>
            <div className="l">{s.l}</div>
            <div className="v">{s.v}</div>
          </div>
        ))}
      </div>
      <div className="ict-disc">{note}</div>
    </div>
  );
}

function ModalBody({ asset, onClose }) {
  const up = asset.chg >= 0;
  const cur = asset.cur;
  const dash = "\u2014";

  // --- Models (all computed from the live asset, so they re-run on updates) ---
  const edge = ictEdge(asset);
  const q = quantStats(asset);
  const h2 = asset.barsPerDay && asset.barsPerDay > 1 ? asset.barsPerDay : 5;
  const h2Label = asset.barsPerDay && asset.barsPerDay > 1 ? "1 day" : "1 week";
  const b1 = bachelierView(asset, 1);
  const b2 = bachelierView(asset, h2);
  const lv = livermoreView(asset);
  const ruin = ruinProb(edge.entry, edge.stop, edge.t2);
  // Neuro uses the ICT-tilted edge probability (not the neutral fair game),
  // so expectancy and Kelly reflect the actual edge over the fair game.
  const nu = neuroView({
    entry: edge.entry,
    stop: edge.stop,
    target: edge.t2,
    winProb: edge.prob,
  });
  const bl = q.barLabel;

  // --- Setup latching ---------------------------------------------------
  // Recomputing the plan on every ~8s price poll makes the entry levels and
  // the verdict flicker. A real trade setup should hold still once it is on
  // the table, so we LATCH it per asset and only refresh when:
  //   - a different asset is opened,
  //   - the latched setup is invalidated (price trades beyond the stop) or its
  //     final target is reached (the idea has played out), or
  //   - a fresh full-confluence ("go") entry appears where there wasn't one.
  // Otherwise the previously shown plan and its levels are held steady so the
  // setup does not change on every refresh.
  const freshPlan = tradePlan(asset, { edge, q, lv, ruin, nu });
  const latch = useRef(null);
  const prev = latch.current;
  let plan;
  if (!prev || prev.sym !== asset.symbol) {
    plan = freshPlan;
  } else {
    const pr = asset.price;
    const invalidated = prev.plan.isLong
      ? pr < prev.plan.invalidation
      : pr > prev.plan.invalidation;
    const targetDone = prev.plan.isLong
      ? pr >= prev.plan.t2
      : pr <= prev.plan.t2;
    const upgradeToEntry = freshPlan.tone === "go" && prev.plan.tone !== "go";
    plan = invalidated || targetDone || upgradeToEntry ? freshPlan : prev.plan;
  }
  latch.current = { sym: asset.symbol, plan };

  const tone = TONE[plan.tone] || TONE.wait;
  const decStyle = { borderColor: tone.c };
  const tagStyle = { background: tone.c };
  const verdictStyle = { color: tone.c };
  const checkStyle = (ok) => ({ color: ok ? OK_C : NO_C });

  const stats = [
    { l: "Price", v: fmtCur(asset.price, cur) },
    { l: "24h Change", v: (up ? "+" : "") + asset.chg.toFixed(2) + "%" },
    { l: "Market Cap", v: asset.mcap ? "$" + fmtBig(asset.mcap) : dash },
    { l: "Volume", v: asset.vol ? "$" + fmtBig(asset.vol) : dash },
  ];

  const fvgText = edge.fvg
    ? fmtCur(edge.fvg.lo, cur) + " " + NDASH + " " + fmtCur(edge.fvg.hi, cur)
    : dash;
  const ictStats = [
    { l: "Bias", v: edge.bias },
    { l: "Market structure", v: edge.structure },
    { l: "Zone", v: edge.zone + (edge.inZone ? " \u2713" : "") },
    { l: "Draw on liquidity", v: edge.draw },
    { l: "Liquidity sweep", v: edge.sweep },
    { l: "Session (PO3)", v: edge.phase },
    { l: "OTE entry (62\u201379%)", v: fmtCur(edge.entry, cur) },
    { l: "Order block", v: fmtCur(edge.ob, cur) },
    { l: "Fair value gap", v: fvgText },
    { l: "Stop (beyond liquidity)", v: fmtCur(edge.stop, cur) },
    { l: "Target 1 (equilibrium)", v: fmtCur(edge.t1, cur) },
    { l: "Target 2 (liquidity)", v: fmtCur(edge.t2, cur) },
    { l: "Risk : Reward", v: "1 : " + edge.rr },
    {
      l: "Trend filter (Livermore)",
      v: edge.trendConfirmed ? "Confirmed" : "Not confirmed",
    },
    { l: "Confirm trigger (pivot)", v: fmtCur(edge.trigger, cur) },
    {
      l: "Over-extended? (quant z)",
      v: (edge.overExtended ? "Yes, z=" : "No, z=") + edge.z.toFixed(2),
    },
    { l: "Win prob (fair game)", v: (edge.probFair * 100).toFixed(0) + "%" },
    { l: "Win prob (+ ICT edge)", v: edge.confidence + "%" },
    {
      l: "Expectancy (per R)",
      v: (edge.expR >= 0 ? "+" : "") + edge.expR.toFixed(2) + "R",
    },
    { l: "Kelly position size", v: absPct(edge.kelly, 1) },
    {
      l: "Setup grade",
      v: edge.grade + " (" + edge.score + "/" + edge.scoreMax + ")",
    },
  ];

  const quantStatsRows = [
    { l: "Volatility (annualised)", v: absPct(q.sigAnnual, 1) },
    { l: "Volatility (per " + bl + ")", v: absPct(q.sigBar) },
    { l: "Sharpe (annualised)", v: q.sharpe.toFixed(2) },
    { l: "Max drawdown", v: absPct(q.mdd, 1) },
    { l: "Momentum (window)", v: pct(q.mom) },
    { l: "Mean-reversion z", v: q.z.toFixed(2) },
    { l: "1-" + bl + " VaR 95%", v: absPct(q.var95) },
    { l: "1-" + bl + " VaR 99%", v: absPct(q.var99) },
  ];

  const bachelierStatsRows = [
    { l: "Fair value (martingale)", v: fmtCur(b1.expected, cur) },
    { l: "\u00b11\u03c3 (1 " + bl + ")", v: absPct(b1.sigT) },
    {
      l: "Range \u00b11\u03c3 (1 " + bl + ")",
      v: fmtCur(b1.dn1, cur) + " " + NDASH + " " + fmtCur(b1.up1, cur),
    },
    {
      l: "Range \u00b11\u03c3 (\u2248" + h2Label + ")",
      v: fmtCur(b2.dn1, cur) + " " + NDASH + " " + fmtCur(b2.up1, cur),
    },
    {
      l: "\u224895% band (\u2248" + h2Label + ")",
      v: fmtCur(b2.dn2, cur) + " " + NDASH + " " + fmtCur(b2.up2, cur),
    },
    { l: "P(up next " + bl + ")", v: "50%" },
    { l: "P(reach T2 first), fair game", v: (ruin * 100).toFixed(0) + "%" },
    { l: "P(reach T2 first) + ICT edge", v: edge.confidence + "%" },
    { l: "Speculator's expectation", v: "0 (fair game baseline)" },
  ];

  const livermoreStatsRows = [
    { l: "Trend", v: lv.trend },
    { l: "Pivotal point above", v: fmtCur(lv.pivotAbove, cur) },
    { l: "Pivotal point below", v: fmtCur(lv.pivotBelow, cur) },
    { l: "Long trigger (confirm)", v: fmtCur(lv.longTrigger, cur) },
    { l: "Breakdown (danger)", v: fmtCur(lv.breakdown, cur) },
    { l: "Swing high", v: fmtCur(lv.swingHigh, cur) },
    { l: "Swing low", v: fmtCur(lv.swingLow, cur) },
    { l: "Momentum (window)", v: pct(lv.mom) },
  ];

  const neuroStatsRows = [
    { l: "Reward : Risk", v: "1 : " + nu.rr.toFixed(2) },
    { l: "Win prob (with ICT edge)", v: (nu.p * 100).toFixed(0) + "%" },
    { l: "Expected value", v: nu.evR.toFixed(2) + "R" },
    { l: "Loss-averse value (\u03bb=2.25)", v: nu.u.toFixed(2) },
    { l: "Kelly fraction", v: absPct(nu.kelly, 1) },
    {
      l: "Discipline",
      v: nu.lossAversionGap ? "Loss aversion vs plan" : "Aligned",
    },
  ];

  const head =
    asset.symbol +
    " " +
    MID +
    " " +
    cur +
    (asset._live ? " " + MID + " live" : " " + MID + " sim");
  const edgeLine =
    edge.bias +
    " " +
    MID +
    " " +
    edge.structure +
    " " +
    MID +
    " " +
    edge.zone +
    " zone";
  const decHeader =
    plan.dir +
    " setup " +
    MID +
    " confluence " +
    plan.score +
    "/" +
    plan.maxScore;

  return (
    <>
      <button className="detail-x" onClick={onClose} aria-label="Close">
        {"\u2715"}
      </button>
      <div className="dt-head">
        <div className="coin-ico">
          {asset.image ? (
            <img src={asset.image} alt="" width={50} height={50} />
          ) : (
            asset.symbol.slice(0, 3)
          )}
        </div>
        <div>
          <div style={NM_STYLE}>{asset.name}</div>
          <div className="sym">{head}</div>
        </div>
      </div>

      <div className="dt-stats">
        {stats.map((s) => (
          <div className="dt-stat" key={s.l}>
            <div className="l">{s.l}</div>
            <div className="v">{s.v}</div>
          </div>
        ))}
      </div>

      <div className="dt-decision" style={decStyle}>
        <div className="ict-hd">
          <span className="ict-tag" style={tagStyle}>
            TRADE DECISION
          </span>
          <span>{decHeader}</span>
        </div>
        <div className="dt-verdict" style={verdictStyle}>
          <span className="dt-verdict-g" style={tagStyle}>
            {tone.g}
          </span>
          {plan.action}
        </div>
        <div className="dt-headline">{plan.headline}</div>

        <div className="dt-stats">
          <div className="dt-stat">
            <div className="l">Entry zone (OTE / OB)</div>
            <div className="v">
              {fmtCur(plan.zoneLo, cur)} {NDASH} {fmtCur(plan.zoneHi, cur)}
            </div>
          </div>
          <div className="dt-stat">
            <div className="l">Confirmation trigger</div>
            <div className="v">{fmtCur(plan.trigger, cur)}</div>
          </div>
          <div className="dt-stat">
            <div className="l">Invalidation (stop)</div>
            <div className="v">{fmtCur(plan.invalidation, cur)}</div>
          </div>
          <div className="dt-stat">
            <div className="l">Targets</div>
            <div className="v">
              {fmtCur(plan.t1, cur)} {ARROW} {fmtCur(plan.t2, cur)}
            </div>
          </div>
        </div>

        <div className="dt-checks">
          {plan.checklist.map((c) => (
            <div className="dt-check" key={c.label} style={checkStyle(c.ok)}>
              <b>{c.ok ? "\u2713" : "\u2715"}</b> {c.label}
            </div>
          ))}
        </div>

        <div className="dt-cols">
          <div className="dt-col">
            <div className="dt-col-h ok">{"\u2713"} Take an entry when</div>
            <ul>
              {plan.takeWhen.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </div>
          <div className="dt-col">
            <div className="dt-col-h no">{"\u2715"} Do NOT enter when</div>
            <ul>
              {plan.avoidWhen.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="ict-disc">
          A synthesis of the ICT, Livermore, quant and Bachelier / neuro reads
          below {dash} it improves your odds but guarantees nothing. A fair game
          with no edge has zero expectancy. Educational only {dash} not
          financial advice.
        </div>
      </div>

      <EdgeBlock
        tag="ICT EDGE"
        header={edgeLine}
        stats={ictStats}
        note={
          "Kill zone: " +
          edge.kill.name +
          ". ICT is a probabilistic model \u2014 structure, liquidity, FVGs and OTE " +
          "improve odds but no method is truly \u201cno-loss\u201d. Updates live with price."
        }
      />

      <EdgeBlock
        tag="QUANT"
        header={"Volatility & risk " + MID + " " + bl + " series"}
        stats={quantStatsRows}
        note={
          "Volatility = standard deviation of log returns, annualised by the " +
          "square root of time; with the Sharpe ratio, drawdown and Gaussian " +
          "Value at Risk. Concepts from Steve Bell, Quantitative Finance For Dummies (2016)."
        }
      />

      <EdgeBlock
        tag="BACHELIER"
        header="Random walk & fair value"
        stats={bachelierStatsRows}
        note={
          "Today's price is the best estimate of tomorrow's (a martingale): \u201cthe " +
          "mathematical expectation of the speculator is zero\u201d. The expected range " +
          "widens with the square root of time. From Louis Bachelier, Th\u00e9orie de la " +
          "sp\u00e9culation (1900) \u2014 Speculation: The Origins of Mathematical Finance."
        }
      />

      <EdgeBlock
        tag="LIVERMORE"
        header={lv.signal}
        stats={livermoreStatsRows}
        note={
          "Trade pivotal points (round-number marks and fresh highs/lows), demand " +
          "follow-through to confirm, respect the danger signal when it fails, trade " +
          "with the trend and never average losses. From Jesse Livermore, How to Trade in Stocks (1940)."
        }
      />

      <EdgeBlock
        tag="NEUROECONOMICS"
        header={
          nu.lossAversionGap
            ? "Positive expectancy, but losses loom larger \u2014 trust the plan"
            : "Decision quality check"
        }
        stats={neuroStatsRows}
        note={
          "Prospect theory (Kahneman & Tversky, 1979): outcomes are judged as gains " +
          "and losses, and losses loom larger than gains (loss aversion \u03bb\u22482.25). " +
          "Dopamine encodes a reward-prediction error \u2014 discipline beats chasing. " +
          "From Neuroeconomics: Decision Making and the Brain (Glimcher et al.). " +
          "Educational only \u2014 not financial advice."
        }
      />
    </>
  );
}
