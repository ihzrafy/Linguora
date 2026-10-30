"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

/** The runner reads device storage on first render, so it is rendered on the client only. */
export const AttemptRunnerClient = dynamic(() => import("./attempt-runner").then((m) => m.AttemptRunner), {
  ssr: false,
  loading: () => (
    <div className="mx-auto max-w-3xl space-y-4" aria-busy="true" aria-label="Memuat soal">
      <Skeleton className="h-20 rounded-xl" />
      <Skeleton className="h-80 rounded-2xl" />
    </div>
  ),
});
