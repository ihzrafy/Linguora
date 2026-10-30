import type { Metadata } from "next";
import { Award, Flame, GraduationCap, Zap } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireViewer } from "@/lib/auth";
import { effectiveStreak, localDate } from "@/lib/learning/streak";
import { createClient } from "@/lib/supabase/server";
import { ProfileForm } from "../settings/settings-forms";

export const metadata: Metadata = { title: "Profil" };

export default async function ProfilePage() {
  const viewer = await requireViewer("/app/profile");
  const supabase = await createClient();
  const [{ data: stats }, { data: level }, { data: certs }, { count: achievements }] = await Promise.all([
    supabase.from("user_stats").select("*").eq("user_id", viewer.id).maybeSingle(),
    viewer.profile.current_level_id ? supabase.from("levels").select("code, name").eq("id", viewer.profile.current_level_id).maybeSingle() : Promise.resolve({ data: null }),
    supabase.from("certificates").select("verification_code, score_percent, levels(code)").eq("user_id", viewer.id),
    supabase.from("user_achievements").select("achievement_id", { count: "exact", head: true }).eq("user_id", viewer.id),
  ]);
  const p = viewer.profile;
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader eyebrow="Akun" title="Profil" description={`Bergabung ${new Date(p.created_at).toLocaleDateString("id-ID", { dateStyle: "long" })}`} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { icon: GraduationCap, label: "Level saat ini", value: level ? `${level.code} · ${level.name}` : "–" },
          { icon: Zap, label: "Total XP", value: (stats?.total_xp ?? 0).toLocaleString("id-ID") },
          { icon: Flame, label: "Streak", value: `${effectiveStreak(stats?.current_streak ?? 0, stats?.last_active_date ?? null, localDate(p.timezone))} hari (terpanjang ${stats?.longest_streak ?? 0})` },
          { icon: Award, label: "Achievement", value: String(achievements ?? 0) },
        ].map(({ icon: Icon, label, value }) => (
          <Card key={label} className="py-4">
            <CardContent className="space-y-1">
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <Icon className="size-3.5" /> {label}
              </p>
              <p className="font-semibold">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Informasi profil</CardTitle>
        </CardHeader>
        <CardContent>
          <ProfileForm userId={viewer.id} initial={{ displayName: p.display_name, username: p.username, bio: p.bio ?? "", avatarUrl: p.avatar_url }} />
        </CardContent>
      </Card>
      {Boolean(certs?.length) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sertifikat internal</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {certs!.map((c) => (
              <Badge key={c.verification_code} className="bg-success text-success-foreground">
                {(c.levels as { code: string }).code} · {Number(c.score_percent)}% · {c.verification_code}
              </Badge>
            ))}
          </CardContent>
        </Card>
      )}
      <p className="text-xs text-muted-foreground">Peran akun: {viewer.roles.join(", ")}</p>
    </div>
  );
}
