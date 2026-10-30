import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  eyebrow,
  actions,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  eyebrow?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-4 md:flex-row md:items-end md:justify-between", className)}>
      <div className="space-y-1.5">
        {eyebrow && (
          <p className="text-xs font-semibold tracking-widest text-primary uppercase dark:text-brand-lavender">{eyebrow}</p>
        )}
        <h1 className="text-2xl font-bold md:text-3xl">{title}</h1>
        {description && <p className="max-w-2xl text-sm text-muted-foreground md:text-base">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
