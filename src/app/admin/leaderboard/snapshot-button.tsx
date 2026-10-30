"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Camera, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { snapshotAction } from "./actions";

export function SnapshotButton() {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <div className="flex gap-2">
      {(["weekly", "monthly", "all_time"] as const).map((p) => (
        <Button
          key={p}
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const res = await snapshotAction(p);
              if (!res.ok) return void toast.error(res.error);
              toast.success(`Snapshot ${p}: ${res.data} baris`);
              router.refresh();
            })
          }
        >
          {pending ? <Loader2 className="animate-spin" /> : <Camera />} Snapshot {p}
        </Button>
      ))}
    </div>
  );
}
