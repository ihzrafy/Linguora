"use client";

import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import { deleteSpeakingSessionAction } from "./actions";

export function DeleteSessionButton({ id }: { id: string }) {
  const router = useRouter();
  return (
    <ConfirmDialog
      trigger={
        <Button size="icon-sm" variant="ghost" aria-label="Hapus sesi">
          <Trash2 />
        </Button>
      }
      title="Hapus sesi speaking?"
      description="Transkrip dan rekaman (jika ada) akan dihapus permanen."
      confirmLabel="Hapus"
      destructive
      onConfirm={async () => {
        const res = await deleteSpeakingSessionAction(id);
        if (!res.ok) toast.error(res.error);
        router.refresh();
      }}
    />
  );
}
