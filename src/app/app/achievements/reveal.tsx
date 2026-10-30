"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";

gsap.registerPlugin(useGSAP);

/** Celebrates newly unlocked achievements once (respects reduced motion). */
export function AchievementReveal({ ids, children }: { ids: string[]; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useGSAP(
    () => {
      if (!ids.length) return;
      gsap.matchMedia().add("(prefers-reduced-motion: no-preference)", () => {
        const targets = ids.map((id) => ref.current?.querySelector(`[data-achievement="${id}"]`)).filter(Boolean) as Element[];
        gsap.fromTo(targets, { scale: 0.85, rotate: -2, boxShadow: "0 0 0 0 rgba(99,102,241,0)" }, { scale: 1, rotate: 0, boxShadow: "0 0 0 6px rgba(99,102,241,0.25)", duration: 0.6, ease: "back.out(2)", stagger: 0.12 });
        gsap.to(targets, { boxShadow: "0 0 0 0 rgba(99,102,241,0)", delay: 1.4, duration: 0.8 });
      });
    },
    { scope: ref, dependencies: [ids.join(",")] },
  );
  return (
    <div ref={ref} className="space-y-8">
      {children}
    </div>
  );
}
