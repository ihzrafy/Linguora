import { Flame, Zap } from "lucide-react";
import { AppSidebar, MobileNav } from "@/components/layout/app-sidebar";
import { NotificationBell } from "@/components/layout/notification-bell";
import { UserMenu } from "@/components/layout/user-menu";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { requireViewer } from "@/lib/auth";
import { effectiveStreak, localDate } from "@/lib/learning/streak";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const viewer = await requireViewer("/app/dashboard");
  const supabase = await createClient();
  const [{ data: stats }, { count: unread }] = await Promise.all([
    supabase.from("user_stats").select("total_xp, current_streak, last_active_date").eq("user_id", viewer.id).maybeSingle(),
    supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", viewer.id).is("read_at", null),
  ]);
  const streak = effectiveStreak(stats?.current_streak ?? 0, stats?.last_active_date ?? null, localDate(viewer.profile.timezone));

  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      <AppSidebar nav="app" homeHref="/app/dashboard" adminHref={viewer.isStaff ? "/admin" : undefined} />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-16 shrink-0 items-center gap-2 border-b border-border bg-background/85 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/70 sm:px-6">
          <MobileNav nav="app" homeHref="/app/dashboard" adminHref={viewer.isStaff ? "/admin" : undefined} />
          <div className="flex-1" />
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-semibold" aria-label={`Streak ${streak} hari`}>
                <Flame className={streak > 0 ? "size-4 text-orange-500" : "size-4 text-muted-foreground"} aria-hidden />
                {streak}
              </div>
            </TooltipTrigger>
            <TooltipContent>Streak harian: {streak} hari</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="hidden items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-semibold sm:flex" aria-label={`${stats?.total_xp ?? 0} XP`}>
                <Zap className="size-4 text-brand-blue" aria-hidden />
                {(stats?.total_xp ?? 0).toLocaleString("id-ID")} XP
              </div>
            </TooltipTrigger>
            <TooltipContent>Total XP</TooltipContent>
          </Tooltip>
          <NotificationBell unread={unread ?? 0} />
          <ThemeToggle />
          <UserMenu
            name={viewer.profile.display_name}
            username={viewer.profile.username}
            avatarUrl={viewer.profile.avatar_url}
            isStaff={viewer.isStaff}
          />
        </header>
        <main id="main" className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="mx-auto w-full max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
