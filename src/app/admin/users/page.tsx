import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Search } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Pager } from "@/components/shared/pager";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requirePermission } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { RoleToggles, UnlockLevel, XpAdjust } from "./user-controls";

export const metadata: Metadata = { title: "Admin · Pengguna" };
const PAGE = 30;

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string; user?: string; role?: string }> }) {
  const sp = await searchParams;
  const viewer = await requirePermission("users.read", "/admin/users");
  const canManage = viewer.permissions.has("users.manage");
  const supabase = await createClient();

  if (sp.user) {
    const [{ data: profile }, { data: roles }, { data: stats }, { data: unlocks }, { data: levels }, { data: attempts }, authUser] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", sp.user).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", sp.user),
      supabase.from("user_stats").select("*").eq("user_id", sp.user).maybeSingle(),
      supabase.from("user_level_unlocks").select("level_id, source").eq("user_id", sp.user),
      supabase.from("levels").select("id, code").order("sort_order"),
      supabase.from("assessment_attempts").select("id, kind, score_percent, passed, submitted_at").eq("user_id", sp.user).neq("status", "in_progress").order("submitted_at", { ascending: false }).limit(10),
      createAdminClient().auth.admin.getUserById(sp.user),
    ]);
    if (profile) {
      const u = authUser.data.user;
      return (
        <div className="mx-auto max-w-4xl space-y-6">
          <Link href="/admin/users" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" /> Semua pengguna
          </Link>
          <PageHeader title={profile.display_name} description={`@${profile.username} · ${u?.email ?? "—"} · bergabung ${new Date(profile.created_at).toLocaleDateString("id-ID")} · login terakhir ${u?.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleString("id-ID") : "—"}`} />
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              ["Total XP", stats?.total_xp ?? 0],
              ["Streak terpanjang", stats?.longest_streak ?? 0],
              ["Lesson selesai", stats?.lessons_completed ?? 0],
              ["Jawaban benar", stats?.correct_answers ?? 0],
            ].map(([l, v]) => (
              <div key={l as string} className="rounded-xl border bg-card p-3">
                <p className="text-xl font-bold tabular-nums">{Number(v).toLocaleString("id-ID")}</p>
                <p className="text-xs text-muted-foreground">{l as string}</p>
              </div>
            ))}
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Role</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <RoleToggles userId={profile.id} roles={(roles ?? []).map((r) => r.role)} disabled={!canManage || profile.id === viewer.id} />
              <p className="text-xs text-muted-foreground">Perubahan role tercatat di audit log. Admin tidak dapat memberikan role Super Admin; tidak ada yang dapat mengubah role akunnya sendiri.</p>
            </CardContent>
          </Card>
          {canManage && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Akses level & XP</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <UnlockLevel userId={profile.id} levels={(levels ?? []).map((l) => ({ id: l.id, code: l.code, unlocked: Boolean(unlocks?.some((x) => x.level_id === l.id)) }))} />
                <XpAdjust userId={profile.id} />
              </CardContent>
            </Card>
          )}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Assessment terakhir</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="divide-y text-sm">
                {(attempts ?? []).map((a) => (
                  <li key={a.id} className="flex justify-between py-2">
                    <span>{a.kind}</span>
                    <span>
                      {a.score_percent !== null ? `${Number(a.score_percent)}%` : "–"} {a.passed === true ? "✓" : a.passed === false ? "✗" : ""} · {a.submitted_at ? new Date(a.submitted_at).toLocaleDateString("id-ID") : ""}
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      );
    }
  }

  const page = Math.max(1, Number(sp.page) || 1);
  let roleFilterIds: string[] | null = null;
  if (sp.role) {
    const { data } = await supabase.from("user_roles").select("user_id").eq("role", sp.role as never).limit(1000);
    roleFilterIds = (data ?? []).map((r) => r.user_id);
  }
  let query = supabase.from("profiles").select("id, username, display_name, created_at, leaderboard_opt_in", { count: "exact" }).order("created_at", { ascending: false }).range((page - 1) * PAGE, page * PAGE - 1);
  if (sp.q) query = query.or(`username.ilike.%${sp.q.replace(/[%,()]/g, "")}%,display_name.ilike.%${sp.q.replace(/[%,()]/g, "")}%`);
  if (roleFilterIds) query = query.in("id", roleFilterIds.length ? roleFilterIds : ["00000000-0000-0000-0000-000000000000"]);
  const { data: rows, count } = await query;
  const ids = (rows ?? []).map((r) => r.id);
  const [{ data: roleRows }, { data: statRows }] = ids.length
    ? await Promise.all([supabase.from("user_roles").select("user_id, role").in("user_id", ids), supabase.from("user_stats").select("user_id, total_xp").in("user_id", ids)])
    : [{ data: [] }, { data: [] }];
  const list = (rows ?? []).map((r) => ({
    ...r,
    roles: (roleRows ?? []).filter((x) => x.user_id === r.id).map((x) => x.role as string),
    xp: (statRows ?? []).find((x) => x.user_id === r.id)?.total_xp ?? 0,
  }));

  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Sistem" title="Pengguna" description={`${count ?? 0} akun terdaftar.`} />
      <form className="flex flex-wrap gap-2" role="search">
        <div className="relative min-w-60 flex-1">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input name="q" defaultValue={sp.q} placeholder="Cari username atau nama…" className="pl-9" aria-label="Cari pengguna" />
        </div>
        <NativeSelect name="role" defaultValue={sp.role ?? ""} aria-label="Role">
          <option value="">Semua role</option>
          {["super_admin", "admin", "content_editor", "reviewer", "student"].map((r) => (
            <option key={r}>{r}</option>
          ))}
        </NativeSelect>
        <Button type="submit" variant="secondary">
          Cari
        </Button>
      </form>
      <div className="overflow-x-auto rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Pengguna</TableHead>
              <TableHead>Role</TableHead>
              <TableHead className="text-right">XP</TableHead>
              <TableHead>Bergabung</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.map((u) => (
              <TableRow key={u.id}>
                <TableCell>
                  <p className="font-medium">{u.display_name}</p>
                  <p className="text-xs text-muted-foreground">@{u.username}</p>
                </TableCell>
                <TableCell className="space-x-1">
                  {u.roles.map((r) => (
                    <Badge key={r} variant={r === "student" ? "outline" : "default"}>
                      {r}
                    </Badge>
                  ))}
                </TableCell>
                <TableCell className="text-right tabular-nums">{u.xp.toLocaleString("id-ID")}</TableCell>
                <TableCell className="text-xs">{new Date(u.created_at).toLocaleDateString("id-ID")}</TableCell>
                <TableCell>
                  <Link href={`/admin/users?user=${u.id}`} className="text-sm font-medium text-primary hover:underline">
                    Detail
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <Pager page={page} pageSize={PAGE} total={count ?? 0} basePath="/admin/users" params={{ q: sp.q, role: sp.role }} />
    </div>
  );
}
