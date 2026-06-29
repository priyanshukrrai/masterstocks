"use client";
import { motion } from "framer-motion";

const TABS = [
  { id: "crypto", label: "Crypto" },
  { id: "stocks", label: "US Stocks" },
  { id: "india", label: "India" },
  { id: "analytics", label: "Analytics" },
];

export default function Controls({ tab, setTab, search, setSearch }) {
  return (
    <div className="controls">
      <div className="tabs">
        {TABS.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              className={active ? "tab active" : "tab"}
              onClick={() => setTab(t.id)}
            >
              {active && (
                <motion.span className="tab-pill" layoutId="tab-pill" />
              )}
              <span className="tab-label">{t.label}</span>
            </button>
          );
        })}
      </div>
      <div className="search">
        <input
          type="text"
          placeholder="Search assets..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
    </div>
  );
}
