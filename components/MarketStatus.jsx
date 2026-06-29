"use client";
import LottieIcon from "./LottieIcon";

export default function MarketStatus({ tab, open }) {
  if (tab !== "india") return null;
  const cls = "status " + (open ? "open" : "closed");
  const msg = open
    ? "NSE / BSE open \u00b7 prices are live"
    : "NSE / BSE closed \u00b7 showing last close (Mon\u2013Fri 9:15\u201315:30 IST)";
  return (
    <div className={cls} style={WRAP}>
      <LottieIcon size={20} />
      <span>{msg}</span>
    </div>
  );
}

const WRAP = { marginBottom: 18 };
