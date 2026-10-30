import { Info, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const tones = {
  info: "border-info/30 bg-info/5",
  success: "border-success/40 bg-success/10",
  warning: "border-warning/50 bg-warning/10",
  error: "border-destructive/30 bg-destructive/5",
};
const iconTones = { info: "text-info", success: "text-success", warning: "text-warning-foreground dark:text-warning", error: "text-destructive" };

export function Alert({
  tone = "info",
  icon: Icon = Info,
  title,
  children,
  className,
}: {
  tone?: keyof typeof tones;
  icon?: LucideIcon;
  title: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div role={tone === "error" ? "alert" : "status"} className={cn("flex gap-3 rounded-xl border p-4", tones[tone], className)}>
      <Icon className={cn("mt-0.5 size-5 shrink-0", iconTones[tone])} aria-hidden />
      <div className="space-y-1 text-sm">
        <p className="font-semibold">{title}</p>
        {children && <div className="text-muted-foreground">{children}</div>}
      </div>
    </div>
  );
}
