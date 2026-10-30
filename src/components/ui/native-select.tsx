import * as React from "react";
import { cn } from "cn";
import { ChevronDown } from "lucide-react";

export interface NativeSelectProps extends Omit<React.ComponentProps<"select">, "size"> {
  size?: "xs" | "sm" | "default" | "lg";
  variant?: "default" | "subtle" | "ghost" | "inline";
  icon?: React.ReactNode;
  wrapperClassName?: string;
  chevronClassName?: string;
  fullWidth?: boolean;
}

const sizeClasses = {
  xs: "h-7 text-xs pl-2.5 pr-7 rounded-md",
  sm: "h-8 text-xs pl-2.5 pr-8 rounded-lg",
  default: "h-9 text-sm pl-3 pr-9 rounded-lg",
  lg: "h-10 text-sm pl-3.5 pr-10 rounded-xl",
};

const chevronSizes = {
  xs: "size-3 right-2",
  sm: "size-3.5 right-2",
  default: "size-4 right-2.5",
  lg: "size-4 right-3",
};

const variantClasses = {
  default:
    "border border-input bg-background/95 hover:bg-accent/40 hover:border-primary/50 text-foreground shadow-2xs dark:bg-card/75 dark:hover:bg-card/90",
  subtle:
    "border border-border/70 bg-muted/40 hover:bg-muted/70 text-foreground",
  ghost: "border-transparent bg-transparent hover:bg-muted/50 text-foreground",
  inline:
    "border-2 border-border/80 bg-background hover:border-primary/50 text-foreground",
};

export const NativeSelect = React.forwardRef<HTMLSelectElement, NativeSelectProps>(
  (
    {
      className,
      size = "default",
      variant = "default",
      icon,
      wrapperClassName,
      chevronClassName,
      fullWidth,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const isFullWidth = fullWidth || className?.includes("w-full");

    return (
      <div
        className={cn(
          "group relative",
          isFullWidth ? "flex w-full" : "inline-flex items-center",
          wrapperClassName
        )}
      >
        {icon && (
          <span
            className={cn(
              "pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary",
              size === "xs" && "left-2",
              size === "lg" && "left-3"
            )}
            aria-hidden
          >
            {icon}
          </span>
        )}
        <select
          ref={ref}
          disabled={disabled}
          className={cn(
            "appearance-none cursor-pointer w-full font-medium transition-all duration-150 outline-none select-none",
            "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40",
            "disabled:cursor-not-allowed disabled:opacity-50",
            sizeClasses[size],
            variantClasses[variant],
            icon && (size === "xs" ? "pl-7" : size === "lg" ? "pl-10" : "pl-9"),
            className
          )}
          {...props}
        >
          {children}
        </select>
        <ChevronDown
          className={cn(
            "pointer-events-none absolute top-1/2 -translate-y-1/2 text-muted-foreground transition-all duration-200 group-hover:text-foreground group-focus-within:text-primary group-focus-within:rotate-180",
            chevronSizes[size],
            disabled && "opacity-40",
            chevronClassName
          )}
          aria-hidden
        />
      </div>
    );
  }
);

NativeSelect.displayName = "NativeSelect";

export const SelectNative = NativeSelect;
