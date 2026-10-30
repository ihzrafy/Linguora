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
    className: "bg-linear-to-r from-purple-500/15 to-indigo-500/15 text-purple-600 dark:text-purple-300 border-purple-500/30",
  },
  "/app/daily-challenge": {
    label: "Daily",
    className: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
  },
  "/app/placement-test": {
    label: "CEFR",
    className: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30",
  },
  "/admin/content-review": {
    label: "Review",
    className: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
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
          <p className="mb-1.5 px-3 text-[0.68rem] font-bold tracking-wider text-muted-foreground/75 uppercase">
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
                      "group relative flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium transition-all duration-150 select-none",
                      active
                        ? "bg-primary/10 font-semibold text-primary shadow-2xs dark:bg-primary/20 dark:text-primary-foreground"
                        : "text-sidebar-foreground/80 hover:bg-sidebar-accent/70 hover:text-sidebar-foreground hover:translate-x-0.5"
                    )}
                  >
                    {active && (
                      <span className="absolute -left-1 top-2 bottom-2 w-1 rounded-r-full bg-primary" aria-hidden />
                    )}
                    <Icon
                      className={cn(
                        "size-4 shrink-0 transition-colors",
                        active
                          ? "text-primary dark:text-brand-lavender"
                          : "text-muted-foreground group-hover:text-sidebar-foreground"
                      )}
                      aria-hidden
                    />
                    <span className="truncate">{label}</span>
                    {badge && (
                      <span className={cn("ml-auto rounded-md border px-1.5 py-0.5 text-[0.62rem] font-bold leading-none", badge.className)}>
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
          className="group flex items-center gap-2.5 rounded-xl border border-primary/30 bg-primary/5 px-3 py-2 text-xs font-semibold text-primary transition-all hover:border-primary/50 hover:bg-primary/10 shadow-2xs"
        >
          <Shield className="size-4 shrink-0 text-primary transition-transform group-hover:scale-110" aria-hidden />
          <div className="flex-1 min-w-0 text-left">
            <p className="font-semibold leading-tight truncate">Admin CMS</p>
            <p className="text-[0.62rem] font-normal text-muted-foreground truncate">Kelola kurikulum & sistem</p>
          </div>
          <ArrowRight className="size-3.5 text-primary/60 transition-transform group-hover:translate-x-0.5" aria-hidden />
        </Link>
      )}
      {nav === "admin" && (
        <Link
          href="/app/dashboard"
          onClick={onNavigate}
          className="group flex items-center gap-2.5 rounded-xl border border-border bg-card/60 px-3 py-2 text-xs font-semibold text-foreground transition-all hover:border-primary/30 hover:bg-accent shadow-2xs"
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
          <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" aria-hidden />
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
          <span className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-[0.65rem] font-bold tracking-wider text-primary uppercase">
            Admin CMS
          </span>
        ) : (
          <span className="rounded-full border border-border/80 bg-muted/60 px-2.5 py-0.5 text-[0.65rem] font-medium text-muted-foreground">
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
            className="h-8 w-full rounded-lg border border-border/70 bg-sidebar-accent/50 pl-8 pr-7 text-xs text-sidebar-foreground placeholder:text-muted-foreground/70 transition-colors focus:border-primary/50 focus:bg-background focus:outline-none focus:ring-1 focus:ring-primary/40"
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
