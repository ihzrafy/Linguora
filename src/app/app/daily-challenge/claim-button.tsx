"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Gift, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { claimChallengeAction } from "./actions";

export function ClaimButton({ challengeId, claimed, ready }: { challengeId: string; claimed: boolean; ready: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  if (claimed)
    return (
      <p className="flex items-center gap-1 text-sm font-medium text-success">
        <CheckCircle2 className="size-4" /> Hadiah sudah diklaim
      </p>
    );
  return (
    <Button
      size="sm"
      variant={ready ? "default" : "outline"}
      disabled={!ready || pending}
      onClick={() =>
        start(async () => {
          const res = await claimChallengeAction(challengeId);
          if (!res.ok) return void toast.error(res.error);
          toast.success(`+${res.data.xp} XP`);
          router.refresh();
        })
      }
    >
      {pending ? <Loader2 className="animate-spin" /> : <Gift />} {ready ? "Klaim hadiah" : "Belum tercapai"}
    </Button>
  );
}
