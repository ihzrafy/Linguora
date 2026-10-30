"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/shared/states";
import { Button } from "@/components/ui/button";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[app-error]", error.digest ?? "", error.message);
  }, [error]);
  return (
    <ErrorState
      title="Bagian ini gagal dimuat"
      description={`Coba muat ulang. Jika masalah berlanjut, hubungi kami.${error.digest ? ` Kode: ${error.digest}` : ""}`}
      action={<Button onClick={reset}>Coba lagi</Button>}
    />
  );
}
