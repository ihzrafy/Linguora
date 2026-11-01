import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

/** Editorial eyebrow: ■ (01) — Learning path */
export function SectionLabel({ index, children, tone = "default", className }: { index?: string; children: React.ReactNode; tone?: "default" | "ink"; className?: string }) {
  return (
    <p className={cn("type-eyebrow flex items-center gap-3", tone === "ink" ? "text-ink-muted" : "text-muted-foreground", className)}>
      <span aria-hidden className="size-1.5 shrink-0 bg-lime ring-1 ring-foreground/10" />
      {index && <span>({index})</span>}
      {index && <span aria-hidden className="h-px w-6 bg-current opacity-40" />}
      <span>{children}</span>
    </p>
  );
}

/** Lime highlighter behind a word (lime text instead in dark mode), or always lime text (`text`, for ink surfaces). */
export function Mark({ children, variant = "mark" }: { children: React.ReactNode; variant?: "mark" | "text" }) {
  if (variant === "text") return <span className="text-lime">{children}</span>;
  return (
    <span className="relative isolate inline-block whitespace-nowrap text-lime-ink dark:text-lime">
      <span aria-hidden className="absolute inset-x-[-0.06em] top-[0.14em] bottom-[0.04em] -z-10 -skew-x-6 dark:hidden">
        <span data-mark className="block size-full origin-left rounded-[0.06em] bg-lime" />
      </span>
      {children}
    </span>
  );
}

type PillVariant = "lime" | "dark" | "outline" | "outline-ink";

const PILL: Record<PillVariant, string> = {
  lime: "bg-lime text-lime-ink hover:bg-[#c8f00f]",
  dark: "bg-foreground text-background hover:bg-foreground/90",
  outline: "border border-foreground/20 text-foreground hover:border-foreground",
  "outline-ink": "border border-white/25 text-ink-foreground hover:border-white",
};

const PILL_ICON: Record<PillVariant, string> = {
  lime: "bg-lime-ink text-lime",
  dark: "bg-lime text-lime-ink",
  outline: "bg-foreground text-background",
  "outline-ink": "bg-ink-foreground text-ink",
};

/** Pill link with a round arrow badge that turns on hover. */
export function PillLink({ href, children, variant = "dark", size = "md", className }: { href: string; children: React.ReactNode; variant?: PillVariant; size?: "md" | "lg"; className?: string }) {
  return (
    <Link
      href={href}
      className={cn(
        "group/pill inline-flex items-center justify-center gap-3 rounded-full font-medium tracking-[-0.01em] whitespace-nowrap transition-colors duration-300 focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-ring",
        size === "lg" ? "h-14 pr-2 pl-7 text-base" : "h-11 pr-1.5 pl-5 text-[0.9375rem]",
        PILL[variant],
        className,
      )}
    >
      <span>{children}</span>
      <span
        aria-hidden
        className={cn(
          "inline-grid shrink-0 place-items-center rounded-full transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover/pill:rotate-45",
          size === "lg" ? "size-10" : "size-8",
          PILL_ICON[variant],
        )}
      >
        <ArrowUpRight className={size === "lg" ? "size-[18px]" : "size-[15px]"} />
      </span>
    </Link>
  );
}
