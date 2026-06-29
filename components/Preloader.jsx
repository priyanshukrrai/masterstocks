"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Logo from "./Logo";

// 0 -> 100% preloader, re-themed for the premium look and animated out with
// Framer Motion.
const OVERLAY_INIT = { opacity: 1 };
const OVERLAY_EXIT = { opacity: 0, transition: { duration: 0.7 } };
const LOGO_INIT = { scale: 0.8, opacity: 0 };
const LOGO_ANIM = { scale: 1, opacity: 1 };
const LOGO_T = { duration: 0.5, ease: "easeOut" };
const LOGO_WRAP = { marginBottom: 16 };
const MARK_INIT = { y: 12, opacity: 0 };
const MARK_ANIM = { y: 0, opacity: 1 };
const MARK_T = { duration: 0.6, delay: 0.1 };
const BAR_T = { ease: "easeOut", duration: 0.15 };

export default function Preloader() {
  const [pct, setPct] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let p = 0;
    let timer;
    const run = () => {
      p += Math.max(0.8, (100 - p) * 0.05) + Math.random() * 1.6;
      if (p >= 100) {
        setPct(100);
        setTimeout(() => setDone(true), 350);
        return;
      }
      setPct(Math.floor(p));
      timer = setTimeout(run, 38 + Math.random() * 70);
    };
    run();
    return () => clearTimeout(timer);
  }, []);

  const barAnim = { width: pct + "%" };

  return (
    <AnimatePresence>
      {!done && (
        <motion.div
          className="preloader"
          initial={OVERLAY_INIT}
          exit={OVERLAY_EXIT}
        >
          <motion.div
            style={LOGO_WRAP}
            initial={LOGO_INIT}
            animate={LOGO_ANIM}
            transition={LOGO_T}
          >
            <Logo size={52} />
          </motion.div>
          <motion.div
            className="mark"
            initial={MARK_INIT}
            animate={MARK_ANIM}
            transition={MARK_T}
          >
            MasterStocks
          </motion.div>
          <div className="pre-track">
            <motion.div
              className="pre-bar"
              animate={barAnim}
              transition={BAR_T}
            />
          </div>
          <div className="pre-pct">{pct}%</div>
          <div className="pre-sub">Loading market intelligence</div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
