import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AppSidebar, MobileNav } from "@/components/layout/app-sidebar";
import { UserMenu } from "@/components/layout/user-menu";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { requireStaff } from "@/lib/auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const viewer = await requireStaff();
  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      <AppSidebar nav="admin" homeHref="/admin" />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-16 shrink-0 items-center gap-2 border-b border-border bg-background/85 px-4 backdrop-blur sm:px-6">
          <MobileNav nav="admin" homeHref="/admin" />
          <Badge variant="secondary" className="hidden sm:inline-flex">
            Admin CMS · {viewer.roles.filter((r) => r !== "student").join(", ")}
          </Badge>
          <div className="flex-1" />
          <Link href="/app/dashboard" className="hidden items-center gap-1 text-sm text-muted-foreground hover:text-foreground sm:flex">
            <ArrowLeft className="size-4" /> Aplikasi belajar
          </Link>
          <ThemeToggle />
          <UserMenu name={viewer.profile.display_name} username={viewer.profile.username} avatarUrl={viewer.profile.avatar_url} isStaff />
        </header>
        <main id="main" className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
