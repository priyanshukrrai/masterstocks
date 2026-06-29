"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

// Framer Motion configs are declared as constants/helpers and referenced with
// single-brace props (initial={PATH_INITIAL}) instead of inline double-brace
// object literals.
const PATH_INITIAL = { pathLength: 0.3, opacity: 0.6 };
const PATH_ANIMATE = {
  pathLength: 1,
  opacity: [0.3, 0.6, 0.3],
  pathOffset: [0, 1, 0],
};
const pathTransition = () => ({
  duration: 20 + Math.random() * 10,
  repeat: Infinity,
  ease: "linear",
});

const CONTAINER_INITIAL = { opacity: 0 };
const CONTAINER_ANIMATE = { opacity: 1 };
const CONTAINER_TRANSITION = { duration: 2 };

const LETTER_INITIAL = { y: 100, opacity: 0 };
const LETTER_ANIMATE = { y: 0, opacity: 1 };
const letterTransition = (wordIndex, letterIndex) => ({
  delay: wordIndex * 0.1 + letterIndex * 0.03,
  type: "spring",
  stiffness: 150,
  damping: 25,
});

function FloatingPaths({ position }) {
  const paths = Array.from({ length: 36 }, (_, i) => ({
    id: i,
    d: `M-${380 - i * 5 * position} -${189 + i * 6}C-${380 - i * 5 * position} -${189 + i * 6} -${312 - i * 5 * position} ${216 - i * 6} ${152 - i * 5 * position} ${343 - i * 6}C${616 - i * 5 * position} ${470 - i * 6} ${684 - i * 5 * position} ${875 - i * 6} ${684 - i * 5 * position} ${875 - i * 6}`,
    width: 0.5 + i * 0.03,
  }));

  return (
    <div className="absolute inset-0 pointer-events-none">
      <svg
        className="w-full h-full text-slate-900 dark:text-white"
        viewBox="0 0 696 316"
        fill="none"
      >
        <title>Background Paths</title>
        {paths.map((path) => (
          <motion.path
            key={path.id}
            d={path.d}
            stroke="currentColor"
            strokeWidth={path.width}
            strokeOpacity={0.1 + path.id * 0.03}
            initial={PATH_INITIAL}
            animate={PATH_ANIMATE}
            transition={pathTransition()}
          />
        ))}
      </svg>
    </div>
  );
}

export function BackgroundPaths({
  title = "Background Paths",
  eyebrow,
  subtitle,
  primaryLabel = "Launch the app",
  primaryHref = "#markets",
  secondaryLabel = "View analytics",
  secondaryHref = "#analytics",
}) {
  const words = title.split(" ");

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-[var(--bg)]">
      <div className="absolute inset-0">
        <FloatingPaths position={1} />
        <FloatingPaths position={-1} />
      </div>

      <div className="relative z-10 container mx-auto px-4 md:px-6 text-center">
        <motion.div
          initial={CONTAINER_INITIAL}
          animate={CONTAINER_ANIMATE}
          transition={CONTAINER_TRANSITION}
          className="max-w-4xl mx-auto"
        >
          {eyebrow ? (
            <div className="mb-6 text-[11px] font-bold uppercase tracking-[0.26em] text-[var(--gold)]">
              {eyebrow}
            </div>
          ) : null}

          <h1 className="text-5xl sm:text-7xl md:text-8xl font-bold mb-8 tracking-tighter">
            {words.map((word, wordIndex) => (
              <span key={wordIndex} className="inline-block mr-4 last:mr-0">
                {word.split("").map((letter, letterIndex) => (
                  <motion.span
                    key={`${wordIndex}-${letterIndex}`}
                    initial={LETTER_INITIAL}
                    animate={LETTER_ANIMATE}
                    transition={letterTransition(wordIndex, letterIndex)}
                    className="inline-block text-transparent bg-clip-text bg-gradient-to-r from-slate-900 to-slate-700/80 dark:from-white dark:to-white/80"
                  >
                    {letter}
                  </motion.span>
                ))}
              </span>
            ))}
          </h1>

          {subtitle ? (
            <p className="max-w-xl mx-auto mb-10 text-base sm:text-lg leading-relaxed text-[var(--muted)]">
              {subtitle}
            </p>
          ) : null}

          <div className="flex items-center justify-center gap-4 flex-wrap">
            <div className="inline-block group relative bg-gradient-to-b from-black/10 to-white/10 p-px rounded-2xl backdrop-blur-lg overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300">
              <Button
                asChild
                variant="ghost"
                className="rounded-[1.15rem] px-8 py-6 text-base font-semibold backdrop-blur-md bg-[var(--ink)] hover:bg-[var(--ink)] text-white transition-all duration-300 group-hover:-translate-y-0.5 border border-white/10"
              >
                <a href={primaryHref}>
                  <span className="opacity-90 group-hover:opacity-100 transition-opacity">
                    {primaryLabel}
                  </span>
                  <span className="ml-3 opacity-70 group-hover:opacity-100 group-hover:translate-x-1.5 transition-all duration-300">
                    →
                  </span>
                </a>
              </Button>
            </div>

            <a
              href={secondaryHref}
              className="inline-flex items-center rounded-[1.15rem] px-8 py-[1.45rem] text-base font-semibold border border-[var(--stroke-strong)] text-[var(--ink)] bg-[var(--panel)] backdrop-blur-md hover:border-[var(--gold-line)] hover:-translate-y-0.5 transition-all duration-300"
            >
              {secondaryLabel}
            </a>
          </div>
        </motion.div>
      </div>

      <div className="absolute bottom-8 left-6 z-10 text-xs uppercase tracking-[0.2em] text-[var(--gold)]">
        / Scroll down
      </div>
    </div>
  );
}
