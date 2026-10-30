import { AlertTriangle, Inbox, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-12 text-center", className)}>
      <div className="mb-4 rounded-full bg-accent p-3 text-accent-foreground">
        <Icon className="size-6" aria-hidden />
      </div>
      <h3 className="text-base font-semibold">{title}</h3>
      {description && <p className="mt-1 max-w-md text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({
  title = "Terjadi kesalahan",
  description,
  action,
}: {
  title?: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center rounded-2xl border border-destructive/30 bg-destructive/5 px-6 py-12 text-center"
    >
      <div className="mb-4 rounded-full bg-destructive/10 p-3 text-destructive">
        <AlertTriangle className="size-6" aria-hidden />
      </div>
      <h3 className="text-base font-semibold">{title}</h3>
      {description && <p className="mt-1 max-w-md text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
