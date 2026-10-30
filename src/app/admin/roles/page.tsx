import type { Metadata } from "next";
import Link from "next/link";
import { Check, Minus } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requirePermission } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Admin · Role & izin" };

const PERMISSION_LABEL: Record<string, string> = {
  "content.read": "Melihat konten & bank soal",
  "content.write": "Membuat/mengubah konten (draft)",
  "content.publish": "Memublikasikan & mengubah konten terbit",
  "content.delete": "Menghapus konten",
  "users.read": "Melihat pengguna",
  "users.manage": "Mengelola pengguna & role (kecuali super admin)",
  "roles.manage": "Memberikan role super admin",
  "reports.view": "Melihat laporan",
  "audit.view": "Melihat audit log",
  "settings.manage": "Mengubah pengaturan sistem",
  "grading.manage": "Menilai writing & jawaban manual",
};

export default async function RolesPage() {
  await requirePermission("users.read", "/admin/roles");
  const supabase = await createClient();
  const [{ data: roles }, { data: perms }, { data: staff }] = await Promise.all([
    supabase.from("roles").select("*").order("rank", { ascending: false }),
    supabase.from("role_permissions").select("role, permission"),
    supabase.from("user_roles").select("role, user_id").neq("role", "student"),
  ]);
  const staffIds = [...new Set((staff ?? []).map((s) => s.user_id))];
  const { data: staffProfiles } = staffIds.length ? await supabase.from("profiles").select("id, username, display_name").in("id", staffIds) : { data: [] };
  const has = (role: string, p: string) => (perms ?? []).some((x) => x.role === role && x.permission === p);
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Sistem" title="Role & izin" description="Izin ditegakkan di database (RLS & fungsi SQL), bukan sekadar menyembunyikan menu. Matriks ini dibaca langsung dari tabel role_permissions." />
      <div className="overflow-x-auto rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Izin</TableHead>
              {(roles ?? []).map((r) => (
                <TableHead key={r.role} className="text-center">
                  {r.name}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Object.entries(PERMISSION_LABEL).map(([p, label]) => (
              <TableRow key={p}>
                <TableCell>
                  <p className="font-medium">{label}</p>
                  <p className="font-mono text-xs text-muted-foreground">{p}</p>
                </TableCell>
                {(roles ?? []).map((r) => (
                  <TableCell key={r.role} className="text-center">
                    {has(r.role, p) ? <Check className="mx-auto size-4 text-success" aria-label="Ya" /> : <Minus className="mx-auto size-4 text-muted-foreground" aria-label="Tidak" />}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Anggota tim ({staff?.length ?? 0})</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="divide-y text-sm">
            {(staff ?? []).map((s, i) => {
              const p = staffProfiles?.find((x) => x.id === s.user_id) ?? { id: s.user_id, username: "?", display_name: "(profil tidak terbaca)" };
              return (
                <li key={i} className="flex justify-between py-2">
                  <Link href={`/admin/users?user=${p.id}`} className="hover:underline">
                    {p.display_name} <span className="text-muted-foreground">@{p.username}</span>
                  </Link>
                  <span className="font-mono text-xs">{s.role}</span>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
