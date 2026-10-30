"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { toggleBookmarkAction } from "@/app/app/personal-actions";
import { Button } from "@/components/ui/button";

export function RemoveBookmark(props: { targetType: string; targetId: string; title: string; href: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      size="icon-sm"
      variant="ghost"
      aria-label={`Hapus bookmark ${props.title}`}
      disabled={pending}
      onClick={() =>
        start(async () => {
          await toggleBookmarkAction({ ...props, targetType: props.targetType as "lesson" });
          router.refresh();
        })
      }
    >
      <X />
    </Button>
  );
}
