"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateSettingAction } from "./actions";

export function SettingRow({ settingKey, description, value, canEdit }: { settingKey: string; description: string; value: string; canEdit: boolean }) {
  const router = useRouter();
  const [v, setV] = useState(value);
  const [pending, start] = useTransition();
  return (
    <div className="grid gap-2 py-3 sm:grid-cols-[1fr_14rem_auto] sm:items-center">
      <div>
        <p className="font-mono text-sm font-medium">{settingKey}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Input value={v} onChange={(e) => setV(e.target.value)} disabled={!canEdit} aria-label={settingKey} className="font-mono" />
      {canEdit && (
        <Button
          size="sm"
          variant="outline"
          disabled={pending || v === value}
          onClick={() =>
            start(async () => {
              const res = await updateSettingAction(settingKey, v);
              if (!res.ok) return void toast.error(res.error);
              toast.success("Pengaturan diperbarui");
              router.refresh();
            })
          }
        >
          {pending && <Loader2 className="animate-spin" />} Simpan
        </Button>
      )}
    </div>
  );
}
