"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/shared/states";
import { Button } from "@/components/ui/button";

export default function GlobalRouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[route-error]", error.digest ?? "", error.message);
  }, [error]);
  return (
    <main id="main" className="mx-auto flex min-h-[70dvh] max-w-xl items-center px-4">
      <ErrorState
        title="Terjadi kesalahan"
        description={`Maaf, halaman ini gagal dimuat.${error.digest ? ` Kode: ${error.digest}` : ""}`}
        action={<Button onClick={reset}>Coba lagi</Button>}
      />
    </main>
  );
}
