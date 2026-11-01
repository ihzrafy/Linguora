import Link from "next/link";
import { cn } from "@/lib/utils";

/** Ink tile with an "L" stroke and a pastel-yellow dot; inverts with the theme. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={cn("size-8 shrink-0", className)}>
      <rect width="32" height="32" rx="9" fill="var(--foreground)" />
      <path d="M10 8v13.5a2.5 2.5 0 0 0 2.5 2.5H22" fill="none" stroke="var(--background)" strokeWidth="3" strokeLinecap="round" />
      <circle cx="21.5" cy="12" r="3" fill="var(--highlight)" />
    </svg>
  );
}

export function Logo({ href = "/", className }: { href?: string; className?: string }) {
  return (
    <Link href={href} className={cn("flex items-center gap-2 font-heading text-lg font-semibold tracking-[-0.02em]", className)} aria-label="Linguora — beranda">
      <LogoMark />
      <span>Linguora</span>
    </Link>
  );
}
