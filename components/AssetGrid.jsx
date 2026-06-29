"use client";
import { motion } from "framer-motion";
import AssetCard from "./AssetCard";

// Framer Motion staggered entrance for the card grid.
const GRID = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } };
const CARD = { hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0 } };

export default function AssetGrid({ items, onOpen }) {
  if (!items.length) {
    return <div className="empty">No assets match your search.</div>;
  }
  return (
    <motion.div
      className="grid"
      variants={GRID}
      initial="hidden"
      animate="show"
      key={items.length}
    >
      {items.map((a) => (
        <AssetCard key={a.id} asset={a} variants={CARD} onOpen={onOpen} />
      ))}
    </motion.div>
  );
}
