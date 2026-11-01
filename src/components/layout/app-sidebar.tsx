"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, ArrowRight, Menu, Search, Shield, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Logo } from "@/components/shared/logo";
import { cn } from "@/lib/utils";
import { ADMIN_NAV, APP_NAV, type NavGroup } from "./nav-config";

export type NavVariant = "app" | "admin";
const NAVS: Record<NavVariant, NavGroup[]> = { app: APP_NAV, admin: ADMIN_NAV };

const ITEM_BADGES: Record<string, { label: string; className: string }> = {
  "/app/conversation": {
    label: "AI",
    className: "border-transparent bg-lime text-lime-ink",
  },
  "/app/daily-challenge": {
    label: "Daily",
    className: "border-foreground/20 text-foreground",
  },
  "/app/placement-test": {
    label: "CEFR",
    className: "border-foreground/20 text-muted-foreground",
  },
  "/admin/content-review": {
    label: "Review",
    className: "border-foreground/20 text-foreground",
  },
};

function NavItems({
  groups,
  onNavigate,
}: {
  groups: NavGroup[];
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <div className="space-y-4 px-3 py-2">
      {groups.map((group) => (
        <div key={group.label} className="first:mt-0">
          <p className="mb-1.5 px-3 font-mono text-[0.66rem] font-medium tracking-[0.12em] text-muted-foreground uppercase">
            {group.label}
          </p>
          <ul className="space-y-0.5">
            {group.items.map(({ href, label, icon: Icon }) => {
              const isRoot = href === "/app/dashboard" || href === "/admin";
              const active = pathname === href || (!isRoot && pathname.startsWith(`${href}/`));
              const badge = ITEM_BADGES[href];

              return (
                <li key={href}>
                  <Link
                    href={href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "group relative flex items-center gap-2.5 rounded-full px-3 py-2 text-xs font-medium transition-all duration-150 select-none",
                      active
                        ? "bg-foreground font-semibold text-background dark:bg-lime dark:text-lime-ink"
                        : "text-sidebar-foreground/80 hover:bg-sidebar-accent/70 hover:text-sidebar-foreground hover:translate-x-0.5"
                    )}
                  >
                    <Icon
                      className={cn(
                        "size-4 shrink-0 transition-colors",
                        active
                          ? "text-lime dark:text-lime-ink"
                          : "text-muted-foreground group-hover:text-sidebar-foreground"
                      )}
                      aria-hidden
                    />
                    <span className="truncate">{label}</span>
                    {badge && (
                      <span className={cn("ml-auto rounded-full border px-1.5 py-0.5 font-mono text-[0.6rem] font-medium leading-none", badge.className, active && "border-current bg-transparent text-current")}>
                        {badge.label}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}

function SidebarFooter({
  nav,
  adminHref,
  onNavigate,
}: {
  nav: NavVariant;
  adminHref?: string;
  onNavigate?: () => void;
}) {
  return (
    <div className="shrink-0 border-t border-border bg-sidebar p-3 space-y-2">
      {adminHref && (
        <Link
          href={adminHref}
          onClick={onNavigate}
          className="group flex items-center gap-2.5 rounded-2xl bg-ink px-3 py-2.5 text-xs font-semibold text-ink-foreground transition-colors hover:bg-ink/90"
        >
          <Shield className="size-4 shrink-0 text-lime transition-transform group-hover:scale-110" aria-hidden />
          <div className="flex-1 min-w-0 text-left">
            <p className="font-semibold leading-tight truncate">Admin CMS</p>
            <p className="text-[0.62rem] font-normal text-ink-muted truncate">Kelola kurikulum & sistem</p>
          </div>
          <ArrowRight className="size-3.5 text-ink-muted transition-transform group-hover:translate-x-0.5" aria-hidden />
        </Link>
      )}
      {nav === "admin" && (
        <Link
          href="/app/dashboard"
          onClick={onNavigate}
          className="group flex items-center gap-2.5 rounded-2xl border border-border bg-card px-3 py-2.5 text-xs font-semibold text-foreground transition-colors hover:border-foreground/40"
        >
          <ArrowLeft className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:-translate-x-0.5" aria-hidden />
          <div className="flex-1 min-w-0 text-left">
            <p className="font-semibold leading-tight truncate">Aplikasi Belajar</p>
            <p className="text-[0.62rem] font-normal text-muted-foreground truncate">Kembali ke portal murid</p>
          </div>
        </Link>
      )}
      <div className="flex items-center justify-between px-1 pt-1 text-[0.65rem] text-muted-foreground/80">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-1.5 bg-lime ring-1 ring-foreground/15" aria-hidden />
          Linguora Platform
        </span>
        <span className="font-mono text-[0.6rem] text-muted-foreground/60">CEFR A1–C2</span>
      </div>
    </div>
  );
}

function SidebarContent({
  groups,
  onNavigate,
  homeHref,
  nav,
  adminHref,
}: {
  groups: NavGroup[];
  onNavigate?: () => void;
  homeHref: string;
  nav: NavVariant;
  adminHref?: string;
}) {
  const [query, setQuery] = useState("");

  const filteredGroups = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return groups;
    return groups
      .map((g) => ({
        ...g,
        items: g.items.filter(
          (item) => item.label.toLowerCase().includes(q) || item.href.toLowerCase().includes(q)
        ),
      }))
      .filter((g) => g.items.length > 0);
  }, [groups, query]);

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-sidebar">
      {/* Pinned Header */}
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-border px-4 bg-sidebar">
        <Logo href={homeHref} />
        {nav === "admin" ? (
          <span className="rounded-full bg-lime px-2.5 py-0.5 font-mono text-[0.62rem] font-medium tracking-wider text-lime-ink uppercase">
            Admin CMS
          </span>
        ) : (
          <span className="rounded-full border border-foreground/15 px-2.5 py-0.5 font-mono text-[0.62rem] font-medium tracking-wider text-muted-foreground uppercase">
            Pelajar
          </span>
        )}
      </div>

      {/* Pinned Quick Search */}
      <div className="shrink-0 p-3 pb-1.5 bg-sidebar">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari menu…"
            className="h-8 w-full rounded-full border border-border/70 bg-background/60 pl-8 pr-7 text-xs text-sidebar-foreground placeholder:text-muted-foreground/70 transition-colors focus:border-foreground/40 focus:bg-background focus:outline-none focus:ring-1 focus:ring-ring/40"
            aria-label="Cari navigasi"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground"
              aria-label="Hapus pencarian menu"
            >
              <X className="size-3" />
            </button>
          )}
        </div>
      </div>

      {/* Scrollable Nav Area */}
      <ScrollArea className="flex-1 min-h-0 overflow-hidden">
        {!filteredGroups.length ? (
          <p className="px-3 py-8 text-center text-xs text-muted-foreground">Menu tidak ditemukan.</p>
        ) : (
          <NavItems groups={filteredGroups} onNavigate={onNavigate} />
        )}
      </ScrollArea>

      {/* Pinned Footer */}
      <SidebarFooter nav={nav} adminHref={adminHref} onNavigate={onNavigate} />
    </div>
  );
}

export function AppSidebar({ nav, homeHref, adminHref }: { nav: NavVariant; homeHref: string; adminHref?: string }) {
  const groups = NAVS[nav];
  return (
    <aside className="hidden h-full w-72 shrink-0 border-r border-border bg-sidebar overflow-hidden lg:flex">
      <SidebarContent
        groups={groups}
        homeHref={homeHref}
        nav={nav}
        adminHref={adminHref}
      />
    </aside>
  );
}

export function MobileNav({ nav, homeHref, adminHref }: { nav: NavVariant; homeHref: string; adminHref?: string }) {
  const groups = NAVS[nav];
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Buka menu navigasi">
          <Menu className="size-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="h-dvh w-72 p-0 overflow-hidden bg-sidebar">
        <SheetHeader className="sr-only">
          <SheetTitle>Menu Navigasi</SheetTitle>
        </SheetHeader>
        <SidebarContent
          groups={groups}
          homeHref={homeHref}
          nav={nav}
          adminHref={adminHref}
          onNavigate={() => setOpen(false)}
        />
      </SheetContent>
    </Sheet>
  );
}
