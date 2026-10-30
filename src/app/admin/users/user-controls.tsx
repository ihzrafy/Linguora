"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { adjustXpAction, setRoleAction, unlockLevelAction } from "@/app/admin/user-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const ROLES = [
  ["super_admin", "Super Admin"],
  ["admin", "Admin"],
  ["content_editor", "Content Editor"],
  ["reviewer", "Reviewer"],
  ["student", "Student"],
] as const;

export function RoleToggles({ userId, roles, disabled }: { userId: string; roles: string[]; disabled: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-wrap gap-2">
      {ROLES.map(([key, label]) => (
        <label key={key} className="flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-sm">
          <input
            type="checkbox"
            disabled={disabled || pending}
            checked={roles.includes(key)}
            onChange={(e) =>
              start(async () => {
                const res = await setRoleAction(userId, key, e.target.checked);
                if (!res.ok) toast.error(res.error);
                else toast.success("Role diperbarui");
                router.refresh();
              })
            }
          />
          {label}
        </label>
      ))}
      {pending && <Loader2 className="size-4 animate-spin" />}
    </div>
  );
}

export function XpAdjust({ userId }: { userId: string }) {
  const router = useRouter();
  const [amount, setAmount] = useState(0);
  const [reason, setReason] = useState("");
  const [pending, start] = useTransition();
  return (
    <form
      className="flex flex-wrap items-end gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await adjustXpAction(userId, amount, reason);
          if (!res.ok) return void toast.error(res.error);
          toast.success("XP disesuaikan");
          setAmount(0);
          setReason("");
          router.refresh();
        });
      }}
    >
      <div className="space-y-1">
        <Label htmlFor="xp-amt">Penyesuaian XP</Label>
        <Input id="xp-amt" type="number" min={-1000} max={1000} value={amount} onChange={(e) => setAmount(Number(e.target.value))} className="w-28" />
      </div>
      <div className="flex-1 space-y-1">
        <Label htmlFor="xp-reason">Alasan (tercatat di audit log)</Label>
        <Input id="xp-reason" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} />
      </div>
      <Button type="submit" variant="outline" disabled={pending || !amount}>
        Terapkan
      </Button>
    </form>
  );
}

export function UnlockLevel({ userId, levels }: { userId: string; levels: { id: string; code: string; unlocked: boolean }[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-wrap gap-2">
      {levels.map((l) => (
        <Button
          key={l.id}
          size="sm"
          variant={l.unlocked ? "secondary" : "outline"}
          disabled={l.unlocked || pending}
          onClick={() =>
            start(async () => {
              const res = await unlockLevelAction(userId, l.id);
              if (!res.ok) toast.error(res.error);
              router.refresh();
            })
          }
        >
          {l.code} {l.unlocked ? "✓" : "buka"}
        </Button>
      ))}
    </div>
  );
}
