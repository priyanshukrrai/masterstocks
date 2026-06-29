"use client";
import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

// Generic GSAP + ScrollTrigger reveal. Children fade + rise into view, with an
// optional stagger when wrapping a group of elements.
export default function Reveal({
  children,
  className = "",
  y = 36,
  stagger = 0,
  selector,
}) {
  const ref = useRef(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const el = ref.current;
    if (!el) return;

    gsap.registerPlugin(ScrollTrigger);
    const targets = selector ? el.querySelectorAll(selector) : [el];

    if (reduce) {
      gsap.set(targets, { opacity: 1, y: 0 });
      return;
    }

    const ctx = gsap.context(() => {
      gsap.fromTo(
        targets,
        { opacity: 0, y },
        {
          opacity: 1,
          y: 0,
          duration: 0.9,
          ease: "power3.out",
          stagger,
          scrollTrigger: {
            trigger: el,
            start: "top 85%",
            toggleActions: "play none none none",
          },
        },
      );
    }, el);

    return () => ctx.revert();
  }, [y, stagger, selector]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
