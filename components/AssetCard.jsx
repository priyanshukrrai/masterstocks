"use client";
import { motion } from "framer-motion";
import { fmtCur } from "@/lib/data";

const HOVER = { y: -6 };
const HOVER_T = { type: "spring", stiffness: 300, damping: 22 };

function sparkPath(spark, w, h) {
  if (!spark || spark.length < 2) return "";
  const min = Math.min(...spark);
  const max = Math.max(...spark);
  const range = max - min || 1;
  const step = w / (spark.length - 1);
  return spark
    .map((v, i) => {
      const x = i * step;
      const y = h - ((v - min) / range) * h;
      return (i === 0 ? "M" : "L") + x.toFixed(1) + " " + y.toFixed(1);
    })
    .join(" ");
}

export default function AssetCard({ asset, variants, onOpen }) {
  const up = asset.chg >= 0;
  const color = up ? "var(--green)" : "var(--red)";
  const d = sparkPath(asset.spark, 260, 52);
  const initials = asset.symbol.slice(0, 3);
  const tag = (up ? "+" : "") + asset.chg.toFixed(2) + "%";
  return (
    <motion.article
      className="card"
      variants={variants}
      whileHover={HOVER}
      transition={HOVER_T}
      onClick={() => onOpen(asset)}
    >
      <div className="row">
        <div className="coin-ico">
          {asset.image ? (
            <img src={asset.image} alt={asset.symbol} width={44} height={44} />
          ) : (
            initials
          )}
        </div>
        <div className="names">
          <div className="nm">{asset.name}</div>
          <div className="sym">{asset.symbol}</div>
        </div>
      </div>
      <div className="price-row">
        <div className="price">{fmtCur(asset.price, asset.cur)}</div>
        <div className={up ? "chg up" : "chg down"}>{tag}</div>
      </div>
      <svg className="spark" viewBox="0 0 260 52" preserveAspectRatio="none">
        <path
          d={d}
          fill="none"
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </motion.article>
  );
}
