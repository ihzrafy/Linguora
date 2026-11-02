"use client";

import * as React from "react";
import { cn } from "cn";
import { Popover as PopoverPrimitive } from "radix-ui";
import { ChevronDown, Check, Search, X } from "lucide-react";

export interface SelectOption {
  value: string | number;
  label: React.ReactNode;
  icon?: React.ReactNode;
  disabled?: boolean;
}

export interface NativeSelectProps extends Omit<React.ComponentProps<"select">, "size"> {
  size?: "xs" | "sm" | "default" | "lg";
  variant?: "default" | "subtle" | "ghost" | "inline";
  icon?: React.ReactNode;
  wrapperClassName?: string;
  chevronClassName?: string;
  popoverClassName?: string;
  fullWidth?: boolean;
  native?: boolean;
  searchable?: boolean;
  options?: SelectOption[];
  placeholder?: string;
}

const sizeClasses = {
  xs: "h-7 text-xs px-2.5 rounded-md gap-1.5",
  sm: "h-8 text-xs px-3 rounded-lg gap-2",
  default: "h-9 text-sm px-3.5 rounded-xl gap-2",
  lg: "h-10 text-sm font-medium px-4 rounded-xl gap-2.5",
};

const chevronSizes = {
  xs: "size-3 shrink-0",
  sm: "size-3.5 shrink-0",
  default: "size-4 shrink-0",
  lg: "size-4 shrink-0",
};

const variantClasses = {
  default:
    "border border-border/80 bg-background/95 hover:bg-accent/40 hover:border-primary/50 text-foreground shadow-2xs dark:bg-card/75 dark:border-border/70 dark:hover:bg-card/95",
  subtle:
    "border border-border/60 bg-muted/40 hover:bg-muted/70 text-foreground dark:bg-muted/20 dark:hover:bg-muted/40",
  ghost:
    "border border-transparent bg-transparent hover:bg-muted/60 text-foreground",
  inline:
    "border-2 border-primary/30 bg-primary/5 hover:border-primary/60 hover:bg-primary/10 text-primary dark:text-primary-foreground font-semibold rounded-lg shadow-2xs",
};

function extractOptions(children: React.ReactNode, directOptions?: SelectOption[]): SelectOption[] {
  if (directOptions && directOptions.length > 0) return directOptions;
  const result: SelectOption[] = [];

  const processNode = (node: React.ReactNode) => {
    if (!node) return;
    if (Array.isArray(node)) {
      node.forEach(processNode);
      return;
    }
    if (!React.isValidElement(node)) return;

    const props = node.props as { value?: string | number; children?: React.ReactNode; disabled?: boolean };

    if (node.type === "option") {
      const val = props.value !== undefined ? props.value : (typeof props.children === "string" || typeof props.children === "number" ? props.children : "");
      result.push({
        value: String(val),
        label: props.children ?? String(val),
        disabled: Boolean(props.disabled),
      });
    } else if (node.type === "optgroup") {
      if (props.children) {
        processNode(props.children);
      }
    } else if (props?.children) {
      processNode(props.children);
    }
  };

  processNode(children);
  return result;
}

function isPlaceholderValue(value: string | number | undefined, label: React.ReactNode): boolean {
  if (value === "" || value === -1 || value === "-1" || value === undefined) return true;
  if (typeof label === "string" && (label.startsWith("—") || label.startsWith("-") || label.toLowerCase().includes("pilih"))) {
    return true;
  }
  return false;
}

export const NativeSelect = React.forwardRef<HTMLSelectElement, NativeSelectProps>(
  (
    {
      className,
      size = "default",
      variant = "default",
      icon,
      wrapperClassName,
      chevronClassName,
      popoverClassName,
      fullWidth,
      native = false,
      searchable,
      options: directOptions,
      placeholder,
      children,
      disabled,
      value,
      defaultValue,
      onChange,
      name,
      id,
      required,
      ...props
    },
    ref
  ) => {
    const isControlled = value !== undefined;
    const isFullWidth = fullWidth || className?.includes("w-full");

    const options = React.useMemo(
      () => extractOptions(children, directOptions),
      [children, directOptions]
    );

    const [internalValue, setInternalValue] = React.useState<string>(() => {
      if (isControlled) return String(value);
      if (defaultValue !== undefined) return String(defaultValue);
      return options[0]?.value !== undefined ? String(options[0].value) : "";
    });

    React.useEffect(() => {
      if (isControlled) {
        setInternalValue(String(value));
      }
    }, [isControlled, value]);

    const currentValue = isControlled ? String(value) : internalValue;

    const selectedOption = React.useMemo(() => {
      const match = options.find((o) => String(o.value) === String(currentValue));
      if (match) return match;
      if (currentValue === "" && options.length > 0 && defaultValue === undefined && value === undefined) {
        return options[0];
      }
      return null;
    }, [options, currentValue, defaultValue, value]);

    const isPlaceholder = isPlaceholderValue(selectedOption?.value, selectedOption?.label);

    // Modern custom select dropdown state and refs (called unconditionally)
    const [isOpen, setIsOpen] = React.useState(false);
    const [search, setSearch] = React.useState("");
    const [highlightedIndex, setHighlightedIndex] = React.useState(-1);
    const searchInputRef = React.useRef<HTMLInputElement>(null);
    const hiddenSelectRef = React.useRef<HTMLSelectElement>(null);

    const isSearchable = searchable ?? (options.length >= 8 && variant !== "inline");

    const filteredOptions = React.useMemo(() => {
      if (!isSearchable || !search.trim()) return options;
      const query = search.toLowerCase().trim();
      return options.filter((opt) => {
        const labelStr =
          typeof opt.label === "string" || typeof opt.label === "number"
            ? String(opt.label).toLowerCase()
            : String(opt.value).toLowerCase();
        return labelStr.includes(query) || String(opt.value).toLowerCase().includes(query);
      });
    }, [options, isSearchable, search]);

    React.useEffect(() => {
      if (isOpen) {
        const currentIdx = filteredOptions.findIndex((o) => String(o.value) === String(currentValue));
        setHighlightedIndex(currentIdx >= 0 ? currentIdx : 0);
        if (isSearchable) {
          setTimeout(() => searchInputRef.current?.focus(), 50);
        }
      } else {
        setHighlightedIndex(-1);
        setSearch("");
      }
    }, [isOpen, filteredOptions, currentValue, isSearchable]);

    // Fallback: If native rendering is explicitly requested
    if (native) {
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
                "pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary",
                size === "xs" && "left-2",
                size === "lg" && "left-3.5"
              )}
              aria-hidden
            >
              {icon}
            </span>
          )}
          <select
            ref={ref}
            name={name}
            id={id}
            disabled={disabled}
            required={required}
            value={value}
            defaultValue={defaultValue}
            onChange={onChange}
            className={cn(
              "appearance-none cursor-pointer w-full font-medium transition-all duration-150 outline-none select-none",
              "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30",
              "disabled:cursor-not-allowed disabled:opacity-50",
              sizeClasses[size],
              variantClasses[variant],
              icon && (size === "xs" ? "pl-7" : size === "lg" ? "pl-10" : "pl-9"),
              "pr-9",
              className
            )}
            {...props}
          >
            {directOptions
              ? directOptions.map((opt, i) => (
                  <option key={`${opt.value}-${i}`} value={opt.value} disabled={opt.disabled}>
                    {typeof opt.label === "string" || typeof opt.label === "number" ? opt.label : opt.value}
                  </option>
                ))
              : children}
          </select>
          <ChevronDown
            className={cn(
              "pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-all duration-200 group-hover:text-foreground group-focus-within:text-primary group-focus-within:rotate-180",
              chevronSizes[size],
              disabled && "opacity-40",
              chevronClassName
            )}
            aria-hidden
          />
        </div>
      );
    }

    const handleSelect = (val: string | number) => {
      const strVal = String(val);
      if (!isControlled) {
        setInternalValue(strVal);
      }
      setIsOpen(false);
      setSearch("");

      if (hiddenSelectRef.current) {
        hiddenSelectRef.current.value = strVal;
      }

      if (onChange) {
        const event = {
          target: {
            value: strVal,
            name: name ?? "",
            id: id ?? "",
          },
          currentTarget: {
            value: strVal,
            name: name ?? "",
            id: id ?? "",
          },
          type: "change",
          bubbles: true,
          defaultPrevented: false,
          preventDefault: () => {},
          stopPropagation: () => {},
          persist: () => {},
        } as unknown as React.ChangeEvent<HTMLSelectElement>;
        onChange(event);
      }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (disabled) return;

      if (!isOpen) {
        if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setIsOpen(true);
        }
        return;
      }

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlightedIndex((prev) => (prev + 1 < filteredOptions.length ? prev + 1 : 0));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlightedIndex((prev) => (prev - 1 >= 0 ? prev - 1 : filteredOptions.length - 1));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
          const opt = filteredOptions[highlightedIndex];
          if (!opt.disabled) {
            handleSelect(opt.value);
          }
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        setIsOpen(false);
      }
    };

    const displayLabel = selectedOption ? selectedOption.label : (placeholder ?? "— pilih —");

    return (
      <div
        className={cn(
          "group relative",
          isFullWidth ? "flex w-full" : "inline-flex items-center",
          wrapperClassName
        )}
      >
        {/* Hidden select element to preserve standard form submission, accessibility & ref compatibility */}
        <select
          ref={(node) => {
            (hiddenSelectRef as React.MutableRefObject<HTMLSelectElement | null>).current = node;
            if (typeof ref === "function") {
              ref(node);
            } else if (ref) {
              (ref as React.MutableRefObject<HTMLSelectElement | null>).current = node;
            }
          }}
          name={name}
          id={id ? `${id}-hidden-select` : undefined}
          disabled={disabled}
          required={required}
          value={currentValue}
          onChange={onChange}
          tabIndex={-1}
          aria-hidden="true"
          className="sr-only"
        >
          {options.map((opt, i) => (
            <option key={`${opt.value}-${i}`} value={opt.value} disabled={opt.disabled}>
              {typeof opt.label === "string" || typeof opt.label === "number" ? opt.label : opt.value}
            </option>
          ))}
        </select>

        {/* Modern Select Trigger & Popover */}
        <PopoverPrimitive.Root open={isOpen} onOpenChange={setIsOpen}>
          <PopoverPrimitive.Trigger asChild>
            <button
              type="button"
              id={id}
              disabled={disabled}
              aria-label={props["aria-label"]}
              aria-labelledby={props["aria-labelledby"]}
              aria-describedby={props["aria-describedby"]}
              aria-haspopup="listbox"
              aria-expanded={isOpen}
              onKeyDown={handleKeyDown}
              className={cn(
                "group/btn inline-flex items-center justify-between font-medium transition-all duration-200 outline-none select-none cursor-pointer",
                "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30",
                "disabled:cursor-not-allowed disabled:opacity-50",
                isFullWidth ? "w-full" : "w-auto min-w-[max(6rem,auto)]",
                sizeClasses[size],
                variantClasses[variant],
                variant === "inline" && !isPlaceholder && "border-solid border-primary/70 bg-primary/10 text-primary",
                className
              )}
            >
              <span className="flex items-center gap-2 truncate">
                {icon && (
                  <span className="shrink-0 text-muted-foreground transition-colors group-hover/btn:text-foreground">
                    {icon}
                  </span>
                )}
                {selectedOption?.icon && (
                  <span className="shrink-0 text-muted-foreground">{selectedOption.icon}</span>
                )}
                <span
                  className={cn(
                    "truncate",
                    isPlaceholder ? "text-muted-foreground font-normal" : "text-foreground"
                  )}
                >
                  {displayLabel}
                </span>
              </span>
              <ChevronDown
                className={cn(
                  "shrink-0 text-muted-foreground transition-transform duration-200 group-hover/btn:text-foreground",
                  isOpen && "rotate-180 text-primary",
                  chevronSizes[size],
                  disabled && "opacity-40",
                  chevronClassName
                )}
                aria-hidden
              />
            </button>
          </PopoverPrimitive.Trigger>

          <PopoverPrimitive.Portal>
            <PopoverPrimitive.Content
              align="start"
              sideOffset={5}
              collisionPadding={8}
              className={cn(
                "z-50 min-w-(--radix-popover-trigger-width) max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl",
                "border border-border/80 bg-popover/95 backdrop-blur-xl p-1.5 text-popover-foreground",
                "shadow-xl shadow-black/10 dark:shadow-black/50 dark:border-border/70",
                "duration-150 data-[state=open]:animate-in data-[state=closed]:animate-out",
                "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
                "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
                "data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2",
                popoverClassName
              )}
            >
              {isSearchable && (
                <div className="flex items-center gap-2 px-2.5 py-1.5 mb-1 rounded-xl bg-muted/40 border border-border/50 text-muted-foreground focus-within:border-primary/60 focus-within:text-foreground transition-colors">
                  <Search className="size-3.5 shrink-0" aria-hidden />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Cari..."
                    className="w-full bg-transparent text-xs text-foreground placeholder:text-muted-foreground outline-none"
                    aria-label="Cari pilihan"
                  />
                  {search && (
                    <button
                      type="button"
                      onClick={() => setSearch("")}
                      className="text-muted-foreground hover:text-foreground cursor-pointer"
                      aria-label="Hapus pencarian"
                    >
                      <X className="size-3" />
                    </button>
                  )}
                </div>
              )}

              <div
                role="listbox"
                aria-label={props["aria-label"]}
                className="max-h-60 overflow-y-auto overflow-x-hidden p-0.5 space-y-0.5"
              >
                {filteredOptions.length === 0 ? (
                  <p className="py-4 text-center text-xs text-muted-foreground">
                    Pilihan tidak ditemukan
                  </p>
                ) : (
                  filteredOptions.map((opt, index) => {
                    const isSelected = String(opt.value) === String(currentValue);
                    const isHighlighted = highlightedIndex === index;
                    const isPlaceholderOption = isPlaceholderValue(opt.value, opt.label);

                    return (
                      <button
                        key={`${opt.value}-${index}`}
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        disabled={opt.disabled}
                        onClick={() => {
                          if (opt.disabled) return;
                          handleSelect(opt.value);
                        }}
                        onMouseEnter={() => setHighlightedIndex(index)}
                        className={cn(
                          "group/item relative flex w-full cursor-pointer select-none items-center justify-between gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors outline-none text-left",
                          "hover:bg-accent hover:text-accent-foreground",
                          isHighlighted && !isSelected && "bg-accent/60 text-accent-foreground",
                          isSelected
                            ? "bg-primary/10 text-primary font-semibold hover:bg-primary/15"
                            : isPlaceholderOption
                              ? "text-muted-foreground italic"
                              : "text-foreground",
                          opt.disabled && "cursor-not-allowed opacity-40 pointer-events-none"
                        )}
                      >
                        <span className="flex items-center gap-2 truncate">
                          {opt.icon && (
                            <span className="size-4 shrink-0 text-muted-foreground group-hover/item:text-foreground">
                              {opt.icon}
                            </span>
                          )}
                          <span className="truncate">{opt.label}</span>
                        </span>
                        {isSelected && (
                          <Check
                            className="size-4 shrink-0 text-primary animate-in zoom-in-75 duration-150"
                            aria-hidden
                          />
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </PopoverPrimitive.Content>
          </PopoverPrimitive.Portal>
        </PopoverPrimitive.Root>
      </div>
    );
  }
);

NativeSelect.displayName = "NativeSelect";

export const SelectNative = NativeSelect;
export const ModernSelect = NativeSelect;
export const CustomSelect = NativeSelect;
