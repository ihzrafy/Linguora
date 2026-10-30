import Link from "next/link";
import { cn } from "@/lib/utils";

export function ViewTabs({ basePath, current, views }: { basePath: string; current: string; views: { key: string; label: string }[] }) {
  return (
    <div className="flex gap-1 rounded-xl border bg-muted/40 p-1 sm:w-fit" role="tablist">
      {views.map((v, i) => (
        <Link
          key={v.key}
          role="tab"
          aria-selected={current === v.key}
          href={i === 0 ? basePath : `${basePath}?view=${v.key}`}
          className={cn("flex-1 rounded-lg px-4 py-1.5 text-center text-sm font-medium whitespace-nowrap", current === v.key ? "bg-background shadow-xs" : "text-muted-foreground")}
        >
          {v.label}
        </Link>
      ))}
    </div>
  );
}
