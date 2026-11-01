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
      <div className="space-y-2.5">
        {eyebrow && (
          <p className="type-eyebrow flex items-center gap-2.5 text-muted-foreground">
            <span aria-hidden className="size-1.5 shrink-0 bg-lime ring-1 ring-foreground/15" />
            {eyebrow}
          </p>
        )}
        <h1 className="font-display text-3xl font-semibold tracking-[-0.035em] md:text-4xl">{title}</h1>
        {description && <p className="max-w-2xl text-sm text-muted-foreground md:text-base">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
