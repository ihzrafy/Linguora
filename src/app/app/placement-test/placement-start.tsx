"use client";

import { useState } from "react";
import { StartAttemptButton } from "@/components/questions/start-button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export function PlacementStart({ hasOpen }: { hasOpen: boolean }) {
  const [timed, setTimed] = useState(false);
  return (
    <div className="flex flex-col gap-4 rounded-2xl border bg-card p-5 sm:flex-row sm:items-center sm:justify-between">
      {!hasOpen ? (
        <div className="flex items-center gap-3">
          <Switch id="timed" checked={timed} onCheckedChange={setTimed} />
          <Label htmlFor="timed" className="flex flex-col items-start gap-0.5">
            <span>Mode berwaktu</span>
            <span className="text-xs font-normal text-muted-foreground">Nonaktif = tanpa batas waktu</span>
          </Label>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Kamu memiliki placement test yang belum selesai.</p>
      )}
      <StartAttemptButton target={{ kind: "placement", timed }} hrefFor="/app/placement-test" size="lg">
        {hasOpen ? "Lanjutkan placement test" : "Mulai placement test"}
      </StartAttemptButton>
    </div>
  );
}
