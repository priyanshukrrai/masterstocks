"use client";
import { motion } from "framer-motion";

const MT = { marginTop: 16 };
const ZERO = { width: 0 };
const VP = { once: true };

function Bars({ title, rows, positive }) {
  const max = Math.max(...rows.map((r) => Math.abs(r.chg)), 1);
  return (
    <div className="an-card">
      <div className="l">{title}</div>
      {rows.map((r) => {
        const w = (Math.abs(r.chg) / max) * 100;
        const fillAnim = { width: w + "%" };
        const fillStyle = {
          background: positive ? "var(--green)" : "var(--red)",
        };
        const tag = (r.chg >= 0 ? "+" : "") + r.chg.toFixed(2) + "%";
        return (
          <div className="bar-row" key={r.id}>
            <span className="bnm">{r.symbol}</span>
            <span className="bar-track">
              <motion.span
                className="bar-fill"
                style={fillStyle}
                initial={ZERO}
                whileInView={fillAnim}
                viewport={VP}
              />
            </span>
            <span className="bval">{tag}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function AnalyticsSection({ crypto, stocks, india }) {
  const all = [...crypto, ...stocks, ...india];
  const sorted = [...all].sort((a, b) => b.chg - a.chg);
  const gainers = sorted.slice(0, 5);
  const losers = sorted.slice(-5).reverse();
  const avg = all.reduce((s, a) => s + a.chg, 0) / (all.length || 1);
  const upCount = all.filter((a) => a.chg >= 0).length;
  const cards = [
    { l: "Assets Tracked", v: String(all.length) },
    { l: "Avg 24h Change", v: (avg >= 0 ? "+" : "") + avg.toFixed(2) + "%" },
    { l: "Advancing", v: upCount + " / " + all.length },
    { l: "Declining", v: all.length - upCount + " / " + all.length },
  ];
  return (
    <div>
      <div className="an-grid">
        {cards.map((c) => (
          <div className="an-card" key={c.l}>
            <div className="l">{c.l}</div>
            <div className="v">{c.v}</div>
          </div>
        ))}
      </div>
      <div className="an-grid" style={MT}>
        <Bars title="Top Gainers" rows={gainers} positive />
        <Bars title="Top Losers" rows={losers} />
      </div>
    </div>
  );
}
