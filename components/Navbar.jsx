"use client";
import { motion } from "framer-motion";
import Logo from "./Logo";

const NAV_INIT = { y: -20, opacity: 0 };
const NAV_ANIM = { y: 0, opacity: 1 };
const NAV_T = { duration: 0.6, ease: "easeOut" };
const LAUNCH = { color: "#fff" };

export default function Navbar() {
  return (
    <motion.nav
      className="nav"
      initial={NAV_INIT}
      animate={NAV_ANIM}
      transition={NAV_T}
    >
      <div className="brand">
        <Logo size={26} />
        <span>MasterStocks</span>
      </div>
      <div className="links">
        <a href="#markets">Markets</a>
        <a href="#analytics">Analytics</a>
        <a href="#about">About</a>
        <a className="btn primary" href="#markets" style={LAUNCH}>
          Launch App
        </a>
      </div>
    </motion.nav>
  );
}
