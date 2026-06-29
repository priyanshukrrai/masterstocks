"use client";
import { useRive, Layout, Fit, Alignment } from "@rive-app/react-canvas";
import { motion } from "framer-motion";

// Rive interactive button. Drop a compiled `button.riv` into /public/rive/ for
// full interactive state-machine animation. If the file is missing this falls
// back gracefully to a Framer Motion button so the build never breaks.
const HOVER = { scale: 1.04 };
const TAP = { scale: 0.97 };
const WRAP = { width: 210, height: 56, cursor: "pointer" };
const RIVE_LAYOUT = new Layout({
  fit: Fit.Contain,
  alignment: Alignment.Center,
});

export default function RiveButton({ label = "Get Started" }) {
  const go = () => {
    if (typeof document === "undefined") return;
    const el = document.getElementById("markets");
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  const { RiveComponent, rive } = useRive({
    src: "/rive/button.riv",
    stateMachines: "State Machine 1",
    autoplay: true,
    layout: RIVE_LAYOUT,
    onLoadError: () => {},
  });

  if (!rive) {
    return (
      <motion.button
        className="btn primary"
        onClick={go}
        whileHover={HOVER}
        whileTap={TAP}
      >
        {label}
      </motion.button>
    );
  }

  return (
    <div style={WRAP} onClick={go} role="button" aria-label={label}>
      <RiveComponent />
    </div>
  );
}
