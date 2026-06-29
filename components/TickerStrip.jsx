"use client";
import { fmtCur } from "@/lib/data";

// Infinite marquee ticker. The list is duplicated so the CSS animation can loop
// seamlessly.
export default function TickerStrip({ items }) {
  const row = [...items, ...items];
  return (
    <div className="ticker">
      <div className="track">
        {row.map((a, i) => {
          const up = a.chg >= 0;
          const tag = (up ? "+" : "") + a.chg.toFixed(2) + "%";
          return (
            <span className="ti" key={a.id + "_" + i}>
              <span className="sym">{a.symbol}</span>
              <span>{fmtCur(a.price, a.cur)}</span>
              <span className={up ? "chg up" : "chg down"}>{tag}</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}
