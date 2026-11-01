"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";

gsap.registerPlugin(useGSAP);

/** Hero entrance: masked heading lines rise, the lime mark draws in, the rest fades up (off with reduced motion). */
export function HeroMotion({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useGSAP(
    () => {
      gsap.matchMedia().add("(prefers-reduced-motion: no-preference)", () => {
        const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
        tl.from("[data-line]", { yPercent: 110, duration: 1.05, stagger: 0.1 })
          .from("[data-mark]", { scaleX: 0, duration: 0.8, ease: "power2.inOut" }, "-=0.45")
          .from("[data-hero]", { opacity: 0, y: 24, duration: 0.8, stagger: 0.08 }, 0.15);
      });
    },
    { scope: ref },
  );
  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
