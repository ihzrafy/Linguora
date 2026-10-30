import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/** Server-side pagination links that preserve the current query string. */
export function Pager({
  page,
  pageSize,
  total,
  basePath,
  params,
}: {
  page: number;
  pageSize: number;
  total: number;
  basePath: string;
  params: Record<string, string | undefined>;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  const href = (p: number) => {
    const q = new URLSearchParams(Object.entries({ ...params, page: String(p) }).filter((e): e is [string, string] => Boolean(e[1])));
    return `${basePath}?${q.toString()}`;
  };
  const window = [page - 2, page - 1, page, page + 1, page + 2].filter((p) => p >= 1 && p <= pages);
  const linkClass = "inline-flex h-9 min-w-9 items-center justify-center rounded-lg border px-2 text-sm hover:bg-muted";
  return (
    <nav aria-label="Paginasi" className="flex flex-wrap items-center justify-center gap-1.5">
      {page > 1 && (
        <Link href={href(page - 1)} className={linkClass} aria-label="Halaman sebelumnya">
          <ChevronLeft className="size-4" />
        </Link>
      )}
      {window.map((p) => (
        <Link key={p} href={href(p)} aria-current={p === page ? "page" : undefined} className={cn(linkClass, p === page && "border-primary bg-primary text-primary-foreground hover:bg-primary")}>
          {p}
        </Link>
      ))}
      {page < pages && (
        <Link href={href(page + 1)} className={linkClass} aria-label="Halaman berikutnya">
          <ChevronRight className="size-4" />
        </Link>
      )}
      <span className="ml-2 text-xs text-muted-foreground">
        {total.toLocaleString("id-ID")} item · hal. {page}/{pages}
      </span>
    </nav>
  );
}
