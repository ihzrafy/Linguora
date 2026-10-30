"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

export function MarkAllRead() {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      variant="outline"
      disabled={pending}
      onClick={() =>
        start(async () => {
          // RLS restricts this update to the signed-in user's rows and the read_at column.
          await createClient().from("notifications").update({ read_at: new Date().toISOString() }).is("read_at", null);
          router.refresh();
        })
      }
    >
      {pending ? <Loader2 className="animate-spin" /> : <CheckCheck />} Tandai semua dibaca
    </Button>
  );
}
