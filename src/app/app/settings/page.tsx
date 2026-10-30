import type { Metadata } from "next";
import { Download } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { DeleteAccount, PasswordForm, PreferencesForm } from "./settings-forms";

export const metadata: Metadata = { title: "Pengaturan" };

export default async function SettingsPage() {
  const viewer = await requireViewer("/app/settings");
  const supabase = await createClient();
  const { data: tracks } = await supabase.from("learning_tracks").select("id, slug, name").eq("status", "published").order("sort_order");
  const p = viewer.profile;
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader eyebrow="Akun" title="Pengaturan" />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Belajar & privasi</CardTitle>
        </CardHeader>
        <CardContent>
          <PreferencesForm
            initial={{
              timezone: p.timezone,
              dailyGoalXp: p.daily_goal_xp,
              dailyGoalMinutes: p.daily_goal_minutes,
              trackSlug: tracks?.find((t) => t.id === p.active_track_id)?.slug ?? null,
              leaderboardOptIn: p.leaderboard_opt_in,
              learningGoal: p.learning_goal,
            }}
            tracks={tracks ?? []}
          />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tampilan</CardTitle>
          <CardDescription>Mode terang, gelap, atau mengikuti sistem.</CardDescription>
        </CardHeader>
        <CardContent>
          <ThemeToggle />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Keamanan</CardTitle>
          <CardDescription>Email akun: {viewer.email}</CardDescription>
        </CardHeader>
        <CardContent>
          <PasswordForm />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Data pribadi</CardTitle>
          <CardDescription>Unduh salinan seluruh data belajarmu dalam format JSON.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline">
            <a href="/app/settings/export">
              <Download /> Unduh data saya
            </a>
          </Button>
        </CardContent>
      </Card>
      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="text-base text-destructive">Zona berbahaya</CardTitle>
          <CardDescription>Menghapus akun akan menghapus seluruh data secara permanen.</CardDescription>
        </CardHeader>
        <CardContent>
          <DeleteAccount />
        </CardContent>
      </Card>
    </div>
  );
}
