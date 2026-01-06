import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import type { Theme } from "@/lib/theme";
import { getTheme, toggleTheme } from "@/lib/theme";

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(() => getTheme());

  useEffect(() => {
    // keep in sync across tabs
    const onStorage = (e: StorageEvent) => {
      if (e.key === "taskchi:theme" && (e.newValue === "light" || e.newValue === "dark")) {
        setTheme(e.newValue);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(toggleTheme())}
      className={[
        "relative h-10 w-[78px] rounded-full",
        "border border-border/70",
        "bg-card/60 backdrop-blur-xl",
        "shadow-[0_18px_55px_rgba(0,0,0,0.16)] dark:shadow-[0_22px_70px_rgba(0,0,0,0.45)]",
        "transition",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
      ].join(" ")}
      aria-label="toggle theme"
      title={isDark ? "حالت روشن" : "حالت تاریک"}
    >
      <span className="absolute inset-y-0 left-0 right-0 flex items-center justify-between px-3 text-muted-foreground">
        <Sun className="h-4 w-4" />
        <Moon className="h-4 w-4" />
      </span>

      <span
        className={[
          "absolute top-[4px] h-[32px] w-[32px] rounded-full",
          "bg-background",
          "shadow-[0_10px_30px_rgba(0,0,0,0.22)]",
          "transition-transform duration-300",
          isDark ? "translate-x-[40px]" : "translate-x-[6px]",
        ].join(" ")}
      />

      {/* subtle inner glow */}
      <span className="absolute inset-0 rounded-full ring-1 ring-white/10 dark:ring-white/5" />
    </button>
  );
}
