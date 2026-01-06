import React from "react";
import { cn } from "@/lib/utils";

export type TaskStatus = "TODO" | "DOING" | "DONE";

const items: { key: TaskStatus; label: string }[] = [
  { key: "TODO", label: "در انتظار" },
  { key: "DOING", label: "در حال انجام" },
  { key: "DONE", label: "انجام‌شده" },
];

export function StatusPills({
  value,
  onChange,
  disabled,
  className,
}: {
  value: TaskStatus;
  onChange: (v: TaskStatus) => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "inline-flex rounded-2xl border border-border/60 bg-background/40 backdrop-blur p-1 gap-1",
        disabled && "opacity-60 pointer-events-none",
        className
      )}
    >
      {items.map((it) => {
        const active = it.key === value;

        const activeClass =
          it.key === "TODO"
            ? "bg-zinc-500/10 text-foreground border-zinc-500/25"
            : it.key === "DOING"
            ? "bg-sky-500/10 text-foreground border-sky-500/25"
            : "bg-emerald-500/10 text-foreground border-emerald-500/25";

        return (
          <button
            key={it.key}
            type="button"
            onClick={() => onChange(it.key)}
            className={cn(
              "h-8 px-3 rounded-xl text-xs border transition",
              active
                ? cn("shadow-sm", activeClass)
                : "border-transparent text-muted-foreground hover:text-foreground hover:bg-accent/50"
            )}
          >
            {it.label}
          </button>
        );
      })}
    </div>
  );
}
