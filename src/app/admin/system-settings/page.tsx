import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { aiEnabled, aiModel, aiProvider } from "@/lib/ai/tutor";
import { requireStaff } from "@/lib/auth";
import { serverEnv } from "@/lib/env.server";
import { createClient } from "@/lib/supabase/server";
import { SettingRow } from "./setting-row";

export const metadata: Metadata = { title: "Admin · Pengaturan sistem" };

export default async function SystemSettingsPage() {
  const viewer = await requireStaff();
  const supabase = await createClient();
  const { data: settings } = await supabase.from("system_settings").select("*").order("key");
  const canEdit = viewer.permissions.has("settings.manage");
  const env = serverEnv();
  const integrations = [
    { name: "Database & Auth (Supabase)", ok: true, detail: "Terhubung" },
    { name: "AI tutor", ok: aiEnabled(), detail: aiEnabled() ? `Aktif · ${aiProvider() === "openai" ? "OpenAI" : "Anthropic"} · model ${aiModel()}` : "Belum dikonfigurasi (OPENAI_API_KEY / ANTHROPIC_API_KEY kosong)" },
    { name: "Cron publikasi terjadwal", ok: Boolean(env.CRON_SECRET), detail: env.CRON_SECRET ? "CRON_SECRET terpasang" : "CRON_SECRET belum diatur" },
    { name: "Email notifikasi / push", ok: false, detail: "Belum ada penyedia — notifikasi hanya in-app" },
    { name: "Pembayaran", ok: false, detail: "Belum ada penyedia pembayaran" },
  ];
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader eyebrow="Sistem" title="Pengaturan sistem" description={canEdit ? "Perubahan berlaku segera dan tercatat di audit log." : "Hanya Super Admin yang dapat mengubah pengaturan."} />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Integrasi</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {integrations.map((i) => (
            <div key={i.name} className="flex items-center justify-between gap-2 text-sm">
              <span>{i.name}</span>
              <Badge variant={i.ok ? "default" : "outline"} className={i.ok ? "bg-success text-success-foreground" : ""}>
                {i.detail}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Parameter platform</CardTitle>
        </CardHeader>
        <CardContent className="divide-y">
          {(settings ?? []).map((s) => (
            <SettingRow key={s.key} settingKey={s.key} description={s.description ?? ""} value={JSON.stringify(s.value)} canEdit={canEdit} />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
