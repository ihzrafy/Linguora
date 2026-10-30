import Link from "next/link";
import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={cn("size-8 shrink-0", className)}>
      <defs>
        <linearGradient id="lg-mark" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--primary)" />
          <stop offset="0.6" stopColor="var(--brand-blue)" />
          <stop offset="1" stopColor="var(--brand-lavender)" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill="url(#lg-mark)" />
      <path d="M10 8v13.5a2.5 2.5 0 0 0 2.5 2.5H22" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" />
      <circle cx="21.5" cy="12" r="3" fill="white" opacity="0.9" />
    </svg>
  );
}

export function Logo({ href = "/", className }: { href?: string; className?: string }) {
  return (
    <Link
      href={href}
      className={cn("flex items-center gap-2 font-heading text-lg font-bold tracking-tight", className)}
      aria-label="Linguora — beranda"
    >
      <LogoMark />
      <span>Linguora</span>
    </Link>
  );
}
