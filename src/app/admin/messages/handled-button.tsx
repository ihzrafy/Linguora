"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { setMessageHandledAction } from "./actions";

export function HandledButton({ id, handled }: { id: string; handled: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      variant={handled ? "ghost" : "outline"}
      size="sm"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await setMessageHandledAction(id, !handled);
          if (!res.ok) return void toast.error(res.error);
          router.refresh();
        })
      }
    >
      {pending ? <Loader2 className="animate-spin" /> : handled ? <RotateCcw /> : <Check />} {handled ? "Buka lagi" : "Tandai ditangani"}
    </Button>
  );
}
