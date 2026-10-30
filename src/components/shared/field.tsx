"use client";

import { useId } from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/** Accessible form field wrapper: label, control, hint and error with aria wiring. */
export function Field({
  label,
  error,
  hint,
  className,
  children,
}: {
  label: React.ReactNode;
  error?: string;
  hint?: React.ReactNode;
  className?: string;
  children: (props: { id: string; "aria-invalid": boolean; "aria-describedby"?: string }) => React.ReactNode;
}) {
  const id = useId();
  const describedBy = [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(" ") || undefined;
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={id}>{label}</Label>
      {children({ id, "aria-invalid": Boolean(error), "aria-describedby": describedBy })}
      {hint && !error && (
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} role="alert" className="text-xs font-medium text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

export function FormMessage({ tone = "error", children }: { tone?: "error" | "success" | "info"; children: React.ReactNode }) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "rounded-lg border px-3 py-2 text-sm",
        tone === "error" && "border-destructive/30 bg-destructive/5 text-destructive",
        tone === "success" && "border-success/30 bg-success/10 text-success",
        tone === "info" && "border-info/30 bg-info/10 text-foreground",
      )}
    >
      {children}
    </div>
  );
}
