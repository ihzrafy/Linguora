"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";

gsap.registerPlugin(useGSAP);

/** Subtle entrance animation for hero content (disabled with prefers-reduced-motion). */
export function HeroMotion({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useGSAP(
    () => {
      gsap.matchMedia().add("(prefers-reduced-motion: no-preference)", () => {
        gsap.from("[data-hero]", { opacity: 0, y: 24, duration: 0.7, stagger: 0.08, ease: "power3.out" });
      });
    },
    { scope: ref },
  );
  return <div ref={ref}>{children}</div>;
}
