"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { bulkStatusAction } from "@/app/admin/resource-actions";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";

/** Checkbox selection + bulk status change for list pages. Rows render <input data-bulk value=id>. */
export function BulkStatusBar({ resourceKey, formId }: { resourceKey: string; formId: string }) {
  const router = useRouter();
  const [status, setStatus] = useState("published");
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span className="text-muted-foreground">Ubah status terpilih:</span>
      <NativeSelect size="sm" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status baru">
        <option value="draft">Draft</option>
        <option value="in_review">In review</option>
        <option value="published">Published</option>
        <option value="archived">Archived</option>
      </NativeSelect>
      <Button
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const ids = [...document.querySelectorAll<HTMLInputElement>(`#${formId} input[data-bulk]:checked`)].map((i) => i.value);
            if (!ids.length) return void toast.info("Pilih minimal satu baris.");
            const res = await bulkStatusAction(resourceKey, ids, status as "published");
            if (!res.ok) return void toast.error(res.error);
            toast.success(`${res.data.count} item diperbarui`);
            router.refresh();
          })
        }
      >
        {pending && <Loader2 className="animate-spin" />} Terapkan
      </Button>
    </div>
  );
}
